import { z } from "zod";

// Merchant identity check (KYC). The merchant sends one ID document; the
// super admin approves it or rejects it with a reason the merchant sees, so
// they know exactly what to fix before sending again.

export const kycStatusSchema = z.enum(["not_submitted", "pending", "approved", "rejected"]);
export type KycStatus = z.infer<typeof kycStatusSchema>;

export const kycIdTypeSchema = z.enum(["national_id", "passport"]);
export type KycIdType = z.infer<typeof kycIdTypeSchema>;

/** A photo as a data URL, already compressed in the browser. The API re-encodes uploads (blueprint "Security"). */
const photoSchema = z.string().regex(/^data:image\/(jpeg|png|webp);base64,/, "photo_required");

export const kycSubmissionSchema = z
  .object({
    idType: kycIdTypeSchema,
    /** Exactly as printed on the document. */
    fullName: z.string().trim().min(2, "too_short").max(80, "too_long"),
    /** Khmer ID card: 9 digits. Passport: a letter and 7–8 digits. Spaces are ignored. */
    idNumber: z
      .string()
      .transform((value) => value.replace(/\s/g, "").toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9]{6,12}$/, "id_number_invalid")),
    frontPhoto: photoSchema,
    /** Needed for an ID card (both sides); a passport has one photo page. */
    backPhoto: photoSchema.optional(),
  })
  .refine((submission) => submission.idType !== "national_id" || submission.backPhoto !== undefined, {
    message: "photo_required",
    path: ["backPhoto"],
  });

export type KycSubmission = z.infer<typeof kycSubmissionSchema>;

export const kycRejectReasonSchema = z.enum(["photo_unclear", "name_mismatch", "document_expired", "wrong_document", "other"]);
export type KycRejectReason = z.infer<typeof kycRejectReasonSchema>;

export const kycRejectionSchema = z
  .object({
    reason: kycRejectReasonSchema,
    /** Extra words for the merchant. Required for "other", which says nothing on its own. */
    note: z.string().trim().max(200, "too_long"),
  })
  .refine((rejection) => rejection.reason !== "other" || rejection.note.length >= 5, {
    message: "required",
    path: ["note"],
  });

export type KycRejection = z.infer<typeof kycRejectionSchema>;
