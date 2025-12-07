import { useMemo } from "react";
import { useLabUser } from "./useLabUser";

export type LabRole = "member" | "manager" | "admin";

export interface LabPermissions {
  // Quote permissions
  canViewQuotes: boolean;
  canApproveQuotes: boolean;
  canRejectQuotes: boolean;
  canModifyQuotePricing: boolean;
  
  // Results permissions
  canViewResults: boolean;
  canSubmitResults: boolean;
  
  // Pricing permissions
  canViewPricing: boolean;
  canEditPricing: boolean;
  canBulkEditPricing: boolean;
  canImportExportPricing: boolean;
  
  // Settings permissions
  canViewSettings: boolean;
  canEditLabSettings: boolean;
  canManageLabUsers: boolean;
  
  // General
  role: LabRole | null;
  isReadOnly: boolean;
}

/**
 * Lab User Role Permissions:
 * 
 * Member (read-only):
 * - View quotes, results, pricing
 * - Cannot modify anything
 * 
 * Manager:
 * - All member permissions
 * - Edit pricing
 * - Manage quotes (approve/reject)
 * - Submit test results
 * 
 * Admin:
 * - All manager permissions
 * - Manage lab users
 * - Edit lab settings
 */
export const useLabPermissions = (): LabPermissions => {
  const { labUser, isImpersonating } = useLabUser();

  return useMemo(() => {
    const role = (labUser?.role as LabRole) || null;

    // Default permissions (no access)
    if (!role) {
      return {
        canViewQuotes: false,
        canApproveQuotes: false,
        canRejectQuotes: false,
        canModifyQuotePricing: false,
        canViewResults: false,
        canSubmitResults: false,
        canViewPricing: false,
        canEditPricing: false,
        canBulkEditPricing: false,
        canImportExportPricing: false,
        canViewSettings: false,
        canEditLabSettings: false,
        canManageLabUsers: false,
        role: null,
        isReadOnly: true,
      };
    }

    // Member permissions (read-only)
    if (role === "member") {
      return {
        canViewQuotes: true,
        canApproveQuotes: false,
        canRejectQuotes: false,
        canModifyQuotePricing: false,
        canViewResults: true,
        canSubmitResults: false,
        canViewPricing: true,
        canEditPricing: false,
        canBulkEditPricing: false,
        canImportExportPricing: false,
        canViewSettings: true,
        canEditLabSettings: false,
        canManageLabUsers: false,
        role: "member",
        isReadOnly: true,
      };
    }

    // Manager permissions
    if (role === "manager") {
      return {
        canViewQuotes: true,
        canApproveQuotes: true,
        canRejectQuotes: true,
        canModifyQuotePricing: true,
        canViewResults: true,
        canSubmitResults: true,
        canViewPricing: true,
        canEditPricing: true,
        canBulkEditPricing: true,
        canImportExportPricing: true,
        canViewSettings: true,
        canEditLabSettings: false,
        canManageLabUsers: false,
        role: "manager",
        isReadOnly: false,
      };
    }

    // Admin permissions (full access)
    return {
      canViewQuotes: true,
      canApproveQuotes: true,
      canRejectQuotes: true,
      canModifyQuotePricing: true,
      canViewResults: true,
      canSubmitResults: true,
      canViewPricing: true,
      canEditPricing: true,
      canBulkEditPricing: true,
      canImportExportPricing: true,
      canViewSettings: true,
      canEditLabSettings: true,
      canManageLabUsers: true,
      role: "admin",
      isReadOnly: false,
    };
  }, [labUser?.role, isImpersonating]);
};
