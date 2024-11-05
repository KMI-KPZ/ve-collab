import { z } from 'zod';

const InstitutionFormSchema = z.object({
    name: z
        .string()
        .max(1000, "messages.maxlength1000")
        .optional(),
    school_type: z.string().max(1000, "messages.maxlength1000").optional(),
    country: z.string().max(1000, "messages.maxlength1000").optional(),
    department: z.string().max(1000, "messages.maxlength1000").optional(),
});

export const InstitutionsFormSchema = z.object({
    institutions: InstitutionFormSchema.array().optional(),
});
