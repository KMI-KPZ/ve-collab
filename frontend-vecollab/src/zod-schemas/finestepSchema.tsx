import { z } from 'zod';

export const FineStepFormSchema = z.object({
    timestamp_from: z.string(),
    timestamp_to: z.string(),
    name: z.string(),
    workload: z.number().int(),
    learning_goal: z.string(),
    // above: previous data from step-names
    learning_activity: z
        .string()
        .max(1000, "messages.maxlength1000"),
    has_tasks: z.boolean(),
    original_plan: z.string().nullable(),
    tasks: z
        .array(
            z.object({
                task_formulation: z
                    .string()
                    .max(500, "messages.maxlength500"),
                work_mode: z
                    .string()
                    .max(500, "messages.maxlength500"),
                notes: z
                    .string()
                    .max(1000, "messages.maxlength1000"),
                tools: z.array(
                    z.object({
                        name: z
                            .string()
                            .max(200, "messages.maxlength200"),
                    })
                ),
                materials: z.array(
                    z.object({
                        name: z
                            .string()
                            .max(
                                200,
                                "messages.maxlength200"
                            ),
                    })
                ),
            })
        )
        .min(1, "messages.atleast_one_field"),
});
