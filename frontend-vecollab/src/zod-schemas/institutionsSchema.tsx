import { z } from 'zod';

const InstitutionFormSchema = z.object({
    name: z
        .string()
        .max(200, "messages.maxlength200")
        .optional(),
    school_type: z.string().max(200, "messages.maxlength200").optional(),
    country: z.string().max(200, "messages.maxlength200").optional(),
    department: z.string().max(200, "messages.maxlength200").optional(),
});

export const InstitutionsFormSchema = z.object({
    institutions: InstitutionFormSchema.array().optional(),
});
