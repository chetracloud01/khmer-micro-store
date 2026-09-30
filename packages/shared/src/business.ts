import { z } from "zod";

// Picked once during onboarding. It only pre-fills starting defaults (unit of
// measure, suggested categories) — every feature works the same for every
// type. See docs/blueprint.md "Business types".
export const businessTypeSchema = z.enum(["shop", "restaurant", "service", "other"]);
export type BusinessType = z.infer<typeof businessTypeSchema>;

export const BUSINESS_TYPES: readonly BusinessType[] = businessTypeSchema.options;
