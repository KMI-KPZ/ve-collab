import { z } from 'zod';

export const PartnersFormSchema = z.object({
    partners: z
        .object({
            label: z.string().max(500, "messages.maxlength500"),
            value: z.string().max(500, "messages.maxlength500"),
        })
        .array(),
    externalParties: z
        .object({
            externalParty: z
                .string()
                .max(1000, "messages.maxlength1000"),
        })
        .array(),
});
