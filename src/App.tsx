import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MFASetup from "./pages/MFASetup";
import Dashboard from "./pages/Dashboard";
import Compounds from "./pages/Compounds";
import CompoundDetails from "./pages/CompoundDetails";
import Labs from "./pages/Labs";
import Quotes from "./pages/Quotes";
import BulkImport from "./pages/BulkImport";
import QuoteConfirm from "./pages/QuoteConfirm";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import ImportChromatePricing from "./pages/ImportChromatePricing";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
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
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
