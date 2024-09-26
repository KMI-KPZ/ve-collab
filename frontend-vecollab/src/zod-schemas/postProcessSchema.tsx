import { z } from 'zod';

export const PostProcessSchema = z.object({
    share: z.boolean(),
    sharedReadOnly: z.boolean(),
    abstract: z.string().max(1000, 'messages.maxlength1000').nullable(),
    reflection: z.string().max(1000, 'messages.maxlength1000').nullable(),
    veModel: z.string().max(1000, 'messages.maxlength1000').nullable(),
    evaluation: z.string().nullish(),
    evaluationFile: z
        .object({
            file: z.any().optional(),
            file_name: z.string(),
            size: z.number().int().max(5242880, 'messages.max_5_mb').optional(),
            file_id: z.string().optional(),
        })
        .nullish(),
    literature: z.string().max(1000, 'messages.maxlength1000').nullable(),
    literatureFiles: z
        .array(
            z
                .object({
                    file: z.any().optional(),
                    file_name: z.string(),
                    size: z.number().int().optional(),
                    file_id: z.string().optional(),
                })
                .refine((data) => (data.size ?? 0) <= 5242880, {
                    // data.size is undefined if uploaded -> set to 0 (is validated)
                    // 25.470.060
                    message: 'messages.max_5_mb',
                    path: ['size'], // This will attach the error message to the `size` field
                })
        )
        .max(4, 'max. 4 Dateien erlaubt')
        .nullable(),
});
