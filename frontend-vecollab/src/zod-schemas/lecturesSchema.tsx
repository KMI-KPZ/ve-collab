import { z } from 'zod';

const LectureFormSchema = z.object({
    name: z.string().max(5000, "messages.maxlength5000"),
    lecture_type: z.string().max(5000, "messages.maxlength5000"),
    lecture_format: z.string().max(5000, "messages.maxlength5000"),
    participants_amount: z
        .number({
            invalid_type_error: "messages.only_positive_number",
        })
        .int("messages.only_positive_number")
        .gte(0, "messages.only_positive_number")
        .lte(999999, "messages.realistic_number"),
});

export const LecturesFormSchema = z.object({ lectures: z.array(LectureFormSchema) });
