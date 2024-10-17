import { z } from 'zod';

export const TargetGroupsFormSchema = z.object({
    targetGroups: z
        .object({
            name: z.string().max(500, 'messages.maxlength500'),
            age_min: z
                .number({
                    invalid_type_error: 'messages.only_positive_number',
                })
                .int('messages.only_positive_number')
                .gte(0, 'messages.only_positive_number')
                .lte(150, 'messages.realistic_number'),
            age_max: z
                .number({
                    invalid_type_error: 'messages.only_positive_number',
                })
                .int('messages.only_positive_number')
                .gte(0, 'messages.')
                .lte(150, 'messages.'),
            experience: z.string().max(5000, 'messages.maxlength5000'),
            // TODO string array
            academic_course: z.string().max(5000, 'messages.maxlength5000'),
            // TODO string array
            languages: z
                .object({
                    label: z.string().max(5000, 'messages.maxlength5000'),
                    value: z.string().max(5000, 'messages.maxlength5000'),
                })
                .array(),
        })
        .refine((data) => data.age_min <= data.age_max, {
            message: 'messages.min_age_less_max_age',
            path: ['age_max'], // This will show the error message at the age_min field
        })
        .array(),
    languages: z
        .object({
            label: z.string().max(5000, 'messages.maxlength5000'),
            value: z.string().max(5000, 'messages.maxlength5000'),
        })
        .array(),
});
