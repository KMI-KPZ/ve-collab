import { z } from 'zod';

export const EvaluationFormSchema = z.object({
    evaluationPerPartner: z.array(
        z.object({
            username: z
                .string()
                .max(200, "messages.maxlength200")
                .nullable(),
            is_graded: z.boolean({
                required_error: "messages.please_yes_or_no",
                invalid_type_error: "messages.please_yes_or_no",
            }),
            task_type: z
                .string()
                .max(500, "messages.maxlength500")
                .nullable(),
            assessment_type: z
                .string()
                .max(500, "messages.maxlength500")
                .nullable(),
            evaluation_while: z
                .string()
                .max(500, "messages.maxlength500")
                .nullable(),
            evaluation_after: z
                .string()
                .max(500, "messages.maxlength500")
                .nullable(),
        })
    ),
});
