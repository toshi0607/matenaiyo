import { z } from "zod";

export const markSchema = z.enum(["yes", "maybe", "no"]);

export const slugSchema = z.string().regex(/^[A-Za-z0-9_-]{21}$/);

export const slotInputSchema = z
  .object({
    startsAt: z.iso.datetime({ offset: true }).optional(),
    label: z.string().trim().min(1).max(100).optional(),
  })
  .refine((slot) => slot.startsAt !== undefined || slot.label !== undefined, {
    message: "startsAt または label のいずれかが必要です",
  });

export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  slots: z.array(slotInputSchema).min(1).max(50),
});

const answerItemSchema = z.object({
  slotId: z.uuid(),
  mark: markSchema,
});

const answerItemsSchema = z
  .array(answerItemSchema)
  .min(1)
  .max(50)
  .refine(
    (items) => new Set(items.map((item) => item.slotId)).size === items.length,
    {
      message: "slotId が重複しています",
    },
  );

export const submitAnswerSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(50),
  comment: z.string().trim().max(500).default(""),
  answers: answerItemsSchema,
});

export const updateAnswerSchema = submitAnswerSchema.extend({
  participantId: z.uuid(),
  editToken: z.string().min(1),
});

const adminActionSchema = z.object({
  slug: slugSchema,
  adminToken: z.string().min(1),
});

export const closeEventSchema = adminActionSchema;

export const decideSlotSchema = adminActionSchema.extend({
  slotId: z.uuid(),
});

export const deleteParticipantSchema = adminActionSchema.extend({
  participantId: z.uuid(),
});

export type Mark = z.infer<typeof markSchema>;
export type SlotInput = z.input<typeof slotInputSchema>;
export type CreateEventInput = z.input<typeof createEventSchema>;
export type SubmitAnswerInput = z.input<typeof submitAnswerSchema>;
export type UpdateAnswerInput = z.input<typeof updateAnswerSchema>;
export type CloseEventInput = z.input<typeof closeEventSchema>;
export type DecideSlotInput = z.input<typeof decideSlotSchema>;
export type DeleteParticipantInput = z.input<typeof deleteParticipantSchema>;
