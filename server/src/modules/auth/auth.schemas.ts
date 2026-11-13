import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Adresse e-mail invalide.').max(254, 'Adresse e-mail trop longue.'));

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Le nom doit contenir au moins 2 caractères.')
  .max(60, 'Le nom ne doit pas dépasser 60 caractères.');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    // bcrypt only uses the first 72 bytes of a password.
    .max(72, 'Le mot de passe ne doit pas dépasser 72 caractères.')
    .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre.')
    .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
