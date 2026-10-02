"use client";

import { createContext, useContext } from "react";
import type { AdminMe } from "@/lib/admin-api";

export type ActiveAdmin = Extract<AdminMe, { stage: "active" }>;
export const AdminContext = createContext<ActiveAdmin | null>(null);

/** The signed-in admin (both login steps done), inside the admin pages. */
export function useAdminMe(): ActiveAdmin {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdminMe must be used inside the admin layout");
  return value;
}
