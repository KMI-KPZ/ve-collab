import { z } from 'zod';

export const MethFormSchema = z.object({
    methodicalApproaches: z.array(
        z.object({
            value: z.string().max(100,"messages.maxlength100"),
            label: z.string().max(100,"messages.maxlength100"),
            __isNew__: z.boolean().optional(), // This is a flag for react-select library
        })
    ),
});
