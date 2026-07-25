"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { answers, events, participants, slots } from "@/db/schema";
import {
  ANSWER_LIMIT,
  CREATE_EVENT_LIMIT,
  checkRateLimit,
  clientIdentifier,
} from "@/lib/rate-limit";
import {
  addSlotsSchema,
  closeEventSchema,
  createEventSchema,
  decideSlotSchema,
  deleteParticipantSchema,
  deleteSlotSchema,
  MAX_SLOTS_PER_EVENT,
  submitAnswerSchema,
  updateAnswerSchema,
} from "@/lib/schemas";
import {
  generateSlug,
  generateToken,
  hashToken,
  verifyToken,
} from "@/lib/token";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const INVALID_INPUT = "入力内容が正しくありません";
const OPERATION_FAILED = "操作を実行できませんでした";
const EVENT_CLOSED = "このイベントは締め切られています";
const RATE_LIMITED =
  "リクエストが多すぎます。しばらく待ってからお試しください。";
const SLOT_LIMIT_EXCEEDED = `候補は最大${MAX_SLOTS_PER_EVENT}件までです`;
// 重複を除いた残りは追加するため、このエラーは「選んだ全件が既存と重複」のときだけ返る。
const SLOT_DUPLICATED = "選んだ候補はすべて追加済みです";
const LAST_SLOT_KEPT = "候補が1件のときは削除できません";

function eventPath(slug: string): string {
  return `/e/${slug}`;
}

async function findEventWithSlots(slug: string) {
  return db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: { slots: true },
  });
}

/**
 * adminToken のハッシュ照合込みでイベントを取得する。
 * イベント不存在とトークン不一致を区別しない(存在有無を漏らさない)。
 */
async function findAdminEvent(slug: string, adminToken: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });
  if (!event || !verifyToken(adminToken, event.adminToken)) {
    return null;
  }
  return event;
}

export async function createEvent(
  input: unknown,
): Promise<ActionResult<{ slug: string; adminToken: string }>> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }

  if (!(await checkRateLimit(CREATE_EVENT_LIMIT, await clientIdentifier()))) {
    return { ok: false, error: RATE_LIMITED };
  }

  const slug = generateSlug();
  const adminToken = generateToken();

  try {
    await db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          slug,
          title: parsed.data.title,
          description: parsed.data.description,
          adminToken: hashToken(adminToken),
        })
        .returning({ id: events.id });
      await tx.insert(slots).values(
        parsed.data.slots.map((slot, index) => ({
          eventId: event.id,
          startsAt: slot.startsAt ? new Date(slot.startsAt) : null,
          label: slot.label ?? null,
          sortOrder: index,
        })),
      );
    });
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: { slug, adminToken } };
}

export async function submitAnswer(
  input: unknown,
): Promise<ActionResult<{ participantId: string; editToken: string }>> {
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const { slug, name, comment, answers: answerItems } = parsed.data;

  if (!(await checkRateLimit(ANSWER_LIMIT, await clientIdentifier()))) {
    return { ok: false, error: RATE_LIMITED };
  }

  const event = await findEventWithSlots(slug);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }
  if (event.status === "closed") {
    return { ok: false, error: EVENT_CLOSED };
  }

  const validSlotIds = new Set(event.slots.map((slot) => slot.id));
  if (!answerItems.every((item) => validSlotIds.has(item.slotId))) {
    return { ok: false, error: INVALID_INPUT };
  }

  const editToken = generateToken();
  let result: { closed: true } | { id: string };
  try {
    result = await db.transaction(async (tx) => {
      // 締切との競合を防ぐため、行ロック下で status を再確認する(TOCTOU 回避)。
      const [locked] = await tx
        .select({ status: events.status })
        .from(events)
        .where(eq(events.id, event.id))
        .for("update");
      if (!locked || locked.status === "closed") {
        return { closed: true };
      }
      const [participant] = await tx
        .insert(participants)
        .values({
          eventId: event.id,
          name,
          comment,
          editToken: hashToken(editToken),
        })
        .returning({ id: participants.id });
      await tx.insert(answers).values(
        answerItems.map((item) => ({
          participantId: participant.id,
          slotId: item.slotId,
          mark: item.mark,
        })),
      );
      await tx
        .update(events)
        .set({ lastActivityAt: new Date() })
        .where(eq(events.id, event.id));
      return { id: participant.id };
    });
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  if ("closed" in result) {
    return { ok: false, error: EVENT_CLOSED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: { participantId: result.id, editToken } };
}

export async function updateAnswer(input: unknown): Promise<ActionResult> {
  const parsed = updateAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const {
    slug,
    participantId,
    editToken,
    name,
    comment,
    answers: answerItems,
  } = parsed.data;

  if (!(await checkRateLimit(ANSWER_LIMIT, await clientIdentifier()))) {
    return { ok: false, error: RATE_LIMITED };
  }

  const event = await findEventWithSlots(slug);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }
  if (event.status === "closed") {
    return { ok: false, error: EVENT_CLOSED };
  }

  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.id, participantId),
      eq(participants.eventId, event.id),
    ),
  });
  if (!participant || !verifyToken(editToken, participant.editToken)) {
    return { ok: false, error: OPERATION_FAILED };
  }

  const validSlotIds = new Set(event.slots.map((slot) => slot.id));
  if (!answerItems.every((item) => validSlotIds.has(item.slotId))) {
    return { ok: false, error: INVALID_INPUT };
  }

  let result: { closed: true } | { ok: true };
  try {
    result = await db.transaction(async (tx) => {
      // 締切との競合を防ぐため、行ロック下で status を再確認する(TOCTOU 回避)。
      const [locked] = await tx
        .select({ status: events.status })
        .from(events)
        .where(eq(events.id, event.id))
        .for("update");
      if (!locked || locked.status === "closed") {
        return { closed: true };
      }
      await tx
        .update(participants)
        .set({ name, comment, updatedAt: new Date() })
        .where(eq(participants.id, participant.id));
      await tx.delete(answers).where(eq(answers.participantId, participant.id));
      await tx.insert(answers).values(
        answerItems.map((item) => ({
          participantId: participant.id,
          slotId: item.slotId,
          mark: item.mark,
        })),
      );
      await tx
        .update(events)
        .set({ lastActivityAt: new Date() })
        .where(eq(events.id, event.id));
      return { ok: true };
    });
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  if ("closed" in result) {
    return { ok: false, error: EVENT_CLOSED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: null };
}

export async function closeEvent(input: unknown): Promise<ActionResult> {
  const parsed = closeEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const { slug, adminToken } = parsed.data;

  const event = await findAdminEvent(slug, adminToken);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }

  try {
    await db
      .update(events)
      .set({ status: "closed", lastActivityAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: null };
}

export async function decideSlot(input: unknown): Promise<ActionResult> {
  const parsed = decideSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const { slug, adminToken, slotId } = parsed.data;

  const event = await findAdminEvent(slug, adminToken);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }

  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.eventId, event.id)),
  });
  if (!slot) {
    return { ok: false, error: INVALID_INPUT };
  }

  try {
    await db
      .update(events)
      .set({ decidedSlotId: slot.id, lastActivityAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: null };
}

interface SlotValues {
  startsAt: Date | null;
  label: string | null;
}

/**
 * 候補の同一性キー。starts_at 付きは時刻、label のみはラベル文字列で判定する。
 * 幹事が同じ候補を二重に追加するのを防ぐために使う。
 */
function slotKey(slot: SlotValues): string {
  return slot.startsAt ? `t:${slot.startsAt.getTime()}` : `l:${slot.label}`;
}

export async function addSlots(
  input: unknown,
): Promise<ActionResult<{ added: number }>> {
  const parsed = addSlotsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const { slug, adminToken, slots: slotInputs } = parsed.data;

  const event = await findAdminEvent(slug, adminToken);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }

  // 入力内の重複を先に畳む(同じ日時を2回押した場合など)
  const requested = new Map<string, SlotValues>();
  for (const slot of slotInputs) {
    const values: SlotValues = {
      startsAt: slot.startsAt ? new Date(slot.startsAt) : null,
      label: slot.label ?? null,
    };
    requested.set(slotKey(values), values);
  }

  let result: { error: string } | { added: number };
  try {
    result = await db.transaction(async (tx) => {
      // 同時追加で上限を超えないよう、イベント行をロックしてから既存候補を数える。
      await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, event.id))
        .for("update");
      const existing = await tx
        .select({
          startsAt: slots.startsAt,
          label: slots.label,
          sortOrder: slots.sortOrder,
        })
        .from(slots)
        .where(eq(slots.eventId, event.id));

      const existingKeys = new Set(existing.map(slotKey));
      const fresh = [...requested.values()].filter(
        (slot) => !existingKeys.has(slotKey(slot)),
      );
      if (fresh.length === 0) {
        return { error: SLOT_DUPLICATED };
      }
      if (existing.length + fresh.length > MAX_SLOTS_PER_EVENT) {
        return { error: SLOT_LIMIT_EXCEEDED };
      }

      // 既存の並び順を変えないよう末尾に足す(終日候補は starts_at を持たず日付順に並べ替えられない)。
      const maxSortOrder = existing.reduce(
        (max, slot) => Math.max(max, slot.sortOrder),
        -1,
      );
      await tx.insert(slots).values(
        fresh.map((slot, index) => ({
          eventId: event.id,
          startsAt: slot.startsAt,
          label: slot.label,
          sortOrder: maxSortOrder + 1 + index,
        })),
      );
      await tx
        .update(events)
        .set({ lastActivityAt: new Date() })
        .where(eq(events.id, event.id));
      return { added: fresh.length };
    });
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: { added: result.added } };
}

export async function deleteSlot(input: unknown): Promise<ActionResult> {
  const parsed = deleteSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const { slug, adminToken, slotId } = parsed.data;

  const event = await findAdminEvent(slug, adminToken);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }

  let result: { error: string } | { ok: true };
  try {
    result = await db.transaction(async (tx) => {
      // 同時削除で候補が 0 件になるのを防ぐため、イベント行をロックして数え直す。
      const [locked] = await tx
        .select({ decidedSlotId: events.decidedSlotId })
        .from(events)
        .where(eq(events.id, event.id))
        .for("update");
      if (!locked) {
        return { error: OPERATION_FAILED };
      }
      const existing = await tx
        .select({ id: slots.id })
        .from(slots)
        .where(eq(slots.eventId, event.id));
      if (!existing.some((slot) => slot.id === slotId)) {
        return { error: OPERATION_FAILED };
      }
      if (existing.length <= 1) {
        return { error: LAST_SLOT_KEPT };
      }

      // 確定中の候補を消す場合は確定を解除する(FK の ON DELETE SET NULL に頼らず明示する)。
      if (locked.decidedSlotId === slotId) {
        await tx
          .update(events)
          .set({ decidedSlotId: null })
          .where(eq(events.id, event.id));
      }
      // 紐づく回答は answers の ON DELETE CASCADE で一緒に消える。
      await tx
        .delete(slots)
        .where(and(eq(slots.id, slotId), eq(slots.eventId, event.id)));
      await tx
        .update(events)
        .set({ lastActivityAt: new Date() })
        .where(eq(events.id, event.id));
      return { ok: true };
    });
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: null };
}

export async function deleteParticipant(input: unknown): Promise<ActionResult> {
  const parsed = deleteParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: INVALID_INPUT };
  }
  const { slug, adminToken, participantId } = parsed.data;

  const event = await findAdminEvent(slug, adminToken);
  if (!event) {
    return { ok: false, error: OPERATION_FAILED };
  }

  let deleted: boolean;
  try {
    deleted = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(participants)
        .where(
          and(
            eq(participants.id, participantId),
            eq(participants.eventId, event.id),
          ),
        )
        .returning({ id: participants.id });
      if (rows.length === 0) {
        return false;
      }
      await tx
        .update(events)
        .set({ lastActivityAt: new Date() })
        .where(eq(events.id, event.id));
      return true;
    });
  } catch {
    return { ok: false, error: OPERATION_FAILED };
  }
  if (!deleted) {
    return { ok: false, error: OPERATION_FAILED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: null };
}
