import { z } from 'zod';

const InstitutionFormSchema = z.object({
    name: z.string().max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
    school_type: z.string().max(200, 'Maximal 200 Buchstaben.'),
    country: z.string().max(200, 'Maximal 200 Buchstaben.'),
    departments: z.string().array(),
});

export const InstitutionsFormSchema = z.object({ institutions: InstitutionFormSchema.array() });
