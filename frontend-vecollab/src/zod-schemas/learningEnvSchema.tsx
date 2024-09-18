import { z } from 'zod';

export const LearningEnvFormSchema = z.object({
    learningEnv: z.string().max(800, 'Ein gültiger Ziel darf maximal 800 Buchstaben lang sein.'),
    courseFormat: z.string().max(800, 'Ein gültiger Ziel darf maximal 800 Buchstaben lang sein.'),
    usePhysicalMobility: z.boolean({
        required_error: 'Bitte Ja oder Nein auswählen',
        invalid_type_error: 'Bitte Ja oder Nein auswählen',
    }),
    physicalMobilities: z
        .object({
            location: z
                .string()
                .max(400, 'Ein gültiges Thema darf maximal 400 Buchstaben lang sein.'),
            timestamp_from: z.union([
                z.string().date('Bitte ein gültiges Datum eingeben'),
                z.string().max(0),
            ]), // it is still a string
            timestamp_to: z.union([
                z.string().date('Bitte ein gültiges Datum eingeben'),
                z.string().max(0),
            ]),
        })
        .refine(
            (data) => {
                if (data.timestamp_from === '') return true;
                return (
                    new Date(data.timestamp_from) >= new Date(1950, 0) &&
                    new Date(data.timestamp_from) <= new Date(2100, 0)
                );
            },
            {
                message: 'Von: Bitte geben sie ein realistisches Datum an',
                path: ['timestamp_from'], // This will attach the error message to the `timestamp_from` field
            }
        )
        .refine(
            (data) => {
                if (data.timestamp_to === '') return true;
                return (
                    new Date(data.timestamp_to) >= new Date(1950, 0) &&
                    new Date(data.timestamp_to) <= new Date(2100, 0)
                );
            },
            {
                message: 'Bis: Bitte geben sie ein realistisches Datum an',
                path: ['timestamp_to'],
            }
        )
        .superRefine((data, ctx) => {
            if (
                data.timestamp_from !== '' &&
                data.timestamp_to !== '' &&
                new Date(data.timestamp_from) > new Date(data.timestamp_to)
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Das Startdatum muss an oder vor dem Enddatum liegen',
                    path: ['timestamp_from'],
                });
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Das Startdatum muss an oder vor dem Enddatum liegen',
                    path: ['timestamp_to'],
                });
            }
        })
        .array(),
});
