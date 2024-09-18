import { z } from 'zod';

export const MethFormSchema = z.object({
    methodicalApproaches: z.array(
        z.object({
            value: z.string().max(100, 'Ein gültiger Name darf maximal 100 Buchstaben lang sein.'),
            label: z.string().max(100, 'Ein gültiger Name darf maximal 100 Buchstaben lang sein.'),
            __isNew__: z.boolean().optional(), // This is a flag for react-select library
        })
    ),
});
