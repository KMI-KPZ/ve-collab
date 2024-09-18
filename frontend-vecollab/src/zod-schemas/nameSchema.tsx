import { z } from 'zod';

export const NameFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Ein Name ist erforderlich.')
        .max(100, 'Ein gültiger Name darf maximal 100 Buchstaben lang sein.')
        .nullable(),
});
