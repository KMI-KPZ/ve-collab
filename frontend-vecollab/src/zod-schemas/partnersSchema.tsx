import { z } from 'zod';

export const PartnersFormSchema = z.object({
    partners: z
        .object({
            label: z.string().max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
            value: z.string().max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
        })
        .array(),
    externalParties: z
        .object({
            externalParty: z
                .string()
                .max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
        })
        .array(),
});
