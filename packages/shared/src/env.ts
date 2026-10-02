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
  /**
   * The web app's address(es), comma-separated: the only browser origins the
   * API accepts. The first one is the base of links in Telegram messages.
   * e.g. "http://localhost:3000,http://192.168.40.39:3000" to test on a phone.
   */
  WEB_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().url("must be a URL, or URLs separated by commas")).min(1, "required")),
};

/**
 * What production refuses to start without, so a missing setting shows up
 * at deploy time instead of as a quiet hole (no alerts, no bot check, no
 * admin login, cookies sent over plain http). Names only, never values.
 */
function productionRules(required: string[]) {
  return (env: { NODE_ENV: string; WEB_ORIGIN: string[] } & Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (env.NODE_ENV !== "production") return;
    env.WEB_ORIGIN.forEach((origin, index) => {
      if (!origin.startsWith("https://")) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["WEB_ORIGIN", index], message: "must be https in production" });
    });
    for (const key of required) {
      if (env[key] === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "required in production" });
    }
    if (env.RATE_LIMITS === "off") ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["RATE_LIMITS"], message: "can't be off in production" });
    if (typeof env.FILES_PUBLIC_URL === "string" && !env.FILES_PUBLIC_URL.startsWith("https://")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["FILES_PUBLIC_URL"], message: "must be https in production" });
    }
  };
}

const apiFields = z.object({
  ...shared,
  /** The API's everyday database user (khmer_micro_store_app): row-level security keeps each shop to its own rows. */
  DATABASE_URL: postgresUrl,
  /** Where uploaded photos are kept on this machine (development). Production uses Cloudflare R2 from roadmap step 8. */
  FILES_DIR: z.string().min(1).default(".uploads"),
  /** The address photos are served from. Unset = this API's own /files. */
  FILES_PUBLIC_URL: optional(z.string().url("must be a URL")),
  /**
   * 32 random bytes, base64: encrypts admins' authenticator secrets. Without
   * it the admin login refuses to start (sellers and buyers are unaffected).
   * Lost = every admin sets up two-step login again (pnpm admin:add-owner).
   */
  ADMIN_SECRETS_KEY: optional(
    z.string().regex(/^[A-Za-z0-9+/]{43}=$/, "must be 32 random bytes in base64 (openssl rand -base64 32)"),
  ),
  PORT: z.coerce.number({ invalid_type_error: "must be a number" }).int().min(1).max(65535).default(4000),
  /**
   * How many proxies stand in front of the API and add to X-Forwarded-For
   * (Railway's edge, Cloudflare). The buyer's address for rate limits is
   * read that many steps from the right; 0 = the direct connection (local).
   * Too high lets anyone pick their own address, so count, don't guess.
   */
  TRUST_PROXY_HOPS: z.coerce.number({ invalid_type_error: "must be a number" }).int().min(0).max(5).default(0),
  /** "off" only for end-to-end test scripts that place many orders from one machine. Production refuses "off". */
  RATE_LIMITS: z.enum(["on", "off"]).default("on"),
  /** Cloudflare Turnstile's secret: checkout checks the buyer isn't a bot. Unset = no check (local). */
  TURNSTILE_SECRET_KEY: optional(z.string().min(10, "must be the secret key from Cloudflare Turnstile")),
});

export const apiEnvSchema = apiFields.superRefine(productionRules(["TELEGRAM_BOT_TOKEN", "ADMIN_SECRETS_KEY", "TURNSTILE_SECRET_KEY"]));
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const workerEnvSchema = z.object(shared).superRefine(productionRules(["TELEGRAM_BOT_TOKEN"]));
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
