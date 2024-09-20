import { z } from 'zod';

export const TargetGroupsFormSchema = z.object({
    targetGroups: z
        .object({
            name: z.string().max(200, "messages.maxlength200"),
            age_min: z
                .number({
                    invalid_type_error: "messages.only_positive_number",
                })
                .int("messages.only_positive_number")
                .gte(0, "messages.only_positive_number")
                .lte(150, "messages.realistic_number"),
            age_max: z
                .number({
                    invalid_type_error: "messages.only_positive_number",
                })
                .int("messages.only_positive_number")
                .gte(0, "messages.")
                .lte(150, "messages."),
            experience: z
                .string()
                .max(800, "messages.maxlength800"),
            // TODO string array
            academic_course: z
                .string()
                .max(500, "messages.maxlength500"),
            // TODO string array
            languages: z
                .string()
                .max(500, "messages.maxlength500"),
        })
        .refine((data) => data.age_min <= data.age_max, {
            message: "messages.min_age_less_max_age",
            path: ['age_max'], // This will show the error message at the age_min field
        })
        .array(),
    languages: z
        .object({
            language: z
                .string()
                .max(200, "messages.maxlength200"),
        })
        .array(),
});
