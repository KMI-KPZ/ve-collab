// import { t } from 'i18next';
import { z } from 'zod';

export const NameFormSchema = z.object({
    name: z
        .string()
        .min(1, "messages.required_field_gen")
        .max(100, "messages.maxlength100")
        .nullable(),
});
