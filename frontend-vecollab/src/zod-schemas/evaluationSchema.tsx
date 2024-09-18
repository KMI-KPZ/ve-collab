import { z } from 'zod';

export const EvaluationFormSchema = z.object({
    evaluationPerPartner: z.array(
        z.object({
            username: z
                .string()
                .max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.')
                .nullable(),
            is_graded: z.boolean({
                required_error: 'Bitte Ja oder Nein auswählen',
                invalid_type_error: 'Bitte Ja oder Nein auswählen',
            }),
            task_type: z
                .string()
                .max(500, 'Ein gültiger Name darf maximal 500 Buchstaben lang sein.')
                .nullable(),
            assessment_type: z
                .string()
                .max(500, 'Ein gültiger Name darf maximal 500 Buchstaben lang sein.')
                .nullable(),
            evaluation_while: z
                .string()
                .max(500, 'Ein gültiger Name darf maximal 500 Buchstaben lang sein.')
                .nullable(),
            evaluation_after: z
                .string()
                .max(500, 'Ein gültiger Name darf maximal 500 Buchstaben lang sein.')
                .nullable(),
        })
    ),
});
