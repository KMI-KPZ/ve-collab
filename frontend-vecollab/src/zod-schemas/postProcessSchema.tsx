import { z } from 'zod';

export const PostProcessSchema = z.object({
    share: z.boolean(),
    abstract: z.string().max(1000, 'messages.maxlength1000').nullable(),
    reflection: z.string().max(1000, 'messages.maxlength1000').nullable(),
    veModel: z.string().max(1000, 'messages.maxlength1000').nullable(),
    evaluation: z.string().nullable(),
    evaluationFile: z
        .object({
            file: z.any().optional(),
            file_name: z.string(),
            size: z.number().int().max(5242880, 'messages.max_5_mb').optional(),
            file_id: z.string().optional(),
        })
        .nullable(),
    literature: z.string().nullable(),
    literatureFiles: z
        .array(
            z
                .object({
                    file: z.any().optional(),
                    file_name: z.string(),
                    size: z.number().int().optional(),
                    file_id: z.string().optional(),
                })
                .refine((data) => data.size !== undefined && data.size <= 5242880, {
                    // 25.470.060
                    message: 'messages.max_5_mb',
                    path: ['size'], // This will attach the error message to the `size` field
                })
        )
        .max(4, 'messages.file_count_max')
        .nullable(),
});
