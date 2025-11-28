import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Compounds from "./pages/Compounds";
import Labs from "./pages/Labs";
import Quotes from "./pages/Quotes";
import BulkImport from "./pages/BulkImport";
import QuoteConfirm from "./pages/QuoteConfirm";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
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
          <Route path="/compounds" element={<Compounds />} />
          <Route path="/products" element={<Compounds />} />
          <Route path="/testing-types" element={<Compounds />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/bulk-import" element={<BulkImport />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/quote-confirm/:quoteId" element={<QuoteConfirm />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
