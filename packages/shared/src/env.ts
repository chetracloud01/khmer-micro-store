import { z } from "zod";

// The settings each server process reads from its environment (.env locally,
// the host's variables in staging and production). Checked once at start-up:
// a missing or wrong value stops the process with a list of what to fix,
// instead of failing later in the middle of a buyer's checkout.

/** An unset variable and an empty one (`SENTRY_DSN=` in .env) mean the same: not set. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const postgresUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string({ required_error: "required" }).regex(/^postgres(ql)?:\/\//, "must start with postgresql://"),
);

const shared = {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * The database user that owns the tables (khmer_micro_store): migrations,
   * the worker, and the few API paths that must see across shops (login, sessions).
   */
  DATABASE_OWNER_URL: postgresUrl,
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** Errors go to Sentry only when this is set. */
  SENTRY_DSN: optional(z.string().url("must be a URL")),
  /**
   * From @BotFather. Without it, Telegram login is off (the development login
   * still works) and the worker only records the alerts it would send.
   */
  TELEGRAM_BOT_TOKEN: optional(z.string().regex(/^\d+:[A-Za-z0-9_-]{30,}$/, "must look like 123456:ABC…")),
  /** The web app's address: the only browser origin the API accepts, and the base of links in Telegram messages. */
  WEB_ORIGIN: z.string().url("must be a URL").default("http://localhost:3000"),
};

export const apiEnvSchema = z.object({
  ...shared,
  /** The API's everyday database user (khmer_micro_store_app): row-level security keeps each shop to its own rows. */
  DATABASE_URL: postgresUrl,
  /** Where uploaded photos are kept on this machine (development). Production uses Cloudflare R2 from roadmap step 8. */
  FILES_DIR: z.string().min(1).default(".uploads"),
  /** The address photos are served from. Unset = this API's own /files. */
  FILES_PUBLIC_URL: optional(z.string().url("must be a URL")),
  PORT: z.coerce.number({ invalid_type_error: "must be a number" }).int().min(1).max(65535).default(4000),
});
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const workerEnvSchema = z.object(shared);
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid settings — fix these in .env (see .env.example):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    this.name = "EnvError";
  }
}

/**
 * Reads and checks the settings. Problems name the variable and what is
 * wrong with it, never its value — a value may be a secret.
 */
export function loadEnv<T extends z.ZodTypeAny>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new EnvError(problems);
}
