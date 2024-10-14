import { z } from 'zod';

const StepNameFormSchema = z
    .object({
        _id: z.string(),
        name: z
            .string()
            .max(200, 'messages.maxlength200')
            .min(1, { message: 'messages.required_field_gen' }),
        timestamp_from: z.string().date('messages.valid_date'), // it is still a string
        timestamp_to: z.string().date('messages.valid_date'),
        workload: z
            .number({
                invalid_type_error: 'messages.only_positive_number',
            })
            .int('messages.only_positive_number')
            .gte(0, 'messages.only_positive_number')
            .lte(999, 'messages.realistic_number'),
        learning_goal: z.string().max(500, 'messages.maxlength500'),
        original_plan: z.string().optional()
    })
    .refine(
        (data) =>
            new Date(data.timestamp_from) >= new Date(1950, 0) &&
            new Date(data.timestamp_from) <= new Date(2100, 0),
        {
            message: 'messages.realistic_date',
            path: ['timestamp_from'], // This will attach the error message to the `timestamp_from` field
        }
    )
    .refine(
        (data) =>
            new Date(data.timestamp_to) >= new Date(1950, 0) &&
            new Date(data.timestamp_to) <= new Date(2100, 0),
        {
            message: 'messages.realistic_date',
            path: ['timestamp_to'],
        }
    )
    .superRefine((data, ctx) => {
        if (new Date(data.timestamp_from) > new Date(data.timestamp_to)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'messages.start_date_before_end_date',
                path: ['timestamp_from'],
            });
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'messages.start_date_before_end_date',
                path: ['timestamp_to'],
            });
        }
    });

export const StepNamesFormSchema = z
    .object({
        // stepNames: z.array(StepNameFormSchema).min(1, 'messages.at_least_one'),
        stepNames: z.array(StepNameFormSchema),
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
                        message: 'messages.unique_name',
                        path: ['stepNames', index, 'name'],
                    });
                }
            });
        }
    });
