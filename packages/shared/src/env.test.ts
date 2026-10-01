import { describe, expect, it } from "vitest";
import { apiEnvSchema, EnvError, loadEnv, workerEnvSchema } from "./env";

const DATABASE_URL = "postgresql://app:s3cret-password@localhost:5432/app";
const DATABASE_OWNER_URL = "postgresql://owner:s3cret-password@localhost:5432/app";

describe("server settings", () => {
  it("fills in defaults for local development", () => {
    const env = loadEnv(apiEnvSchema, { DATABASE_URL, DATABASE_OWNER_URL });
    expect(env).toMatchObject({ NODE_ENV: "development", PORT: 4000, WEB_ORIGIN: "http://localhost:3000", LOG_LEVEL: "info" });
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("treats an empty value as not set", () => {
    expect(loadEnv(workerEnvSchema, { DATABASE_OWNER_URL, SENTRY_DSN: "" }).SENTRY_DSN).toBeUndefined();
  });

  it("lists every problem by name", () => {
    try {
      loadEnv(apiEnvSchema, { PORT: "abc", WEB_ORIGIN: "not a url" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      const { problems } = error as EnvError;
      expect(problems.map((problem) => problem.split(":")[0]).sort()).toEqual(["DATABASE_OWNER_URL", "DATABASE_URL", "PORT", "WEB_ORIGIN"]);
    }
  });

  it("never repeats a value in its message — it may be a secret", () => {
    try {
      loadEnv(apiEnvSchema, { DATABASE_OWNER_URL, DATABASE_URL: "mysql://user:s3cret-password@host/db" });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain("s3cret");
    }
  });
});
