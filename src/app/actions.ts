"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { answers, events, participants, slots } from "@/db/schema";
import {
  closeEventSchema,
  createEventSchema,
  decideSlotSchema,
  deleteParticipantSchema,
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

  const slug = generateSlug();
  const adminToken = generateToken();

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
  const participantId = await db.transaction(async (tx) => {
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
    return participant.id;
  });

  revalidatePath(eventPath(slug));
  return { ok: true, data: { participantId, editToken } };
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

  await db.transaction(async (tx) => {
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
  });

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

  await db
    .update(events)
    .set({ status: "closed", lastActivityAt: new Date() })
    .where(eq(events.id, event.id));

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

  await db
    .update(events)
    .set({ decidedSlotId: slot.id, lastActivityAt: new Date() })
    .where(eq(events.id, event.id));

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

  const deleted = await db.transaction(async (tx) => {
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
  if (!deleted) {
    return { ok: false, error: OPERATION_FAILED };
  }

  revalidatePath(eventPath(slug));
  return { ok: true, data: null };
}
