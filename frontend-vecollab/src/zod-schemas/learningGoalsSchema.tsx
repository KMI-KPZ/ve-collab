import { z } from 'zod';

export const LearningGoalsFormSchema = z.object({
    individualLearningGoals: z
        .object({
            username: z
                .string()
                .max(800, "messages.maxlength800"),
            learningGoal: z
                .string()
                .max(800, "messages.maxlength800")
                .nullable(),
        })
        .array(),
    majorLearningGoals: z
        .object({
            value: z.string().max(5000, "messages.maxlength5000"),
            label: z.string().max(5000, "messages.maxlength5000"),
        })
        .array(),
    topics: z
        .object({
            name: z.string().max(5000, "messages.maxlength5000"),
        })
        .array(),
});
