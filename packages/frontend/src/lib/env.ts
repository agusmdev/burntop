import { z } from 'zod';

/**
 * Server-side environment variables schema.
 * These variables are only accessible in server functions and API routes.
 * Never expose these to the client.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),

  // Better Auth configuration
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),

  // OAuth providers (GitHub)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

/**
 * Client-side environment variables schema.
 * These variables are exposed to the browser via Vite's import.meta.env.
 * Only add VITE_ prefixed variables here.
 */
const clientEnvSchema = z.object({
  VITE_APP_URL: z.string().url().optional(),
});

/**
 * Validates and returns server environment variables.
 * Only call this in server-side code (server functions, API routes, etc.)
 */
export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid server environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid server environment variables');
  }

  return parsed.data;
}

/**
 * Validates and returns client environment variables.
 * Safe to use anywhere as these are public.
 */
export function getClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
  });

  if (!parsed.success) {
    console.error('Invalid client environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid client environment variables');
  }

  return parsed.data;
}

// Type exports for usage in other files
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
