import { z } from "zod"

export const webhookSchema = z.object({
    url: z.string().url("Invalid webhook URL"),
    secret: z.string().min(8, "Secret must be at least 8 characters").optional(),
    events: z.array(z.string()).min(1, "Select at least one event"),
    isActive: z.boolean().default(true)
})

export const webhookUpdateSchema = webhookSchema.partial()
