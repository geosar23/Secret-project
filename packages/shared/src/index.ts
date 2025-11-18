import { z } from 'zod'

export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string().optional(),
    role: z.enum(['admin', 'user']),
})

export type User = z.infer<typeof UserSchema>

export const Role = {
    Admin: 'admin',
    User: 'user',
} as const

export default {
    UserSchema,
    Role,
}
