import { z } from 'zod';

export const LearningEnvFormSchema = z.object({
    learningEnv: z.string().max(5000, "messages.maxlength5000"),
    courseFormat: z.string().max(5000, "messages.maxlength5000"),
    usePhysicalMobility: z.boolean({
        required_error: "messages.please_yes_or_no",
        invalid_type_error: "messages.please_yes_or_no",
    }),
    physicalMobilities: z
        .object({
            location: z
                .string()
                .max(1000, "messages.maxlength1000"),
            timestamp_from: z.union([
                z.string().date("messages.valid_date"),
                z.string().max(0),
            ]), // it is still a string
            timestamp_to: z.union([
                z.string().date("messages.valid_date"),
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
                message: "messages.realistic_date",
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
                message: "messages.realistic_date",
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
                    message: "messages.start_date_before_end_date",
                    path: ['timestamp_from'],
                });
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "messages.start_date_before_end_date",
                    path: ['timestamp_to'],
                });
            }
        })
        .array(),
});
