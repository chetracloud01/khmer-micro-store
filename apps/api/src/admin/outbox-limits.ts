/**
 * After this many failed tries the worker gives a message up (apps/worker
 * jobs/outbox.ts MAX_ATTEMPTS — kept equal; the worker tests check its value).
 */
export const MAX_ATTEMPTS_FOR_ADMIN = 8;
