import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { answers, events, participants, slots } from "@/db/schema";
import type { Mark } from "@/lib/schemas";
import { slotLabel } from "@/lib/slot-label";
import { type SlotAnswer, tallySlots } from "@/lib/tally";
import { verifyToken } from "@/lib/token";

export interface PublicSlotDTO {
  id: string;
  label: string;
}

export interface PublicEventDTO {
  title: string;
  status: "open" | "closed";
  slots: PublicSlotDTO[];
}

export interface OwnAnswerDTO {
  name: string;
  comment: string;
  marks: Record<string, Mark>;
}

export interface AdminSlotDTO {
  id: string;
  label: string;
  yes: number;
  maybe: number;
  no: number;
  unanswered: number;
  isBest: boolean;
}

export interface AdminParticipantDTO {
  id: string;
  name: string;
  comment: string;
}

export interface AdminEventDTO {
  closed: boolean;
  decidedSlotId: string | null;
  slots: AdminSlotDTO[];
  participants: AdminParticipantDTO[];
}

/** 公開イベント情報だけを返す。参加者・回答はこの経路で読まない。 */
export async function getPublicEventDTO(
  slug: string,
): Promise<PublicEventDTO | null> {
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: { title: true, status: true },
    with: {
      slots: {
        columns: { id: true, startsAt: true, label: true, sortOrder: true },
      },
    },
  });
  if (!event) return null;

  return {
    title: event.title,
    status: event.status,
    slots: [...event.slots]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((slot) => ({ id: slot.id, label: slotLabel(slot) })),
  };
}

/**
 * 編集トークンを検証してから、その回答者自身の内容だけを返す。
 * 存在しないイベント・回答者とトークン不一致はすべて null に畳む。
 */
export async function getOwnAnswerDTO(
  slug: string,
  participantId: string,
  editToken: string,
): Promise<OwnAnswerDTO | null> {
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: { id: true },
  });
  if (!event) return null;

  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.id, participantId),
      eq(participants.eventId, event.id),
    ),
    columns: { name: true, comment: true, editToken: true },
  });
  if (!participant || !verifyToken(editToken, participant.editToken)) {
    return null;
  }

  const participantAnswers = await db
    .select({ slotId: answers.slotId, mark: answers.mark })
    .from(answers)
    .where(eq(answers.participantId, participantId));

  return {
    name: participant.name,
    comment: participant.comment,
    marks: Object.fromEntries(
      participantAnswers.map((answer) => [answer.slotId, answer.mark]),
    ),
  };
}

/**
 * 管理トークンを検証してから、管理画面に必要な集計 DTO だけを返す。
 * 存在しないイベントとトークン不一致は呼び出し元で同一の失敗として扱う。
 */
export async function getAdminEventDTO(
  slug: string,
  adminToken: string,
): Promise<AdminEventDTO | null> {
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: {
      id: true,
      adminToken: true,
      status: true,
      decidedSlotId: true,
    },
  });
  if (!event || !verifyToken(adminToken, event.adminToken)) return null;

  const [eventSlots, eventParticipants] = await Promise.all([
    db.query.slots.findMany({
      where: eq(slots.eventId, event.id),
      columns: { id: true, startsAt: true, label: true, sortOrder: true },
    }),
    db.query.participants.findMany({
      where: eq(participants.eventId, event.id),
      columns: { id: true, name: true, comment: true, createdAt: true },
      with: { answers: { columns: { slotId: true, mark: true } } },
    }),
  ]);

  const orderedSlots = [...eventSlots].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const allAnswers: SlotAnswer[] = eventParticipants.flatMap((participant) =>
    participant.answers.map((answer) => ({
      slotId: answer.slotId,
      mark: answer.mark,
    })),
  );
  const tallyBySlot = new Map(
    tallySlots(
      orderedSlots.map((slot) => slot.id),
      allAnswers,
    ).map((tally) => [tally.slotId, tally]),
  );

  return {
    closed: event.status === "closed",
    decidedSlotId: event.decidedSlotId,
    slots: orderedSlots.map((slot) => {
      const tally = tallyBySlot.get(slot.id);
      const yes = tally?.yes ?? 0;
      const maybe = tally?.maybe ?? 0;
      const no = tally?.no ?? 0;
      return {
        id: slot.id,
        label: slotLabel(slot),
        yes,
        maybe,
        no,
        unanswered: eventParticipants.length - (yes + maybe + no),
        isBest: tally?.isBest ?? false,
      };
    }),
    participants: [...eventParticipants]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((participant) => ({
        id: participant.id,
        name: participant.name,
        comment: participant.comment,
      })),
  };
}
