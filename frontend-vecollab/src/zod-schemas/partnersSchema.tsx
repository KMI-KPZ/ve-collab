import { z } from 'zod';

export const PartnersFormSchema = z.object({
    partners: z
        .object({
            label: z.string().max(200, "messages.maxlength200"),
            value: z.string().max(200, "messages.maxlength200"),
        })
        .array(),
    externalParties: z
        .object({
            externalParty: z
                .string()
                .max(200, "messages.maxlength200"),
        })
        .array(),
});
