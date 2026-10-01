import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { toFieldErrors, type FormErrorCode } from "@khmer-micro-store/shared";
import type { Logger } from "pino";
import { ZodError } from "zod";
import { captureError } from "./sentry";

/**
 * Every error the API sends has one shape. Bad input names each field with
 * the same codes the screens already translate (packages/shared form-errors.ts),
 * so a form shows the API's answer exactly as it shows its own checks.
 */
export type ErrorBody =
  | { error: "invalid_input"; fields: Record<string, FormErrorCode> }
  | { error: "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "too_many_requests" | "internal" };

const CODE_BY_STATUS: Record<number, Exclude<ErrorBody["error"], "invalid_input">> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  429: "too_many_requests",
};

export function toErrorResponse(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof ZodError) {
    return { status: 400, body: { error: "invalid_input", fields: toFieldErrors(error) } };
  }
  if (error instanceof HttpException) {
    const status = error.getStatus();
    // Anything without its own code is reported as an internal error, without its message.
    return { status, body: { error: CODE_BY_STATUS[status] ?? (status < 500 ? "bad_request" : "internal") } };
  }
  return { status: 500, body: { error: "internal" } };
}

interface JsonResponse {
  status(code: number): { json(body: unknown): void };
}

/** Turns any thrown error into the shape above. Unexpected ones are logged and sent to Sentry; their details never reach the client. */
@Catch()
export class AllErrorsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(error: unknown, host: ArgumentsHost): void {
    const { status, body } = toErrorResponse(error);
    if (status >= 500) {
      this.logger.error({ err: error }, "unexpected error");
      captureError(error);
    }
    host.switchToHttp().getResponse<JsonResponse>().status(status).json(body);
  }
}
