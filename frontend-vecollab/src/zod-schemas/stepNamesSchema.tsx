import { z } from 'zod';

const StepNameFormSchema = z
    .object({
        name: z
            .string()
            .max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.')
            .min(1, { message: 'Ein Etappen-Name ist erforderlich' }),
        timestamp_from: z.string().date('Bitte ein gültiges Datum eingeben'), // it is still a string
        timestamp_to: z.string().date('Bitte ein gültiges Datum eingeben'),
        workload: z
            .number({
                invalid_type_error: 'Bitte geben sie eine ganze Zahl ein.',
            })
            .int('Bitte geben sie eine ganze Zahl ein.')
            .gte(0, 'Bitte geben sie eine positive ganze Zahl ein.')
            .lte(999, 'Bitte geben sie eine realistische Zahl ein.'),
        learning_goal: z
            .string()
            .max(500, 'Ein gültiger Name darf maximal 500 Buchstaben lang sein.'),
    })
    .refine(
        (data) =>
            new Date(data.timestamp_from) >= new Date(1950, 0) &&
            new Date(data.timestamp_from) <= new Date(2100, 0),
        {
            message: 'Von: Bitte geben sie ein realistisches Datum an',
            path: ['timestamp_from'], // This will attach the error message to the `timestamp_from` field
        }
    )
    .refine(
        (data) =>
            new Date(data.timestamp_to) >= new Date(1950, 0) &&
            new Date(data.timestamp_to) <= new Date(2100, 0),
        {
            message: 'Bis: Bitte geben sie ein realistisches Datum an',
            path: ['timestamp_to'],
        }
    )
    .superRefine((data, ctx) => {
        if (new Date(data.timestamp_from) > new Date(data.timestamp_to)) {
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
    });

export const StepNamesFormSchema = z
    .object({
        stepNames: z.array(StepNameFormSchema).min(1, 'Es muss mindestens eine Etappe geben.'),
    })
    .superRefine((data, ctx) => {
        // check unique step names
        const stepNames = data.stepNames.map((step) => step.name);
        const uniqueStepNames = new Set(stepNames);
        if (uniqueStepNames.size !== stepNames.length) {
            data.stepNames.forEach((step, index) => {
                if (stepNames.indexOf(step.name) !== index) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Bitte wählen Sie für jede Etappe einen einzigartigen Namen',
                        path: ['stepNames', index, 'name'],
                    });
                }
            });
        }
    });
