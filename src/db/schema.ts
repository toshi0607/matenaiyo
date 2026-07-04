import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const eventStatus = pgEnum("event_status", ["open", "closed"]);
export const answerMark = pgEnum("answer_mark", ["yes", "maybe", "no"]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  adminToken: text("admin_token").notNull(),
  status: eventStatus("status").notNull().default("open"),
  decidedSlotId: uuid("decided_slot_id").references(
    (): AnyPgColumn => slots.id,
    {
      onDelete: "set null",
    },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const slots = pgTable("slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  label: text("label"),
  sortOrder: integer("sort_order").notNull(),
});

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  comment: text("comment").notNull().default(""),
  editToken: text("edit_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const answers = pgTable(
  "answers",
  {
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => slots.id, { onDelete: "cascade" }),
    mark: answerMark("mark").notNull(),
  },
  (table) => [primaryKey({ columns: [table.participantId, table.slotId] })],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  slots: many(slots, { relationName: "eventSlots" }),
  participants: many(participants),
  decidedSlot: one(slots, {
    fields: [events.decidedSlotId],
    references: [slots.id],
    relationName: "decidedSlot",
  }),
}));

export const slotsRelations = relations(slots, ({ one, many }) => ({
  event: one(events, {
    fields: [slots.eventId],
    references: [events.id],
    relationName: "eventSlots",
  }),
  answers: many(answers),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    event: one(events, {
      fields: [participants.eventId],
      references: [events.id],
    }),
    answers: many(answers),
  }),
);

export const answersRelations = relations(answers, ({ one }) => ({
  participant: one(participants, {
    fields: [answers.participantId],
    references: [participants.id],
  }),
  slot: one(slots, {
    fields: [answers.slotId],
    references: [slots.id],
  }),
}));

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Slot = typeof slots.$inferSelect;
export type NewSlot = typeof slots.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
