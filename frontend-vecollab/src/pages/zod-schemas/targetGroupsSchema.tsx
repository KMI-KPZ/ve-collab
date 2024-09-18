import { z } from 'zod';

export const TargetGroupsFormSchema = z.object({
    targetGroups: z
        .object({
            name: z.string().max(300, 'Ein gültiger Name darf maximal 300 Buchstaben lang sein.'),
            age_min: z
                .number({
                    invalid_type_error: 'Bitte geben sie eine ganze Zahl ein.',
                })
                .int('Bitte geben sie eine ganze Zahl ein.')
                .gte(0, 'Bitte geben sie eine positive ganze Zahl ein.')
                .lte(150, 'Bitte geben sie eine realistische Zahl ein.'),
            age_max: z
                .number({
                    invalid_type_error: 'Bitte geben sie eine ganze Zahl ein.',
                })
                .int('Bitte geben sie eine ganze Zahl ein.')
                .gte(0, 'Bitte geben sie eine positive ganze Zahl ein.')
                .lte(150, 'Bitte geben sie eine realistische Zahl ein.'),
            experience: z
                .string()
                .max(800, 'Ein gültiger Name darf maximal 800 Buchstaben lang sein.'),
            // TODO string array
            academic_course: z
                .string()
                .max(400, 'Ein gültiger Name darf maximal 400 Buchstaben lang sein.'),
            // TODO string array
            languages: z
                .string()
                .max(400, 'Ein gültiger Name darf maximal 400 Buchstaben lang sein.'),
        })
        .refine((data) => data.age_min <= data.age_max, {
            message: 'Das Mindestalter muss kleiner oder gleich dem Höchstalter sein.',
            path: ['age_max'], // This will show the error message at the age_min field
        })
        .array(),
    languages: z
        .object({
            language: z
                .string()
                .max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
        })
        .array(),
});
