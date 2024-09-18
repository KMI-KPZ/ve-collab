import { z } from 'zod';

export const LearningGoalsFormSchema = z.object({
    individualLearningGoals: z
        .object({
            username: z
                .string()
                .max(800, 'Ein gültiger Ziel darf maximal 800 Buchstaben lang sein.'),
            learningGoal: z
                .string()
                .max(800, 'Ein gültiger Ziel darf maximal 800 Buchstaben lang sein.')
                .nullable(),
        })
        .array(),
    majorLearningGoals: z
        .object({
            value: z.string().max(800, 'Ein gültiges Ziel darf maximal 800 Buchstaben lang sein.'),
            label: z.string().max(800, 'Ein gültiges Ziel darf maximal 800 Buchstaben lang sein.'),
        })
        .array(),
    topics: z
        .object({
            name: z.string().max(400, 'Ein gültiges Thema darf maximal 400 Buchstaben lang sein.'),
        })
        .array(),
});
