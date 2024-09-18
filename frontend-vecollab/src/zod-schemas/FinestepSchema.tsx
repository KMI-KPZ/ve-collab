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
        .max(1000, 'Ein gültige Lernaktivität darf maximal 1000 Buchstaben lang sein.'),
    has_tasks: z.boolean(),
    tasks: z
        .array(
            z.object({
                task_formulation: z
                    .string()
                    .max(500, 'Ein gültige Lernaktivität darf maximal 500 Buchstaben lang sein.'),
                work_mode: z
                    .string()
                    .max(500, 'Ein gültige Arbeitsform darf maximal 500 Buchstaben lang sein.'),
                notes: z
                    .string()
                    .max(1000, 'Ein gültige Notitz darf maximal 1000 Buchstaben lang sein.'),
                tools: z.array(
                    z.object({
                        name: z
                            .string()
                            .max(200, 'Ein gültiges Tool darf maximal 200 Buchstaben lang sein.'),
                    })
                ),
                materials: z.array(
                    z.object({
                        name: z
                            .string()
                            .max(
                                200,
                                'Ein gültiges Material darf maximal 200 Buchstaben lang sein.'
                            ),
                    })
                ),
            })
        )
        .min(1, 'Es muss mindestens eine Aufgabe geben.'),
    duration: z.number().nullable(), // can be sometimes null maybe backend to slow to update
    // todo below attributes unused ???
    evaluation_tools: z.any(),
    attachments: z.any(),
    custom_attributes: z.any(),
});
