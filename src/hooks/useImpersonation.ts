import { useState, useEffect } from "react";

interface ImpersonatedUser {
  id: string;
  email: string;
  name: string | null;
  type: "customer" | "lab";
  labId?: string;
  labName?: string;
}

export const useImpersonation = () => {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  const checkImpersonationState = () => {
    // Check for customer impersonation
    const customerId = sessionStorage.getItem("impersonatedCustomerId");
    const customerEmail = sessionStorage.getItem("impersonatedCustomerEmail");
    const customerName = sessionStorage.getItem("impersonatedCustomerName");
    
    // Check for lab impersonation
    const labId = sessionStorage.getItem("impersonatedLabId");
    const labName = sessionStorage.getItem("impersonatedLabName");

    if (customerId && customerEmail) {
      setImpersonatedUser({
        id: customerId,
        email: customerEmail,
        name: customerName,
        type: "customer",
      });
    } else if (labId && labName) {
      setImpersonatedUser({
        id: labId,
        email: "",
        name: labName,
        type: "lab",
        labId,
        labName,
      });
    } else {
      setImpersonatedUser(null);
    }
  };

  useEffect(() => {
    // Check initial state
    checkImpersonationState();

    // Listen for impersonation changes from other components
    const handleImpersonationChange = () => {
      checkImpersonationState();
    };

    window.addEventListener("impersonation-changed", handleImpersonationChange);
    window.addEventListener("storage", handleImpersonationChange);

    return () => {
      window.removeEventListener("impersonation-changed", handleImpersonationChange);
      window.removeEventListener("storage", handleImpersonationChange);
    };
  }, []);

  const startCustomerImpersonation = (userId: string, email: string, name: string | null) => {
    // Clear any lab impersonation first
    sessionStorage.removeItem("impersonatedLabId");
    sessionStorage.removeItem("impersonatedLabName");
    sessionStorage.removeItem("impersonatedLabRole");
    
    sessionStorage.setItem("impersonatedCustomerId", userId);
    sessionStorage.setItem("impersonatedCustomerEmail", email);
    sessionStorage.setItem("impersonatedCustomerName", name || "");
    
    setImpersonatedUser({
      id: userId,
      email,
      name,
      type: "customer",
    });

    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("impersonation-changed"));
  };

  const startLabImpersonation = (labId: string, labName: string, labRole?: string) => {
    // Clear any customer impersonation first
    sessionStorage.removeItem("impersonatedCustomerId");
    sessionStorage.removeItem("impersonatedCustomerEmail");
    sessionStorage.removeItem("impersonatedCustomerName");
    
    sessionStorage.setItem("impersonatedLabId", labId);
    sessionStorage.setItem("impersonatedLabName", labName);
    if (labRole) {
      sessionStorage.setItem("impersonatedLabRole", labRole);
    }
    
    setImpersonatedUser({
      id: labId,
      email: "",
      name: labName,
      type: "lab",
      labId,
      labName,
    });

    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("impersonation-changed"));
  };

  const stopImpersonation = () => {
    sessionStorage.removeItem("impersonatedCustomerId");
    sessionStorage.removeItem("impersonatedCustomerEmail");
    sessionStorage.removeItem("impersonatedCustomerName");
    sessionStorage.removeItem("impersonatedLabId");
    sessionStorage.removeItem("impersonatedLabName");
    sessionStorage.removeItem("impersonatedLabRole");
    setImpersonatedUser(null);

    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("impersonation-changed"));
  };

  return {
    impersonatedUser,
    isImpersonating: !!impersonatedUser,
    isImpersonatingCustomer: impersonatedUser?.type === "customer",
    isImpersonatingLab: impersonatedUser?.type === "lab",
    startCustomerImpersonation,
    startLabImpersonation,
    stopImpersonation,
  };
};
