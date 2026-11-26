import { z } from 'zod';

const strongPassword = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must include a letter and a number');

const nameField = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be 2–100 characters')
  .max(100, 'Name must be 2–100 characters');

const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: strongPassword,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  portal: z.enum(['citizen', 'government']).optional().default('citizen'),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(10, 'Invalid refresh token'),
});

export const tokenSchema = z.object({
  token: z.string({ required_error: 'Verification token is required' }).min(10, 'Invalid token'),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(10, 'Invalid token'),
  password: strongPassword,
});

export const updateProfileSchema = z.object({
  name: nameField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required'),
  newPassword: strongPassword,
});

export const govStatusSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'repair_completed', 'under_review']),
  departmentId: z.coerce.number().int().positive().optional(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const adminOverrideSchema = z.object({
  status: z.enum(['active', 'solved', 'rejected']).optional(),
  clearFlags: z.boolean().optional().default(false),
  note: z.string({ required_error: 'Override note is required' }).trim().min(3, 'Enter a reason note (min 3 characters)').max(500),
});

export const adminCreateUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: strongPassword,
  role: z.enum(['government', 'admin']).default('government'),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
});

export const adminUpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['citizen', 'government', 'admin']).optional(),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
});

export const adminSettingsSchema = z.object({
  ai_accept_threshold: z.coerce.number().min(0.1).max(0.99).optional(),
  ai_reject_threshold: z.coerce.number().min(0.01).max(0.95).optional(),
  pin_move_flag_m: z.coerce.number().min(10).max(5000).optional(),
  low_gps_accuracy_m: z.coerce.number().min(10).max(5000).optional(),
  duplicate_radius_m: z.coerce.number().min(5).max(2000).optional(),
  repair_radius_m: z.coerce.number().min(10).max(2000).optional(),
  exif_mismatch_m: z.coerce.number().min(10).max(10000).optional(),
}).refine(
  (d) => d.ai_accept_threshold === undefined || d.ai_reject_threshold === undefined || d.ai_reject_threshold < d.ai_accept_threshold,
  { message: 'ai_reject_threshold must be strictly less than ai_accept_threshold' },
);
