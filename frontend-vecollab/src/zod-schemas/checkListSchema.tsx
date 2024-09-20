import { z } from 'zod';

const CheckListPartnerFormSchema = z.object({
    username: z.string().max(200, "messages.maxlength200"),
    time: z.boolean(),
    format: z.boolean(),
    topic: z.boolean(),
    goals: z.boolean(),
    languages: z.boolean(),
    media: z.boolean(),
    technicalEquipment: z.boolean(),
    evaluation: z.boolean(),
    institutionalRequirements: z.boolean(),
    dataProtection: z.boolean(),
});

export const CheckListPartnersFormSchema = z.object({
    checklist: CheckListPartnerFormSchema.array(),
});
