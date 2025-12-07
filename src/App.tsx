import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import MFASetup from "./pages/MFASetup";
import Dashboard from "./pages/Dashboard";
import Compounds from "./pages/Compounds";
import CompoundDetails from "./pages/CompoundDetails";
import Labs from "./pages/Labs";
import Quotes from "./pages/Quotes";
import BulkImport from "./pages/BulkImport";
import QuoteConfirm from "./pages/QuoteConfirm";
import Settings from "./pages/Settings";
import SecuritySettings from "./pages/SecuritySettings";
import Notifications from "./pages/Notifications";
import ImportChromatePricing from "./pages/ImportChromatePricing";
import UserManagement from "./pages/UserManagement";
import Waitlist from "./pages/Waitlist";
import WaitlistManagement from "./pages/WaitlistManagement";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import LoadingScreen from "./components/LoadingScreen";
import SplashScreen from "./components/SplashScreen";
import LabAuth from "./pages/lab/LabAuth";
import LabOpenRequests from "./pages/lab/LabOpenRequests";
import LabCompletedRequests from "./pages/lab/LabCompletedRequests";
import LabSettings from "./pages/lab/LabSettings";
import LabUserManagement from "./pages/LabUserManagement";
import AdminManagement from "./pages/AdminManagement";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage.getItem("splashShown");
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("splashShown", "true");
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/overseer-alpha/auth" element={<AdminAuth />} />
            <Route path="/mfa-setup" element={<MFASetup />} />
            <Route path="/compounds" element={<Compounds />} />
            <Route path="/compounds/:id" element={<CompoundDetails />} />
            <Route path="/products" element={<Compounds />} />
            <Route path="/testing-types" element={<Compounds />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/bulk-import" element={<BulkImport />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/quote-confirm/:quoteId" element={<QuoteConfirm />} />
            <Route path="/import-chromate" element={<ImportChromatePricing />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/admin-management" element={<AdminManagement />} />
            <Route path="/lab-user-management" element={<LabUserManagement />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/waitlist-management" element={<WaitlistManagement />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/security-settings" element={<SecuritySettings />} />
            
            {/* Lab Portal Routes */}
            <Route path="/lab/auth" element={<LabAuth />} />
            <Route path="/lab/requests" element={<LabOpenRequests />} />
            <Route path="/lab/completed" element={<LabCompletedRequests />} />
            <Route path="/lab/settings" element={<LabSettings />} />
            {/* Legacy redirects */}
            <Route path="/lab/dashboard" element={<LabOpenRequests />} />
            <Route path="/lab/quotes" element={<LabOpenRequests />} />
            <Route path="/lab/payments" element={<LabOpenRequests />} />
            <Route path="/lab/shipping" element={<LabOpenRequests />} />
            <Route path="/lab/results" element={<LabOpenRequests />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
