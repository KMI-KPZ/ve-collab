import { z } from 'zod';

const InstitutionFormSchema = z.object({
    name: z
        .string()
        .max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.')
        .optional(),
    school_type: z.string().max(200, 'Maximal 200 Buchstaben.').optional(),
    country: z.string().max(200, 'Maximal 200 Buchstaben.').optional(),
    department: z.string().max(200, 'Maximal 500 Buchstaben.').optional(),
});

export const InstitutionsFormSchema = z.object({
    institutions: InstitutionFormSchema.array().optional(),
});
