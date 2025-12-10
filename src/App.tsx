import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import SplashScreen from "./components/SplashScreen";

// Eagerly load auth and landing pages (common entry points)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const MFASetup = lazy(() => import("./pages/MFASetup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Compounds = lazy(() => import("./pages/Compounds"));
const CompoundDetails = lazy(() => import("./pages/CompoundDetails"));
const Labs = lazy(() => import("./pages/Labs"));
const Quotes = lazy(() => import("./pages/Quotes"));
const QuoteCreate = lazy(() => import("./pages/QuoteCreate"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const QuoteConfirm = lazy(() => import("./pages/QuoteConfirm"));
const Settings = lazy(() => import("./pages/Settings"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ImportChromatePricing = lazy(() => import("./pages/ImportChromatePricing"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const WaitlistManagement = lazy(() => import("./pages/WaitlistManagement"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const LabAuth = lazy(() => import("./pages/lab/LabAuth"));
const LabOpenRequests = lazy(() => import("./pages/lab/LabOpenRequests"));
const LabCompletedRequests = lazy(() => import("./pages/lab/LabCompletedRequests"));
const LabResults = lazy(() => import("./pages/lab/LabResults"));
const LabSettings = lazy(() => import("./pages/lab/LabSettings"));
const LabUsers = lazy(() => import("./pages/lab/LabUsers"));
const LabUserManagement = lazy(() => import("./pages/LabUserManagement"));
const AdminManagement = lazy(() => import("./pages/AdminManagement"));

// Optimized QueryClient configuration with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default stale time
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
      retry: 1,
      refetchOnWindowFocus: false, // Disable automatic refetch on window focus
      refetchOnMount: false, // Don't refetch if data is not stale
    },
  },
});

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
            <Route path="/quotes/new" element={<QuoteCreate />} />
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
            <Route path="/lab/users" element={<LabUsers />} />
            {/* Legacy redirects */}
            <Route path="/lab/dashboard" element={<LabOpenRequests />} />
            <Route path="/lab/quotes" element={<LabOpenRequests />} />
            <Route path="/lab/payments" element={<LabOpenRequests />} />
            <Route path="/lab/shipping" element={<LabOpenRequests />} />
            <Route path="/lab/results" element={<LabResults />} />
            
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
