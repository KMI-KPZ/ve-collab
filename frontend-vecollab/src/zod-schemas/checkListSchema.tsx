import { z } from 'zod';

const CheckListPartnerFormSchema = z.object({
    username: z.string().max(200, 'messages.maxlength200'),
    time: z.boolean(),
    format: z.boolean().optional(),
    topic: z.boolean(),
    goals: z.boolean(),
    languages: z.boolean().optional(),
    media: z.boolean(),
    technicalEquipment: z.boolean(),
    evaluation: z.boolean().optional(),
    institutionalRequirements: z.boolean(),
    dataProtection: z.boolean(),
    userDefinedAspects:  z
        .object({
            label: z.string().max(500, "messages.maxlength500"),
            value: z.boolean(),
        })
        .array()
        .optional()
});

export const CheckListPartnersFormSchema = z.object({
    checklist: CheckListPartnerFormSchema.array(),
});
