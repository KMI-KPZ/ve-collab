import { z } from 'zod';

const LectureFormSchema = z.object({
    name: z.string().max(500, 'Ein gültiger Name darf maximal 500 Buchstaben lang sein.'),
    lecture_type: z.string().max(500, 'Maximal 500 Buchstaben.'),
    lecture_format: z.string().max(500, 'Maximal 500 Buchstaben.'),
    participants_amount: z
        .number({
            invalid_type_error: 'Bitte geben sie eine ganze Zahl ein.',
        })
        .int('Bitte geben sie eine ganze Zahl ein.')
        .gte(0, 'Bitte geben sie eine positive ganze Zahl ein.')
        .lte(999999, 'Bitte geben sie eine realistische Zahl ein.'),
});

export const LecturesFormSchema = z.object({ lectures: z.array(LectureFormSchema) });
