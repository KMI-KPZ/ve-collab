import { z } from 'zod';

export const TargetGroupsFormSchema = z.object({
    targetGroups: z
        .object({
            name: z.string().max(500, 'messages.maxlength500'),
            semester: z.string().max(5000, 'messages.maxlength5000').nullable(),
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
        .array(),
    languages: z
        .object({
            label: z.string().max(5000, 'messages.maxlength5000'),
            value: z.string().max(5000, 'messages.maxlength5000'),
        })
        .array(),
});
