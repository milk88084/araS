import { z } from "zod";

export const UserRole = z.enum(["admin", "editor", "viewer"]);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string().email(),
  username: z.string().min(2).max(50),
  role: UserRole.default("viewer"),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.pick({
  clerkId: true,
  email: true,
  username: true,
  role: true,
  avatarUrl: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = UserSchema.pick({
  username: true,
  role: true,
  avatarUrl: true,
}).partial();

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
