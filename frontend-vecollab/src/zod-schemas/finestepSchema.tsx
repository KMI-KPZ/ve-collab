import { z } from 'zod';

export const FineStepFormSchema = z.object({
    _id: z.string(),
    timestamp_from: z.string(),
    timestamp_to: z.string(),
    name: z.string(),
    workload: z.number().int(),
    learning_goal: z.string(),
    // above: previous data from step-names
    learning_activity: z
        .string()
        .max(5000, "messages.maxlength5000"),
    has_tasks: z.boolean(),
    original_plan: z.string().nullable(),
    tasks: z
        .array(
            z.object({
                task_formulation: z
                    .string()
                    .max(5000, "messages.maxlength5000"),
                work_mode: z
                    .string()
                    .max(5000, "messages.maxlength5000"),
                notes: z
                    .string()
                    .max(5000, "messages.maxlength5000"),
                tools: z.array(
                    z.object({
                        name: z
                            .string()
                            .max(1000, "messages.maxlength1000"),
                    })
                ),
                materials: z.array(
                    z.object({
                        name: z
                            .string()
                            .max(
                                1000,
                                "messages.maxlength1000"
                            ),
                    })
                ),
            })
        )
        .min(1, "messages.atleast_one_field"),
});
