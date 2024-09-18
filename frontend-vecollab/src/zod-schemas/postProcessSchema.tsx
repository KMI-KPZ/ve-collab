import { z } from 'zod';

export const PostProcessSchema = z.object({
    share: z.boolean(),
    abstract: z
        .string()
        .max(1000, 'Ein gültiger Name darf maximal 1000 Buchstaben lang sein.')
        .nullable(),
    reflection: z
        .string()
        .max(1000, 'Ein gültiger Name darf maximal 1000 Buchstaben lang sein.')
        .nullable(),
    veModel: z
        .string()
        .max(1000, 'Ein gültiger Name darf maximal 1000 Buchstaben lang sein.')
        .nullable(),
    evaluation: z.string().nullable(),
    evaluationFile: z
        .object({
            file: z.any().optional(),
            file_name: z.string(),
            size: z
                .number()
                .int()
                .max(5242880, 'Max. 5 MB erlaubt. Bitte wählen Sie eine kleinere Datei.')
                .optional(),
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
                    message: 'Max. 5 MB erlaubt. Bitte wählen Sie eine kleinere Datei.',
                    path: ['size'], // This will attach the error message to the `size` field
                })
        )
        .max(4, 'max. 4 Dateien erlaubt')
        .nullable(),
});
