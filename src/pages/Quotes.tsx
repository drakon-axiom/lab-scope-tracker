import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuotesData } from "@/hooks/useQuotesData";
import { useQuoteMutations } from "@/hooks/useQuoteMutations";
import { useDebounce } from "@/hooks/useDebounce";
import Layout from "@/components/Layout";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { EmailHistoryDialog } from "@/components/EmailHistoryDialog";
import { QuoteActivityLog } from "@/components/QuoteActivityLog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, FileText, Check, ChevronsUpDown, Mail, Copy, RefreshCw, Upload, X, Save, FolderOpen, History, Search, Filter, Lock, CheckCircle2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";

import { QuoteApprovalDialog } from "@/components/QuoteApprovalDialog";
import { PaymentDetailsDialog, PaymentFormData } from "@/components/PaymentDetailsDialog";
import { ShippingDetailsDialog, ShippingFormData } from "@/components/ShippingDetailsDialog";
import { ShippingLabelDialog, ShippingLabelFormData } from "@/components/ShippingLabelDialog";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { triggerSuccessConfetti, triggerCelebrationConfetti } from "@/lib/confetti";
import { useSubscription } from "@/hooks/useSubscription";
import { QuotesVirtualTable } from "@/components/QuotesVirtualTable";


interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  tracking_updated_at: string | null;
  estimated_delivery: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  labs: { name: string };
}

interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  price: number | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }> | null;
  status: string | null;
  date_submitted: string | null;
  date_completed: string | null;
  test_results: string | null;
  report_url: string | null;
  report_file: string | null;
  testing_notes: string | null;
  products: { name: string };
}

interface Product {
  id: string;
  name: string;
}

interface Lab {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Manufacturer {
  id: string;
  name: string;
}

interface TestingType {
  id: string;
  name: string;
  standard: string | null;
  duration_days: number | null;
}

interface TrackingHistory {
  id: string;
  quote_id: string;
  status: string;
  tracking_number: string;
  changed_at: string;
  source: string;
  details: any;
}

const Quotes = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { role, isSubscriber, isAdmin, loading: roleLoading } = useUserRole();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const { canSendItems, getRemainingItems } = useSubscription();
  const { 
    quotes,
    loading,
    labs, 
    clients, 
    manufacturers, 
    invalidateClients, 
    invalidateManufacturers,
    refetchQuotes,
  } = useQuotesData();
  const { deleteQuote } = useQuoteMutations();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsMissingPricing, setProductsMissingPricing] = useState<Product[]>([]);
  const [testingTypes, setTestingTypes] = useState<TestingType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Helper function to check if quote is locked (paid or later status)
  const isQuoteLocked = (status: string) => {
    const lockedStatuses = ['paid_awaiting_shipping', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
    return lockedStatuses.includes(status);
  };

  // Helper function to check if editing should be disabled (locked for non-admins only)
  const isEditingDisabled = (status: string) => {
    if (role === 'admin') return false; // Admins can always edit
    return isQuoteLocked(status);
  };

  // Helper function to determine which actions are available for a quote based on its status
  const getAvailableActions = (quote: Quote) => {
    const actions = {
      view: true, // Always available
      edit: false,
      delete: false,
      manageItems: false,
      sendToVendor: false,
      approveReject: false,
      addPayment: false,
      addShipping: false,
      refreshTracking: false,
    };

    switch (quote.status) {
      case 'draft':
        actions.edit = true;
        actions.delete = true;
        // Other actions (manageItems, sendToVendor) handled in QuoteCreate page
        break;
      case 'sent_to_vendor':
        // Just view while waiting for vendor response
        break;
      case 'awaiting_customer_approval':
        actions.approveReject = true;
        break;
      case 'approved_payment_pending':
        actions.addPayment = true;
        break;
      case 'paid_awaiting_shipping':
        actions.edit = !isEditingDisabled(quote.status);
        actions.addShipping = !quote.tracking_number;
        break;
      case 'in_transit':
        actions.refreshTracking = !!quote.tracking_number;
        break;
      case 'delivered':
      case 'testing_in_progress':
        actions.manageItems = true; // To add/update test results
        break;
      case 'completed':
        break;
    }

    // Admins can always edit and delete (except sent to vendor)
    if (role === 'admin' && quote.status !== 'sent_to_vendor' && quote.status !== 'awaiting_customer_approval') {
      actions.edit = true;
      actions.delete = true;
      actions.manageItems = true;
    }

    return actions;
  };
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [manufacturerOpen, setManufacturerOpen] = useState(false);
  const [additionalHeaderClientOpen, setAdditionalHeaderClientOpen] = useState<{[key: number]: boolean}>({});
  const [additionalHeaderManufacturerOpen, setAdditionalHeaderManufacturerOpen] = useState<{[key: number]: boolean}>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [trackingHistory, setTrackingHistory] = useState<TrackingHistory[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [loadTemplateDialogOpen, setLoadTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState("");
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState({ subject: "", html: "", recipient: "" });
  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLab, setFilterLab] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterLockStatus, setFilterLockStatus] = useState("all");
  
  // Memoized filtered quotes for performance
  const filteredQuotes = useMemo(() => {
    let result = quotes;

    // Search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(
        (quote) =>
          quote.quote_number?.toLowerCase().includes(query) ||
          quote.notes?.toLowerCase().includes(query) ||
          quote.tracking_number?.toLowerCase().includes(query) ||
          quote.labs.name.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((quote) => quote.status === filterStatus);
    }

    // Lab filter
    if (filterLab !== "all") {
      result = result.filter((quote) => quote.lab_id === filterLab);
    }

    // Lock status filter
    if (filterLockStatus !== "all") {
      result = result.filter((quote) => {
        const locked = isQuoteLocked(quote.status);
        return filterLockStatus === "locked" ? locked : !locked;
      });
    }

    return result;
  }, [quotes, debouncedSearchQuery, filterStatus, filterLab, filterLockStatus]);

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeView, setActiveView] = useState<string>("all"); // "all" or saved view id
  
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedQuoteForApproval, setSelectedQuoteForApproval] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingSubmitting, setShippingSubmitting] = useState(false);
  const [shippingLabelDialogOpen, setShippingLabelDialogOpen] = useState(false);
  const [selectedQuoteForPayment, setSelectedQuoteForPayment] = useState<Quote | null>(null);
  const [selectedQuoteForShipping, setSelectedQuoteForShipping] = useState<Quote | null>(null);
  const [selectedQuoteForLabel, setSelectedQuoteForLabel] = useState<Quote | null>(null);
  const [hasValidatedCreditCard, setHasValidatedCreditCard] = useState(false);
  const [lastTrackingRefresh, setLastTrackingRefresh] = useState<number | null>(null);
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState("");
  const [savedViews, setSavedViews] = useState<Array<{
    id: string;
    name: string;
    filters: {
      searchQuery: string;
      filterStatus: string;
      filterLab: string;
      filterProduct: string;
      filterLockStatus: string;
    };
    createdAt: number;
  }>>([]);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { toast } = useToast();

  const SAVED_VIEWS_KEY = "quotes_saved_views";

  // Load saved views from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_VIEWS_KEY);
      if (stored) {
        setSavedViews(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load saved views:", error);
    }
  }, []);

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this view",
        variant: "destructive",
      });
      return;
    }

    const newView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      filters: {
        searchQuery,
        filterStatus,
        filterLab,
        filterProduct,
        filterLockStatus,
      },
      createdAt: Date.now(),
    };

    const updatedViews = [...savedViews, newView];
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updatedViews));
    setSavedViews(updatedViews);
    setSaveViewDialogOpen(false);
    setNewViewName("");

    toast({
      title: "View saved",
      description: `"${newView.name}" has been saved`,
    });
  };

  const handleLoadView = (view: typeof savedViews[0]) => {
    setSearchQuery(view.filters.searchQuery);
    setFilterStatus(view.filters.filterStatus);
    setFilterLab(view.filters.filterLab);
    setFilterProduct(view.filters.filterProduct);
    setFilterLockStatus(view.filters.filterLockStatus);
    setActiveView(view.id);
  };

  const handleSelectStatusTab = (status: string) => {
    setFilterStatus(status);
    setActiveView(status);
    // Reset other filters when clicking a status tab
    if (status !== "all") {
      setSearchQuery("");
      setFilterLab("all");
      setFilterProduct("all");
      setFilterLockStatus("all");
    }
  };

  const handleDeleteView = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedViews = savedViews.filter(v => v.id !== id);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updatedViews));
    setSavedViews(updatedViews);

    toast({
      title: "View deleted",
      description: `"${name}" has been removed`,
    });
  };

  const hasActiveFilters = () => {
    return (
      searchQuery !== "" ||
      filterStatus !== "all" ||
      filterLab !== "all" ||
      filterProduct !== "all" ||
      filterLockStatus !== "all"
    );
  };

  // Input validation schema
  const searchSchema = z.string().max(200, "Search query too long").trim();

  const handleSearchChange = (value: string) => {
    try {
      searchSchema.parse(value);
      setSearchQuery(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const [formData, setFormData] = useState({
    lab_id: "",
    quote_number: "",
    lab_quote_number: "",
    status: "draft",
    notes: "",
    tracking_number: "",
    shipped_date: "",
    payment_status: "pending",
    payment_amount_usd: "",
    payment_amount_crypto: "",
    payment_date: "",
    transaction_id: "",
  });

  const [itemFormData, setItemFormData] = useState({
    product_id: "",
    client: "",
    sample: "",
    manufacturer: "",
    batch: "",
    price: "",
    additional_samples: 0,
    additional_report_headers: 0,
    has_additional_samples: false,
    additional_headers_data: [] as Array<{
      client: string;
      sample: string;
      manufacturer: string;
      batch: string;
    }>,
    status: "pending",
    date_submitted: "",
    date_completed: "",
    test_results: "",
    report_url: "",
    report_file: "",
    testing_notes: "",
  });

  useEffect(() => {
    // Don't fetch until role is loaded to ensure proper filtering
    if (roleLoading) return;
    
    fetchProducts();
    fetchTestingTypes();
    fetchTemplates();
    fetchEmailTemplates();
    checkValidatedCreditCard();
  }, [roleLoading]);

  // Load last tracking refresh timestamp from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastTrackingRefresh');
    if (stored) {
      setLastTrackingRefresh(parseInt(stored, 10));
    }
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    if (!lastTrackingRefresh) {
      setTimeUntilNextRefresh("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - lastTrackingRefresh;
      const sixtyMinutes = 60 * 60 * 1000;
      const remaining = sixtyMinutes - elapsed;

      if (remaining <= 0) {
        setTimeUntilNextRefresh("");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeUntilNextRefresh(`Next refresh available in ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lastTrackingRefresh]);

  // Auto-refresh stale tracking data (older than 4 hours)
  // Track if we've already refreshed stale tracking in this session
  const hasRefreshedStaleTracking = useRef(false);

  useEffect(() => {
    const checkAndRefreshStaleTracking = async () => {
      // Only run once per session to avoid rate limiting
      if (hasRefreshedStaleTracking.current) return;
      
      const staleQuotes = quotes.filter(quote => {
        if (!quote.tracking_number || quote.status === 'delivered' || quote.status === 'completed') return false;
        
        if (!quote.tracking_updated_at) return true; // Never updated
        
        const hoursSinceUpdate = (Date.now() - new Date(quote.tracking_updated_at).getTime()) / (1000 * 60 * 60);
        return hoursSinceUpdate > 4; // Stale if older than 4 hours
      });

      if (staleQuotes.length > 0) {
          console.log(`Auto-refreshing ${staleQuotes.length} stale tracking records`);
          hasRefreshedStaleTracking.current = true;
          
          try {
            // Make a single call to refresh all tracking (not per-quote)
            await supabase.functions.invoke("update-ups-tracking", {
              body: {}
            });
            
            // Refresh quotes after updates
            setTimeout(() => refetchQuotes(), 2000);
          } catch (error) {
            console.error('Failed to auto-refresh tracking:', error);
          }
      }
    };

    if (quotes.length > 0 && !hasRefreshedStaleTracking.current) {
      checkAndRefreshStaleTracking();
    }

    // Don't set up an interval - hourly cron handles automatic updates
    return () => {};
  }, [quotes]);


  const fetchProducts = async (labId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const targetLabId = labId || selectedQuote?.lab_id;
      if (!targetLabId) return;

      // Fetch all products
      const { data: allProductsData, error: allProductsError } = await supabase
        .from("products")
        .select("id, name")
        .order("name");

      if (allProductsError) throw allProductsError;

      // Get product IDs that have active pricing for this lab
      const { data: pricingData, error: pricingError } = await supabase
        .from("product_vendor_pricing")
        .select("product_id")
        .eq("lab_id", targetLabId)
        .eq("is_active", true);

      if (pricingError) throw pricingError;

      const productIdsWithPricing = pricingData?.map(p => p.product_id) || [];

      // Filter products that have pricing
      const productsWithPricing = allProductsData?.filter(p => 
        productIdsWithPricing.includes(p.id)
      ) || [];

      // Filter products that don't have pricing
      const productsWithoutPricing = allProductsData?.filter(p => 
        !productIdsWithPricing.includes(p.id)
      ) || [];

      setProducts(productsWithPricing);
      setProductsMissingPricing(productsWithoutPricing);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchTestingTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, standard, duration_days")
        .eq("user_id", user.id);

      if (error) throw error;
      setTestingTypes(data || []);
    } catch (error: any) {
      console.error("Error fetching testing types:", error);
    }
  };

  const fetchVendorPrice = async (productId: string, labId: string) => {
    try {
      const { data, error } = await supabase
        .from("product_vendor_pricing")
        .select("price")
        .eq("product_id", productId)
        .eq("lab_id", labId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setItemFormData((prev) => ({
          ...prev,
          price: data.price.toString(),
        }));
      }
    } catch (error: any) {
      console.error("Error fetching vendor price:", error);
    }
  };

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name)")
        .eq("quote_id", quoteId);

      if (error) throw error;
      
      // Transform the data to handle JSON types
      const transformedData = (data || []).map(item => {
        let headersData: Array<{client: string; sample: string; manufacturer: string; batch: string}> = [];
        
        if (Array.isArray(item.additional_headers_data)) {
          headersData = item.additional_headers_data as Array<{client: string; sample: string; manufacturer: string; batch: string}>;
        }
        
        return {
          ...item,
          additional_headers_data: headersData,
        };
      });
      
      setQuoteItems(transformedData as QuoteItem[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchTrackingHistory = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("tracking_history")
        .select("*")
        .eq("quote_id", quoteId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setTrackingHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching tracking history:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use impersonated user's ID for filtering when impersonating
      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      let query = supabase
        .from("quote_templates")
        .select("*")
        .order("created_at", { ascending: false });

      // Templates are scoped to ownership - filter by user_id unless admin viewing all
      if (!isAdmin || isImpersonatingCustomer) {
        query = query.eq("user_id", targetUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("is_default", { ascending: false });

      if (error) throw error;
      setEmailTemplates(data || []);
      
      // Auto-select default template if exists
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedEmailTemplate(defaultTemplate.id);
      }
    } catch (error: any) {
      console.error("Error fetching email templates:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      lab_id: "",
      quote_number: "",
      lab_quote_number: "",
      status: "draft",
      notes: "",
      tracking_number: "",
      shipped_date: "",
      payment_status: "pending",
      payment_amount_usd: "",
      payment_amount_crypto: "",
      payment_date: "",
      transaction_id: "",
    });
    setEditingId(null);
  };

  const resetItemForm = () => {
    setItemFormData({
      product_id: "",
      client: "",
      sample: "",
      manufacturer: "",
      batch: "",
      price: "",
      additional_samples: 0,
      additional_report_headers: 0,
      has_additional_samples: false,
      additional_headers_data: [],
      status: "pending",
      date_submitted: "",
      date_completed: "",
      test_results: "",
      report_url: "",
      report_file: "",
      testing_notes: "",
    });
    setEditingItemId(null);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Auto-progress status to "in_transit" when tracking number is added
      let updatedStatus = formData.status;
      if (editingId && formData.tracking_number) {
        // Find the existing quote to check if tracking number is new
        const existingQuote = quotes.find(q => q.id === editingId);
        if (existingQuote && !existingQuote.tracking_number) {
          // Tracking number is being added for the first time
          updatedStatus = "in_transit";
        }
      }

      // Auto-progress status from "approved_payment_pending" to "paid_awaiting_shipping" when payment is recorded
      if (editingId && formData.status === "approved_payment_pending") {
        const existingQuote = quotes.find(q => q.id === editingId);
        const isPaymentRecorded = 
          (formData.payment_status && formData.payment_status !== "pending") ||
          formData.payment_amount_usd ||
          formData.payment_date;
        
        if (existingQuote && isPaymentRecorded) {
          updatedStatus = "paid_awaiting_shipping";
        }
      }
      
      // Auto-progress from "paid_awaiting_shipping" to "in_transit" when tracking is added
      if (editingId && formData.status === "paid_awaiting_shipping" && formData.tracking_number) {
        const existingQuote = quotes.find(q => q.id === editingId);
        if (existingQuote && !existingQuote.tracking_number) {
          updatedStatus = "in_transit";
        }
      }

      // When impersonating a customer, use the impersonated user's ID
      const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      const payload = {
        ...formData,
        status: updatedStatus,
        user_id: effectiveUserId,
        quote_number: formData.quote_number || null,
        notes: formData.notes || null,
        tracking_number: formData.tracking_number || null,
        shipped_date: formData.shipped_date || null,
        payment_status: formData.payment_status || "pending",
        payment_amount_usd: formData.payment_amount_usd ? parseFloat(formData.payment_amount_usd) : null,
        payment_amount_crypto: formData.payment_amount_crypto || null,
        payment_date: formData.payment_date || null,
        transaction_id: formData.transaction_id || null,
      };

      if (editingId) {
        const existingQuote = quotes.find(q => q.id === editingId);
        const isPaidTransition = updatedStatus === "paid_awaiting_shipping" && formData.status === "approved_payment_pending";
        
        const { error } = await supabase
          .from("quotes")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        
        // Log payment if transitioning to paid
        if (isPaidTransition && existingQuote) {
          await supabase.from('quote_activity_log').insert({
            quote_id: editingId,
            user_id: user.id,
            activity_type: 'payment_recorded',
            description: 'Payment recorded - awaiting shipping',
            metadata: {
              payment_amount_usd: payload.payment_amount_usd,
              payment_date: payload.payment_date,
              transaction_id: payload.transaction_id,
              payment_status: payload.payment_status
            }
          });

          // Fetch quote with items for receipt and email
          const { data: fullQuote } = await supabase
            .from('quotes')
            .select('*, labs(name, contact_email), quote_items:quote_items(*, products(name))')
            .eq('id', editingId)
            .single();

          if (fullQuote) {
            // Send payment confirmation email
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser?.email) {
                await supabase.functions.invoke('send-payment-confirmation', {
                  body: {
                    quoteId: editingId,
                    customerEmail: currentUser.email,
                    quoteNumber: fullQuote.quote_number,
                    labName: fullQuote.labs.name,
                    paymentAmountUsd: fullQuote.payment_amount_usd,
                    paymentDate: fullQuote.payment_date,
                    transactionId: fullQuote.transaction_id,
                    items: fullQuote.quote_items.map((item: any) => ({
                      productName: item.products.name,
                      client: item.client,
                      sample: item.sample,
                      manufacturer: item.manufacturer,
                      batch: item.batch,
                      price: item.price,
                      additional_samples: item.additional_samples,
                      additional_report_headers: item.additional_report_headers,
                    }))
                  }
                });
              }
            } catch (emailError) {
              console.error('Failed to send payment confirmation email:', emailError);
              // Don't fail the whole operation if email fails
            }

            // Notify lab about payment
            try {
              await supabase.functions.invoke('notify-lab-payment', {
                body: {
                  quoteId: editingId
                }
              });
            } catch (labEmailError) {
              console.error('Failed to notify lab about payment:', labEmailError);
              // Don't fail the whole operation if lab notification fails
            }
          }
        } else {
          // Log regular quote update
          await supabase.from('quote_activity_log').insert({
            quote_id: editingId,
            user_id: user.id,
            activity_type: 'quote_updated',
            description: 'Quote details updated',
            metadata: {
              updated_fields: Object.keys(payload).filter(key => payload[key as keyof typeof payload] !== null)
            }
          });
        }
        
        if (updatedStatus === "in_transit" && updatedStatus !== formData.status) {
          toast({ 
            title: "Quote updated successfully",
            description: "Status automatically changed to 'In Transit'",
            duration: 3000,
          });
        } else if (isPaidTransition) {
          toast({ 
            title: "Payment Confirmed",
            description: "Receipt generated and confirmation email sent",
            duration: 3000,
          });
          triggerSuccessConfetti();
        } else {
          toast({ title: "Quote updated successfully", duration: 3000 });
        }
      } else {
        const { data: newQuote, error } = await supabase
          .from("quotes")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        
        // Log quote creation
        if (newQuote) {
          await supabase.from('quote_activity_log').insert({
            quote_id: newQuote.id,
            user_id: user.id,
            activity_type: 'quote_created',
            description: 'Quote created',
            metadata: {
              lab_id: payload.lab_id,
              status: payload.status
            }
          });
        }
        
        toast({ title: "Quote created successfully", duration: 3000 });
        triggerSuccessConfetti();
      }

      setDialogOpen(false);
      resetForm();
      refetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleEdit = (quote: Quote) => {
    // Check if quote needs customer approval first
    if (quote.status === 'awaiting_customer_approval') {
      fetchQuoteItems(quote.id).then(() => {
        setSelectedQuoteForApproval(quote);
        setApprovalDialogOpen(true);
      });
      return;
    }
    
    if (isEditingDisabled(quote.status)) {
      toast({
        title: "Cannot Edit",
        description: "Quotes cannot be edited after payment",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // For draft quotes, navigate to the wizard for full editing
    if (quote.status === 'draft') {
      navigate(`/quotes/${quote.id}/edit`);
      return;
    }

    // For other editable statuses, use the inline dialog
    setFormData({
      lab_id: quote.lab_id,
      quote_number: quote.quote_number || "",
      lab_quote_number: quote.lab_quote_number || "",
      status: quote.status,
      notes: quote.notes || "",
      tracking_number: quote.tracking_number || "",
      shipped_date: quote.shipped_date || "",
      payment_status: quote.payment_status || "pending",
      payment_amount_usd: quote.payment_amount_usd?.toString() || "",
      payment_amount_crypto: quote.payment_amount_crypto || "",
      payment_date: quote.payment_date || "",
      transaction_id: quote.transaction_id || "",
    });
    setEditingId(quote.id);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setQuoteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to duplicate quotes",
          variant: "destructive",
        });
        return;
      }

      // Use impersonated user's ID when impersonating
      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      // First, fetch the quote items to duplicate
      const { data: originalItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      // Create the new quote (as draft, without payment/shipping info)
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          user_id: targetUserId,
          lab_id: quote.lab_id,
          status: "draft",
          notes: quote.notes,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Duplicate the quote items
      if (originalItems && originalItems.length > 0) {
        const newItems = originalItems.map(item => ({
          quote_id: newQuote.id,
          product_id: item.product_id,
          client: item.client,
          sample: item.sample,
          manufacturer: item.manufacturer,
          batch: item.batch,
          price: item.price,
          additional_samples: item.additional_samples,
          additional_report_headers: item.additional_report_headers,
          additional_headers_data: item.additional_headers_data,
          status: "pending",
        }));

        const { error: insertItemsError } = await supabase
          .from("quote_items")
          .insert(newItems);

        if (insertItemsError) throw insertItemsError;
      }

      toast({
        title: "Quote duplicated",
        description: "A new draft quote has been created",
      });

      refetchQuotes();
      
      // Navigate to edit the new quote
      navigate(`/quotes/${newQuote.id}/edit`);
    } catch (error: any) {
      console.error("Error duplicating quote:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate quote",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    // Handle bulk delete
    if (selectedDraftIds.size > 0 && !quoteToDelete) {
      setIsBulkDeleting(true);
      try {
        const idsToDelete = Array.from(selectedDraftIds);
        // Delete items first for all quotes
        const { error: itemsError } = await supabase
          .from("quote_items")
          .delete()
          .in("quote_id", idsToDelete);
        if (itemsError) throw itemsError;

        const { error } = await supabase
          .from("quotes")
          .delete()
          .in("id", idsToDelete);
        if (error) throw error;
        toast({ 
          title: `${idsToDelete.length} quote${idsToDelete.length > 1 ? 's' : ''} deleted successfully`, 
          duration: 3000 
        });
        setSelectedDraftIds(new Set());
        refetchQuotes();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
          duration: 4000,
        });
      } finally {
        setIsBulkDeleting(false);
        setDeleteDialogOpen(false);
      }
      return;
    }

    // Handle single delete using mutation
    if (!quoteToDelete) return;

    deleteQuote.mutate(quoteToDelete, {
      onSuccess: () => {
        toast({ title: "Quote deleted successfully", duration: 3000 });
        setDeleteDialogOpen(false);
        setQuoteToDelete(null);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
          duration: 4000,
        });
        setDeleteDialogOpen(false);
        setQuoteToDelete(null);
      },
    });
  };

  const handleToggleDraftSelection = (quoteId: string) => {
    setSelectedDraftIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  const handleSelectAllDrafts = (draftQuotes: Quote[]) => {
    const allDraftIds = draftQuotes.map(q => q.id);
    const allSelected = allDraftIds.every(id => selectedDraftIds.has(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedDraftIds(new Set());
    } else {
      // Select all drafts
      setSelectedDraftIds(new Set(allDraftIds));
    }
  };

  const handleBulkDeleteClick = () => {
    setQuoteToDelete(null); // Clear single delete
    setDeleteDialogOpen(true);
  };

  const handleView = (quote: Quote) => {
    if (isMobile) {
      navigate(`/quotes/${quote.id}`);
    } else {
      setSelectedQuote(quote);
      fetchQuoteItems(quote.id);
      fetchTrackingHistory(quote.id);
      setViewDialogOpen(true);
    }
  };

  const handleManageItems = (quote: Quote) => {
    setSelectedQuote(quote);
    fetchQuoteItems(quote.id);
    fetchProducts(quote.lab_id); // Fetch products for the selected quote's lab
    setItemsDialogOpen(true);
  };

  const handleFileUpload = async (quoteId: string) => {
    if (!selectedFile) return null;

    try {
      setUploadingFile(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${quoteId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lab-reports')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lab-reports')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "File Upload Error",
        description: error.message,
      });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a template name",
      });
      return;
    }

    if (quoteItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot save template with no items",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use impersonated user's ID when impersonating
      const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      const { error } = await supabase
        .from("quote_templates")
        .insert({
          user_id: effectiveUserId,
          name: templateName,
          description: templateDescription || null,
          lab_id: formData.lab_id || null,
          items: quoteItems as any,
          notes: formData.notes || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      setTemplateDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      fetchTemplates();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save template",
      });
    }
  };

  const handleLoadTemplate = (template: any) => {
    setFormData({
      ...formData,
      lab_id: template.lab_id || "",
      notes: template.notes || "",
    });
    setQuoteItems(template.items || []);
    setLoadTemplateDialogOpen(false);
    toast({
      title: "Success",
      description: "Template loaded successfully",
    });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("quote_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template",
      });
    }
  };


  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use impersonated user's ID when impersonating
      const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      // Create client if it doesn't exist
      let clientName = itemFormData.client;
      const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (!existingClient && clientName) {
        const { error } = await supabase
          .from("clients")
          .insert([{ name: clientName, user_id: effectiveUserId }]);
        if (!error) {
          invalidateClients(); // Refresh clients list
        }
      }

      // Create manufacturer if it doesn't exist
      let manufacturerName = itemFormData.manufacturer;
      const existingManufacturer = manufacturers.find(m => m.name.toLowerCase() === manufacturerName.toLowerCase());
      if (!existingManufacturer && manufacturerName) {
        const { error } = await supabase
          .from("manufacturers")
          .insert([{ name: manufacturerName, user_id: effectiveUserId }]);
        if (!error) {
          invalidateManufacturers(); // Refresh manufacturers list
        }
      }

      // Handle file upload if a file is selected
      let reportFileUrl = itemFormData.report_file;
      if (selectedFile) {
        const uploadedUrl = await handleFileUpload(selectedQuote.id);
        if (uploadedUrl) reportFileUrl = uploadedUrl;
      }

      const payload = {
        quote_id: selectedQuote.id,
        product_id: itemFormData.product_id,
        client: clientName,
        sample: itemFormData.sample,
        manufacturer: manufacturerName,
        batch: itemFormData.batch,
        price: itemFormData.price ? parseFloat(itemFormData.price) : null,
        additional_samples: itemFormData.has_additional_samples ? itemFormData.additional_samples : 0,
        additional_report_headers: itemFormData.additional_report_headers,
        additional_headers_data: itemFormData.additional_headers_data,
        status: itemFormData.status || "pending",
        date_submitted: itemFormData.date_submitted || null,
        date_completed: itemFormData.date_completed || null,
        test_results: itemFormData.test_results || null,
        report_url: itemFormData.report_url || null,
        report_file: reportFileUrl || null,
        testing_notes: itemFormData.testing_notes || null,
      };

      if (editingItemId) {
        // Update existing item
        const { error } = await supabase
          .from("quote_items")
          .update(payload)
          .eq("id", editingItemId);
        if (error) throw error;
        toast({ title: "Item updated successfully", duration: 3000 });
      } else {
        // Add new item
        const { error } = await supabase.from("quote_items").insert([payload]);
        if (error) throw error;
        toast({ title: "Item added successfully", duration: 3000 });
      }

      resetItemForm();
      fetchQuoteItems(selectedQuote.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleEditItem = (item: QuoteItem) => {
    setEditingItemId(item.id);
    setItemFormData({
      product_id: item.product_id,
      client: item.client || "",
      sample: item.sample || "",
      manufacturer: item.manufacturer || "",
      batch: item.batch || "",
      price: item.price?.toString() || "",
      additional_samples: item.additional_samples || 0,
      additional_report_headers: item.additional_report_headers || 0,
      has_additional_samples: (item.additional_samples || 0) > 0,
      additional_headers_data: item.additional_headers_data || [],
      status: item.status || "pending",
      date_submitted: item.date_submitted || "",
      date_completed: item.date_completed || "",
      test_results: item.test_results || "",
      report_url: item.report_url || "",
      report_file: item.report_file || "",
      testing_notes: item.testing_notes || "",
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("quote_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      toast({ title: "Item deleted successfully", duration: 3000 });
      if (selectedQuote) fetchQuoteItems(selectedQuote.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };


  const handleSendEmail = async () => {
    if (!selectedQuote) return;
    
    // Prevent sending locked quotes (unless admin)
    if (isEditingDisabled(selectedQuote.status)) {
      toast({
        title: "Cannot Send Quote",
        description: "Quotes cannot be sent to vendor after payment",
        variant: "destructive",
      });
      return;
    }
    
    // Get lab details
    const lab = labs.find(l => l.id === selectedQuote.lab_id);
    if (!lab) {
      toast({
        title: "Error",
        description: "Lab information not found",
        variant: "destructive",
      });
      return;
    }

    // Fetch lab email
    const { data: labData, error: labError } = await supabase
      .from("labs")
      .select("contact_email")
      .eq("id", selectedQuote.lab_id)
      .single();

    if (labError || !labData?.contact_email) {
      toast({
        title: "Error",
        description: "Lab email not found. Please add a contact email for this lab.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Get selected email template if any
    let emailTemplate = null;
    if (selectedEmailTemplate) {
      const { data: templateData } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", selectedEmailTemplate)
        .single();
      emailTemplate = templateData;
    }

    // Generate preview HTML
    const { subject, html } = generateEmailPreview(
      lab.name,
      selectedQuote.quote_number || "Pending",
      quoteItems,
      selectedQuote.notes,
      emailTemplate
    );

    // Show preview dialog
    setEmailPreviewData({
      subject,
      html,
      recipient: labData.contact_email,
    });
    setEmailPreviewOpen(true);
  };

  const generateEmailPreview = (
    labName: string,
    quoteNumber: string,
    items: QuoteItem[],
    notes: string | null,
    emailTemplate: any
  ) => {
    // Calculate subtotal, discount, and total
    const subtotal = items.reduce((sum, item) => {
      let itemTotal = item.price || 0;
      
      // Add additional samples cost
      if ((item.additional_samples || 0) > 0) {
        const productName = item.products.name.toLowerCase();
        if (productName.includes("tirzepatide") || productName.includes("semaglutide") || productName.includes("retatrutide")) {
          itemTotal += (item.additional_samples || 0) * 60;
        }
      }
      
      // Add additional headers cost
      if ((item.additional_report_headers || 0) > 0) {
        itemTotal += (item.additional_report_headers || 0) * 30;
      }
      
      return sum + itemTotal;
    }, 0);
    
    // Apply automatic discount: 5% under $1200, 10% over $1200
    const discountPercent = subtotal < 1200 ? 5 : 10;
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount;

    const itemsHtml = items.map((item, index) => {
      const productName = item.products.name.toLowerCase();
      const qualifiesForAdditionalSamplePricing = 
        productName.includes("tirzepatide") || 
        productName.includes("semaglutide") || 
        productName.includes("retatrutide");

      let itemHtml = 
        `<div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">` +
        `<div style="font-size: 1.1em; font-weight: bold; margin-bottom: 12px; color: #111827;">${index + 1}. ${item.products.name}</div>` +
        `<div style="padding: 12px; background-color: #f9fafb; border-radius: 6px; margin-bottom: 12px;">` +
        `<div style="color: #374151; font-size: 0.95em; line-height: 1.6;">` +
        `<strong>Client:</strong> ${item.client || "—"}<br/>` +
        `<strong>Sample:</strong> ${item.sample || "—"}<br/>` +
        `<strong>Manufacturer:</strong> ${item.manufacturer || "—"}<br/>` +
        `<strong>Batch:</strong> ${item.batch || "—"}` +
        `</div></div>` +
        `<div style="text-align: right; font-size: 1.1em; font-weight: 600; color: #059669;">Base Price: $${(item.price || 0).toFixed(2)}</div>`;

      // Calculate item total
      let itemTotal = item.price || 0;

      if ((item.additional_samples || 0) > 0 && qualifiesForAdditionalSamplePricing) {
        itemTotal += (item.additional_samples || 0) * 60;
        itemHtml += 
          `<div style="margin-top: 12px; padding: 12px; background-color: #f0fdf4; border-left: 3px solid #10b981; border-radius: 4px;">` +
          `<div style="color: #065f46; font-size: 0.95em;">` +
          `<strong>Additional Samples:</strong> ${item.additional_samples} × $60.00 = <strong>$${((item.additional_samples || 0) * 60).toFixed(2)}</strong>` +
          `</div></div>`;
      }

      if ((item.additional_report_headers || 0) > 0) {
        itemTotal += (item.additional_report_headers || 0) * 30;
        itemHtml += 
          `<div style="margin-top: 12px; padding: 12px; background-color: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">` +
          `<div style="color: #92400e; font-size: 0.95em; margin-bottom: 8px;">` +
          `<strong>Additional Report Headers:</strong> ${item.additional_report_headers} × $30.00 = <strong>$${((item.additional_report_headers || 0) * 30).toFixed(2)}</strong>` +
          `</div>`;
        
        if (item.additional_headers_data && item.additional_headers_data.length > 0) {
          item.additional_headers_data.forEach((header, idx) => {
            itemHtml += 
              `<div style="margin-top: 8px; padding: 10px; background-color: #fffbeb; border-radius: 4px; border: 1px solid #fcd34d;">` +
              `<div style="font-weight: 600; color: #78350f; margin-bottom: 4px;">Header #${idx + 1}:</div>` +
              `<div style="color: #78350f; font-size: 0.9em; line-height: 1.5;">` +
              `<strong>Client:</strong> ${header.client || "—"}<br/>` +
              `<strong>Sample:</strong> ${header.sample || "—"}<br/>` +
              `<strong>Manufacturer:</strong> ${header.manufacturer || "—"}<br/>` +
              `<strong>Batch:</strong> ${header.batch || "—"}` +
              `</div></div>`;
          });
        }
        itemHtml += `</div>`;
      }

      // Show item total
      itemHtml += 
        `<div style="margin-top: 12px; padding: 12px; background-color: #f3f4f6; border-radius: 6px; text-align: right;">` +
        `<div style="font-size: 1.15em; font-weight: bold; color: #111827;">Item Total: $${itemTotal.toFixed(2)}</div>` +
        `</div></div>`;

      return itemHtml;
    }).join("");

    let subject: string;
    let html: string;

    if (emailTemplate) {
      subject = emailTemplate.subject
        .replace(/\{\{quote_number\}\}/g, quoteNumber)
        .replace(/\{\{lab_name\}\}/g, labName);

      html = 
        `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
        `<style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; } .container { max-width: 800px; margin: 0 auto; padding: 20px; }</style>` +
        `</head><body><div class="container">` +
        `<div style="white-space: pre-wrap;">${emailTemplate.body
          .replace(/\{\{lab_name\}\}/g, labName)
          .replace(/\{\{quote_number\}\}/g, quoteNumber)
          .replace(/\{\{quote_items\}\}/g, itemsHtml)
          .replace(/\{\{total\}\}/g, `$${total.toFixed(2)}`)
        }</div>` +
        (notes ? `<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;"><strong>Additional Notes:</strong><br/>${notes}</div>` : "") +
        `<div style="margin-top: 32px; padding: 20px; background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; text-align: center;">` +
        `<p style="margin: 0 0 12px 0; font-size: 1.1em; font-weight: 600; color: #166534;">Confirm Quote</p>` +
        `<p style="margin: 0 0 16px 0; color: #15803d;">Click the button below to confirm this quote and provide payment information:</p>` +
        `<a href="${window.location.origin}/quote-confirm/${selectedQuote?.id}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 1em;">Confirm Quote</a>` +
        `</div></div></body></html>`;
    } else {
      subject = `Testing Quote Request ${quoteNumber ? `#${quoteNumber}` : ""}`;
      html = 
        `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
        `<style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; } .container { max-width: 800px; margin: 0 auto; padding: 20px; }</style>` +
        `</head><body><div class="container">` +
        `<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">` +
        `<h1 style="margin: 0; color: #111827;">Testing Quote Request</h1>` +
        `<p style="margin: 8px 0 0 0; color: #6b7280;">Quote Number: ${quoteNumber || "Pending Assignment"}</p>` +
        `</div>` +
        `<p>Dear ${labName},</p>` +
        `<p>Please review the following quote request for testing services:</p>` +
        itemsHtml +
        `<div style="text-align: right; margin: 20px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px;">` +
        `<div style="font-size: 1em; margin-bottom: 8px;">Subtotal: $${subtotal.toFixed(2)}</div>` +
        `<div style="font-size: 1em; margin-bottom: 8px; color: #16a34a;">Discount (${discountPercent}%): -$${discount.toFixed(2)}</div>` +
        `<div style="font-size: 1.25em; font-weight: bold;">Total: $${total.toFixed(2)}</div>` +
        `</div>` +
        (notes ? `<div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px;"><h3 style="margin: 0 0 8px 0; color: #374151;">Additional Notes:</h3><p style="margin: 0; white-space: pre-wrap;">${notes}</p></div>` : "") +
        `<div style="margin: 32px 0; padding: 20px; background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; text-align: center;">` +
        `<p style="margin: 0 0 12px 0; font-size: 1.1em; font-weight: 600; color: #166534;">Confirm Quote</p>` +
        `<p style="margin: 0 0 16px 0; color: #15803d;">Click the button below to confirm this quote and provide payment information:</p>` +
        `<a href="${window.location.origin}/quote-confirm/${selectedQuote?.id}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 1em;">Confirm Quote</a>` +
        `</div>` +
        `<div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb;">` +
        `<p><strong>Next Steps:</strong></p>` +
        `<ul style="color: #6b7280;">` +
        `<li>Click the "Confirm Quote" button above to approve and provide payment details</li>` +
        `<li>Review the quote details</li>` +
        `<li>Confirm pricing and availability</li>` +
        `<li>Respond with any questions or concerns</li>` +
        `</ul>` +
        `<p style="margin-top: 20px;">Thank you for your service!</p>` +
        `</div></div></body></html>`;
    }

    return { subject, html };
  };

  const confirmSendEmail = async () => {
    if (!selectedQuote) return;
    
    // Check usage limits for subscribers
    if (isSubscriber) {
      const itemCount = quoteItems.length;
      if (!canSendItems(itemCount)) {
        const remaining = getRemainingItems();
        toast({
          title: "Monthly limit reached",
          description: `You have ${remaining} items remaining this month. This quote has ${itemCount} items. Upgrade to Pro for unlimited items.`,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
    }
    
    setIsSendingEmail(true);

    try {
      const lab = labs.find(l => l.id === selectedQuote.lab_id);
      const { data: labData } = await supabase
        .from("labs")
        .select("contact_email")
        .eq("id", selectedQuote.lab_id)
        .single();

      if (!lab || !labData) return;

      // Get selected email template if any
      let emailTemplate = null;
      if (selectedEmailTemplate) {
        const { data: templateData } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", selectedEmailTemplate)
          .single();
        emailTemplate = templateData;
      }

      const emailPayload = {
        labEmail: labData.contact_email,
        labName: lab.name,
        quoteNumber: selectedQuote.quote_number,
        items: quoteItems.map(item => ({
          productName: item.products.name,
          client: item.client,
          sample: item.sample,
          manufacturer: item.manufacturer,
          batch: item.batch,
          price: item.price,
          additional_samples: item.additional_samples,
          additional_report_headers: item.additional_report_headers,
          additional_headers_data: item.additional_headers_data,
        })),
        notes: selectedQuote.notes,
        totalValue: totalQuoteValue,
        confirmationUrl: `${window.location.origin}/quote-confirm/${selectedQuote.id}`,
        emailTemplate: emailTemplate ? {
          subject: emailTemplate.subject,
          body: emailTemplate.body,
        } : null,
      };

      const { error } = await supabase.functions.invoke("send-quote-email", {
        body: emailPayload,
      });

      if (error) throw error;

      // Log to email history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use impersonated user's ID when impersonating for email history
        const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id 
          ? impersonatedUser.id 
          : user.id;
          
        await supabase.from("email_history").insert({
          user_id: effectiveUserId,
          quote_id: selectedQuote.id,
          lab_id: selectedQuote.lab_id,
          recipient_email: labData.contact_email,
          subject: emailPreviewData.subject,
          body: emailPreviewData.html,
          template_id: selectedEmailTemplate || null,
          status: "sent",
        });
        
        // Log quote activity (audit trail - use real user ID)
        await supabase.from('quote_activity_log').insert({
          quote_id: selectedQuote.id,
          user_id: user.id,
          activity_type: 'email_sent',
          description: `Quote sent to ${lab.name}${isImpersonatingCustomer ? ' (impersonated by admin)' : ''}`,
          metadata: {
            recipient: labData.contact_email,
            lab_name: lab.name,
            impersonated_user: isImpersonatingCustomer ? impersonatedUser?.id : null
          }
        });
      }

      // Update quote status to "sent_to_vendor"
      await supabase
        .from("quotes")
        .update({ status: "sent_to_vendor" })
        .eq("id", selectedQuote.id);

      // Track usage for subscribers (use effective user ID)
      if (isSubscriber || isImpersonatingCustomer) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id 
            ? impersonatedUser.id 
            : currentUser.id;
          const itemCount = quoteItems.length;
          await supabase.functions.invoke("track-usage", {
            body: {
              userId: effectiveUserId,
              itemCount: itemCount,
            },
          });
        }
      }

      toast({
        title: "Email sent successfully",
        description: `Quote has been sent to ${lab.name}`,
        duration: 3000,
      });

      setEmailPreviewOpen(false);

      // Refresh quotes list and update selectedQuote
      await refetchQuotes();
      
      // Update selectedQuote state with new status
      setSelectedQuote({
        ...selectedQuote,
        status: "sent_to_vendor"
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const canRefreshTracking = () => {
    // Admins can refresh as often as they want
    if (isAdmin) return true;
    if (!lastTrackingRefresh) return true;
    const elapsed = Date.now() - lastTrackingRefresh;
    return elapsed >= 60 * 60 * 1000; // 60 minutes in milliseconds
  };

  const handleRefreshTracking = async (trackingNumber: string) => {
    if (!canRefreshTracking()) {
      toast({
        title: "Refresh throttled",
        description: timeUntilNextRefresh,
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Refreshing tracking...",
        description: "Fetching latest UPS tracking data",
        duration: 3000,
      });

      const { data, error } = await supabase.functions.invoke("update-ups-tracking", {
        body: { trackingNumber }
      });

      // Store timestamp after successful call
      const now = Date.now();
      localStorage.setItem('lastTrackingRefresh', now.toString());
      setLastTrackingRefresh(now);

      if (error) throw error;

      if (data.results?.[0]?.success) {
        const result = data.results[0];
        if (result.newStatus) {
          toast({
            title: "Tracking updated",
            description: `Status changed from ${result.oldStatus} to ${result.newStatus}`,
            duration: 3000,
          });
        } else {
          toast({
            title: "Tracking refreshed",
            description: result.message || "Status unchanged",
            duration: 3000,
          });
        }
        refetchQuotes();
        if (selectedQuote) {
          const { data: updatedQuote } = await supabase
            .from("quotes")
            .select("*, labs(name)")
            .eq("id", selectedQuote.id)
            .single();
          if (updatedQuote) {
            setSelectedQuote(updatedQuote);
            fetchTrackingHistory(selectedQuote.id); // Refresh history
          }
        }
      } else {
        throw new Error(data.results?.[0]?.error || "Failed to update tracking");
      }
    } catch (error: any) {
      console.error("Error refreshing tracking:", error);
      toast({
        title: "Failed to refresh tracking",
        description: error.message || "Unknown error",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleProductChange = (productId: string) => {
    setItemFormData((prev) => ({ ...prev, product_id: productId }));
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItemFormData((prev) => ({
        ...prev,
        sample: product.name, // Auto-populate sample with product name
        additional_headers_data: prev.additional_headers_data.map(header => ({
          ...header,
          sample: product.name,
        })),
      }));
      
      // Auto-fetch price for the quote's lab
      if (selectedQuote?.lab_id) {
        fetchVendorPrice(productId, selectedQuote.lab_id);
      }
    }
  };

  const handlePaymentSubmit = async (paymentData: PaymentFormData) => {
    if (!selectedQuoteForPayment) return;

    setPaymentSubmitting(true);
    const quoteId = selectedQuoteForPayment.id;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        payment_status: paymentData.payment_status,
        payment_amount_usd: paymentData.payment_amount_usd ? parseFloat(paymentData.payment_amount_usd) : null,
        payment_amount_crypto: paymentData.payment_amount_crypto || null,
        payment_date: paymentData.payment_date || null,
        transaction_id: paymentData.transaction_id || null,
        status: "paid_awaiting_shipping",
      };

      const { error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", quoteId);

      if (error) throw error;

      // Log payment activity
      await supabase.from('quote_activity_log').insert({
        quote_id: quoteId,
        user_id: user.id,
        activity_type: 'payment_recorded',
        description: 'Payment recorded - awaiting shipping',
        metadata: {
          payment_amount_usd: payload.payment_amount_usd,
          payment_date: payload.payment_date,
          transaction_id: payload.transaction_id,
          payment_status: payload.payment_status
        }
      });

      // Notify lab about payment
      try {
        await supabase.functions.invoke('notify-lab-payment', {
          body: { quoteId }
        });
      } catch (labEmailError) {
        console.error('Failed to notify lab about payment:', labEmailError);
      }

      toast({ 
        title: "Payment Recorded",
        description: "Payment details saved successfully",
        duration: 3000,
      });

      // Close dialog and reset state after success
      setPaymentDialogOpen(false);
      setSelectedQuoteForPayment(null);
      refetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleShippingSubmit = async (shippingData: ShippingFormData) => {
    if (!selectedQuoteForShipping) return;

    setShippingSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        tracking_number: shippingData.tracking_number,
        shipped_date: shippingData.shipped_date || null,
        status: "in_transit", // Auto-transition to in_transit
      };

      const { error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", selectedQuoteForShipping.id);

      if (error) throw error;

      // Log shipping activity
      await supabase.from('quote_activity_log').insert({
        quote_id: selectedQuoteForShipping.id,
        user_id: user.id,
        activity_type: 'shipping_added',
        description: 'Shipping details added - package in transit',
        metadata: {
          tracking_number: payload.tracking_number,
          shipped_date: payload.shipped_date
        }
      });

      toast({ 
        title: "Shipping Details Added",
        description: "Quote status updated to In Transit",
        duration: 3000,
      });

      setShippingDialogOpen(false);
      setSelectedQuoteForShipping(null);
      refetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setShippingSubmitting(false);
    }
  };

  const checkValidatedCreditCard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use impersonated user's ID when impersonating
      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      const { data, error } = await supabase
        .from("payment_methods")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("method_type", "credit_card")
        .eq("is_validated", true)
        .limit(1);

      if (error) throw error;
      setHasValidatedCreditCard((data || []).length > 0);
    } catch (error: any) {
      console.error("Error checking credit card:", error);
    }
  };

  const handleShippingLabelSubmit = async (labelData: ShippingLabelFormData) => {
    if (!selectedQuoteForLabel) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-ups-shipping-label', {
        body: {
          quoteId: selectedQuoteForLabel.id,
          ...labelData,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Shipping Label Generated",
          description: `Tracking number: ${data.trackingNumber}`,
          duration: 5000,
        });

        // Download label if provided
        if (data.labelImage) {
          const link = document.createElement('a');
          link.href = `data:image/gif;base64,${data.labelImage}`;
          link.download = `shipping-label-${selectedQuoteForLabel.quote_number || selectedQuoteForLabel.id}.gif`;
          link.click();
        }

        setShippingLabelDialogOpen(false);
        setSelectedQuoteForLabel(null);
        refetchQuotes();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate shipping label",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  // Helper function to calculate item total including additional samples and headers
  const calculateItemTotal = (item: QuoteItem): number => {
    const basePrice = item.price || 0;
    const productName = item.products.name.toLowerCase();
    
    // Check if product qualifies for $60 per additional sample
    const qualifiesForAdditionalSamplePricing = 
      productName.includes('tirzepatide') || 
      productName.includes('semaglutide') || 
      productName.includes('retatrutide');
    
    let total = basePrice;
    
    // Add additional samples cost
    if (qualifiesForAdditionalSamplePricing && (item.additional_samples || 0) > 0) {
      total += (item.additional_samples || 0) * 60;
    }
    
    // Add additional report headers cost ($30 each)
    if ((item.additional_report_headers || 0) > 0) {
      total += (item.additional_report_headers || 0) * 30;
    }
    
    return total;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  const totalQuoteValue = quoteItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );

  const handleRefresh = async () => {
    await refetchQuotes();
    await fetchProducts();
  };

  return (
    <Layout>
      <TooltipProvider>
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Quotes</h1>
            <p className="text-sm text-muted-foreground">
              Manage testing quotes and generate test records
            </p>
          </div>
          <div className="flex gap-2">
            {/* Bulk Delete Button - Shows when drafts are selected */}
            {selectedDraftIds.size > 0 && (
              <Button 
                onClick={handleBulkDeleteClick} 
                size="sm" 
                variant="destructive"
                className="text-xs sm:text-sm"
              >
                <Trash2 className="mr-1 sm:mr-2 h-4 w-4" />
                Delete ({selectedDraftIds.size})
              </Button>
            )}

            {/* New Quote Button - Always navigates to wizard page */}
            <Button 
              onClick={() => navigate("/quotes/new")} 
              size="sm" 
              className="text-xs sm:text-sm"
            >
              <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden xs:inline">New Quote</span>
              <span className="xs:hidden">New</span>
            </Button>

            {/* Edit Quote Dialog - kept for editing existing quotes */}
            <Dialog open={dialogOpen && !!editingId} onOpenChange={(open) => {
              if (!open) {
                setDialogOpen(false);
                resetForm();
              }
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Quote</DialogTitle>
                  <DialogDescription>
                    Update quote information
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lab_id">Lab *</Label>
                    <Select
                      value={formData.lab_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, lab_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lab" />
                      </SelectTrigger>
                      <SelectContent>
                        {labs.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quote_number">Internal Quote Number</Label>
                      <Input
                        id="quote_number"
                        value={formData.quote_number}
                        onChange={(e) =>
                          setFormData({ ...formData, quote_number: e.target.value })
                        }
                        placeholder="Your internal tracking number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lab_quote_number">Lab Quote Number</Label>
                      <Input
                        id="lab_quote_number"
                        value={formData.lab_quote_number}
                        onChange={(e) =>
                          setFormData({ ...formData, lab_quote_number: e.target.value })
                        }
                        placeholder="Vendor's quote number"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional notes about this quote"
                      rows={3}
                    />
                  </div>

                  {/* Show additional fields only when editing approved or later quotes */}
                  {editingId && formData.status !== "draft" && formData.status !== "sent_to_vendor" && (
                    <>
                      <div className="border-t pt-4 space-y-4">
                        <h3 className="font-medium text-sm">Fulfillment Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) =>
                                setFormData({ ...formData, status: value })
                              }
                              required
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent_to_vendor">Sent to Vendor</SelectItem>
                                <SelectItem value="awaiting_customer_approval">Awaiting Approval</SelectItem>
                                <SelectItem value="approved_payment_pending">Approved - Payment Pending</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="paid_awaiting_shipping">Paid - Awaiting Shipping</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="testing_in_progress">Testing in Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="shipped_date">Shipped Date</Label>
                            <Input
                              id="shipped_date"
                              type="date"
                              value={formData.shipped_date}
                              onChange={(e) =>
                                setFormData({ ...formData, shipped_date: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTemplateDialogOpen(true)}
                      disabled={quoteItems.length === 0}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save as Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Update</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Tabs and Search/Filter Bar */}
        <div className="mb-6 space-y-3">
          {/* Status Quick Filters Tabs */}
          <div className="flex items-center justify-between border-b">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectStatusTab("all")}
                  className={cn(
                    "rounded-none border-b-2 px-4 h-10",
                    activeView === "all"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectStatusTab("draft")}
                  className={cn(
                    "rounded-none border-b-2 px-4 h-10",
                    activeView === "draft"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectStatusTab("approved_payment_pending")}
                  className={cn(
                    "rounded-none border-b-2 px-4 h-10 whitespace-nowrap",
                    activeView === "approved_payment_pending"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Payment Pending
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectStatusTab("in_transit")}
                  className={cn(
                    "rounded-none border-b-2 px-4 h-10",
                    activeView === "in_transit"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  In Transit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectStatusTab("testing_in_progress")}
                  className={cn(
                    "rounded-none border-b-2 px-4 h-10 whitespace-nowrap",
                    activeView === "testing_in_progress"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Testing
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectStatusTab("completed")}
                  className={cn(
                    "rounded-none border-b-2 px-4 h-10",
                    activeView === "completed"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Completed
                </Button>

                {/* Saved Views as Tabs */}
                {savedViews.map((view) => (
                  <div key={view.id} className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadView(view)}
                      className={cn(
                        "rounded-none border-b-2 px-4 h-10 pr-8",
                        activeView === view.id
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {view.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeleteView(view.id, view.name, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Save Current View Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveViewDialogOpen(true)}
                  disabled={!hasActiveFilters()}
                  className="rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground px-4 h-10 gap-1"
                  title="Save current filters as a new view"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Search and Filter Icons */}
            <div className="flex items-center gap-2 pb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchExpanded(!searchExpanded);
                  setFiltersExpanded(false);
                }}
                className={cn(searchExpanded && "bg-accent")}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFiltersExpanded(!filtersExpanded);
                  setSearchExpanded(false);
                }}
                className={cn(filtersExpanded && "bg-accent")}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expanded Search Bar */}
          {searchExpanded && (
            <div className="flex items-center gap-2 py-2 border-b">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Searching all quotes"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 border-0 focus-visible:ring-0 shadow-none"
                  maxLength={200}
                  autoFocus
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchExpanded(false);
                  setSearchQuery("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Expanded Filters Section */}
          {filtersExpanded && (
            <div className="py-3 border-b space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Show filter options
                  }}
                  className="gap-2"
                >
                  Add filter
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {filterLab !== "all" && (
                  <div className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded text-sm">
                    <span className="text-xs text-muted-foreground">Lab:</span>
                    <span>{labs.find(l => l.id === filterLab)?.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-auto"
                      onClick={() => setFilterLab("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {filterProduct !== "all" && (
                  <div className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded text-sm">
                    <span className="text-xs text-muted-foreground">Product:</span>
                    <span>{products.find(p => p.id === filterProduct)?.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-auto"
                      onClick={() => setFilterProduct("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {filterLockStatus !== "all" && (
                  <div className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded text-sm">
                    <span className="text-xs text-muted-foreground">Lock:</span>
                    <span>{filterLockStatus === "locked" ? "Locked" : "Unlocked"}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-auto"
                      onClick={() => setFilterLockStatus("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Lab
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 z-50 bg-background" align="start">
                    <Command>
                      <CommandInput placeholder="Search labs..." />
                      <CommandList>
                        <CommandEmpty>No labs found.</CommandEmpty>
                        <CommandGroup>
                          {labs.map((lab) => (
                            <CommandItem
                              key={lab.id}
                              onSelect={() => {
                                setFilterLab(lab.id);
                              }}
                            >
                              {lab.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Product
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 z-50 bg-background" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => {
                                setFilterProduct(product.id);
                              }}
                            >
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Select value={filterLockStatus} onValueChange={setFilterLockStatus}>
                  <SelectTrigger className="w-auto h-9 gap-2">
                    <Plus className="h-3 w-3" />
                    <SelectValue placeholder="Lock Status" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="locked">Locked (Paid+)</SelectItem>
                    <SelectItem value="unlocked">Unlocked (Pre-Payment)</SelectItem>
                  </SelectContent>
                </Select>

                {(filterLab !== "all" || filterProduct !== "all" || filterLockStatus !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterLab("all");
                      setFilterProduct("all");
                      setFilterLockStatus("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

            {/* Virtualized Quotes Table */}
            <QuotesVirtualTable
              quotes={filteredQuotes}
              allQuotesCount={quotes.length}
              isQuoteLocked={isQuoteLocked}
              getAvailableActions={getAvailableActions}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageItems={handleManageItems}
              onApproveReject={(quote) => {
                fetchQuoteItems(quote.id).then(() => {
                  setSelectedQuoteForApproval(quote);
                  setApprovalDialogOpen(true);
                });
              }}
              onAddPayment={(quote) => {
                if (isMobile) {
                  navigate(`/quotes/${quote.id}/payment`);
                } else {
                  setSelectedQuoteForPayment(quote);
                  setPaymentDialogOpen(true);
                }
              }}
              onAddShipping={(quote) => {
                if (isMobile) {
                  navigate(`/quotes/${quote.id}/shipping`);
                } else {
                  setSelectedQuoteForShipping(quote);
                  setShippingDialogOpen(true);
                }
              }}
              onGenerateLabel={(quote) => {
                setSelectedQuoteForLabel(quote);
                setShippingLabelDialogOpen(true);
              }}
              onDuplicate={handleDuplicateQuote}
              onRefreshTracking={handleRefreshTracking}
              canRefreshTracking={canRefreshTracking}
              timeUntilNextRefresh={timeUntilNextRefresh}
              hasValidatedCreditCard={hasValidatedCreditCard}
              selectedDraftIds={selectedDraftIds}
              onToggleDraftSelection={handleToggleDraftSelection}
              onSelectAllDrafts={handleSelectAllDrafts}
            />

        {/* View Quote Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quote Details</DialogTitle>
              <DialogDescription>
                Review quote information and items
              </DialogDescription>
            </DialogHeader>
            {selectedQuote && (
              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Quote Number</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {selectedQuote.quote_number || `Quote ${selectedQuote.id.slice(0, 8)}`}
                        </p>
                        {selectedQuote.quote_number?.startsWith('QT-') && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                  Auto
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Auto-generated quote number</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedQuote.quote_number || `Quote ${selectedQuote.id.slice(0, 8)}`);
                            toast({
                              title: "Copied",
                              description: "Quote number copied to clipboard",
                              duration: 2000,
                            });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Lab</Label>
                      <p className="font-medium">{selectedQuote.labs.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <StatusBadge status={selectedQuote.status} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tracking Number</Label>
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">
                          {selectedQuote.tracking_number || "—"}
                        </p>
                        {selectedQuote.tracking_number && selectedQuote.tracking_updated_at && (
                          <p className="text-xs text-muted-foreground">
                            Last updated: {new Date(selectedQuote.tracking_updated_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedQuote.notes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="mt-1">{selectedQuote.notes}</p>
                    </div>
                  )}
                  
                  {/* Payment Information Section */}
                  <div className="border-t pt-4">
                    <Label className="text-lg font-semibold mb-3 block">Payment Information</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Payment Status</Label>
                        <div className="mt-1">
                          <StatusBadge status={selectedQuote.payment_status || "pending"} />
                        </div>
                      </div>
                      {selectedQuote.payment_date && (
                        <div>
                          <Label className="text-muted-foreground">Payment Date</Label>
                          <p className="font-medium mt-1">
                            {new Date(selectedQuote.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {selectedQuote.payment_amount_usd && (
                        <div>
                          <Label className="text-muted-foreground">Amount (USD)</Label>
                          <p className="font-medium mt-1">
                            ${selectedQuote.payment_amount_usd.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {selectedQuote.payment_amount_crypto && (
                        <div>
                          <Label className="text-muted-foreground">Amount (Crypto)</Label>
                          <p className="font-medium mt-1">
                            {selectedQuote.payment_amount_crypto}
                          </p>
                        </div>
                      )}
                      {selectedQuote.transaction_id && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">Transaction ID</Label>
                          <p className="font-mono text-sm mt-1 break-all">
                            {selectedQuote.transaction_id}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tracking History Section */}
                  {selectedQuote.tracking_number && trackingHistory.length > 0 && (
                    <div className="border-t pt-4">
                      <Label className="text-lg font-semibold mb-3 block">Tracking History</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {trackingHistory.map((history) => (
                          <div key={history.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
                            <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <StatusBadge status={history.status} />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(history.changed_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="capitalize">{history.source}</span>
                                {history.details?.old_status && (
                                  <span>• Changed from: <StatusBadge status={history.details.old_status} /></span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Quote Items</Label>
                      <p className="text-sm text-muted-foreground">
                        Total: ${totalQuoteValue.toFixed(2)}
                      </p>
                    </div>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                         <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Client/Sample</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Report</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quoteItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.products.name}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>Client: {item.client || "—"}</div>
                                  <div>Sample: {item.sample || "—"}</div>
                                  <div>Mfg: {item.manufacturer || "—"}</div>
                                  <div>Batch: {item.batch || "—"}</div>
                                  {(item.additional_samples || 0) > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      +{item.additional_samples} additional samples
                                    </div>
                                  )}
                                  {(item.additional_report_headers || 0) > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{item.additional_report_headers} report headers
                                    </div>
                                  )}
                                  {item.additional_headers_data && item.additional_headers_data.length > 0 && (
                                    <div className="mt-2 pl-2 border-l-2 border-muted space-y-1">
                                      {item.additional_headers_data.map((header, idx) => (
                                        <div key={idx} className="text-xs text-muted-foreground">
                                          <strong>Header #{idx + 1}:</strong> {header.client} / {header.sample} / {header.manufacturer} / {header.batch}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={item.status || "pending"} />
                                {item.date_submitted && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Submitted: {new Date(item.date_submitted).toLocaleDateString()}
                                  </div>
                                )}
                                {item.date_completed && (
                                  <div className="text-xs text-muted-foreground">
                                    Completed: {new Date(item.date_completed).toLocaleDateString()}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.report_url && (
                                  <a 
                                    href={item.report_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-sm"
                                  >
                                    View Report
                                  </a>
                                )}
                                {item.report_file && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    File: {item.report_file}
                                  </div>
                                )}
                                {item.test_results && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.test_results}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                ${item.price?.toFixed(2) || "0.00"}
                                {(item.additional_samples || 0) > 0 && 
                                 (item.products.name.toLowerCase().includes('tirzepatide') || 
                                  item.products.name.toLowerCase().includes('semaglutide') || 
                                  item.products.name.toLowerCase().includes('retatrutide')) && (
                                  <div className="text-xs text-muted-foreground">
                                    +${((item.additional_samples || 0) * 60).toFixed(2)} (additional samples)
                                  </div>
                                )}
                                <div className="text-sm font-medium mt-1">
                                  Total: ${calculateItemTotal(item).toFixed(2)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                  {emailTemplates.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Email Template:</Label>
                      <Select
                        value={selectedEmailTemplate}
                        onValueChange={setSelectedEmailTemplate}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailTemplates.map((template: any) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedQuote && 
                   !isQuoteLocked(selectedQuote.status) && 
                   !['sent_to_vendor', 'approved_payment_pending', 'awaiting_customer_approval', 'rejected', 'paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'].includes(selectedQuote.status) && (
                    <Button
                      variant="outline"
                      onClick={handleSendEmail}
                      title="Send quote to vendor"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send to Vendor
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Items Dialog */}
        <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Manage Quote Items
                {productsMissingPricing.length > 0 && selectedQuote && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <span className="text-muted-foreground">ℹ️</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium mb-1">Missing Vendor Pricing</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {productsMissingPricing.length} compound{productsMissingPricing.length !== 1 ? 's' : ''} don't have pricing for {labs.find(l => l.id === selectedQuote.lab_id)?.name}:
                      </p>
                      <div className="text-xs space-y-0.5">
                        {productsMissingPricing.map((product) => (
                          <div key={product.id}>• {product.name}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </DialogTitle>
              <DialogDescription>
                Add or remove items from this quote
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <form onSubmit={handleAddItem} className="space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">
                    {editingItemId ? "Edit Item" : "Add New Item"}
                  </h3>
                  {editingItemId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetItemForm}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isSubscriber ? "Compound" : "Product"} *</Label>
                    <Select
                      value={itemFormData.product_id}
                      onValueChange={handleProductChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isSubscriber ? "Select compound" : "Select product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Popover open={clientOpen} onOpenChange={setClientOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={clientOpen}
                          className="w-full justify-between"
                        >
                          {itemFormData.client || "Select or type client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type new client..." 
                            value={itemFormData.client}
                            onValueChange={(value) => setItemFormData({ ...itemFormData, client: value })}
                          />
                          <CommandList>
                            <CommandEmpty>
                              Press Enter to add "{itemFormData.client}"
                            </CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.name}
                                  onSelect={() => {
                                    setItemFormData({ ...itemFormData, client: client.name });
                                    setClientOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      itemFormData.client === client.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {client.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {!isSubscriber && (
                    <div className="space-y-2">
                      <Label>Sample *</Label>
                      <Input
                        value={itemFormData.sample}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, sample: e.target.value })
                        }
                        placeholder="Sample identifier"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Manufacturer *</Label>
                    <Popover open={manufacturerOpen} onOpenChange={setManufacturerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={manufacturerOpen}
                          className="w-full justify-between"
                        >
                          {itemFormData.manufacturer || "Select or type manufacturer..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type new manufacturer..." 
                            value={itemFormData.manufacturer}
                            onValueChange={(value) => setItemFormData({ ...itemFormData, manufacturer: value })}
                          />
                          <CommandList>
                            <CommandEmpty>
                              Press Enter to add "{itemFormData.manufacturer}"
                            </CommandEmpty>
                            <CommandGroup>
                              {manufacturers.map((manufacturer) => (
                                <CommandItem
                                  key={manufacturer.id}
                                  value={manufacturer.name}
                                  onSelect={() => {
                                    setItemFormData({ ...itemFormData, manufacturer: manufacturer.name });
                                    setManufacturerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      itemFormData.manufacturer === manufacturer.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {manufacturer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch *</Label>
                    <Input
                      value={itemFormData.batch}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, batch: e.target.value })
                      }
                      placeholder="Batch number"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label>Price {isSubscriber && "(auto-populated from vendor pricing)"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemFormData.price}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, price: e.target.value })
                      }
                      placeholder="0.00"
                      disabled={isSubscriber}
                      className={isSubscriber ? "bg-muted" : ""}
                    />
                    {isSubscriber && (parseFloat(itemFormData.price) > 0 || itemFormData.additional_report_headers > 0) && (
                      <div className="text-sm space-y-1 p-2 bg-muted/50 rounded">
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>${parseFloat(itemFormData.price || "0").toFixed(2)}</span>
                        </div>
                        {itemFormData.additional_report_headers > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Additional Headers ({itemFormData.additional_report_headers} × $30):</span>
                            <span>+${(itemFormData.additional_report_headers * 30).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                          <span>Total:</span>
                          <span>${(parseFloat(itemFormData.price || "0") + (itemFormData.additional_report_headers * 30)).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="additional-samples"
                        checked={itemFormData.has_additional_samples}
                        onCheckedChange={(checked) => 
                          setItemFormData({ 
                            ...itemFormData, 
                            has_additional_samples: checked as boolean,
                            additional_samples: checked ? itemFormData.additional_samples : 0
                          })
                        }
                      />
                      <Label htmlFor="additional-samples" className="cursor-pointer">
                        Additional Samples
                      </Label>
                    </div>
                    {itemFormData.has_additional_samples && (
                      <Input
                        type="number"
                        min="0"
                        value={itemFormData.additional_samples}
                        onChange={(e) =>
                          setItemFormData({ 
                            ...itemFormData, 
                            additional_samples: parseInt(e.target.value) || 0 
                          })
                        }
                        placeholder="Number of additional samples"
                      />
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Additional Report Headers</Label>
                    <Input
                      type="number"
                      min="0"
                      value={itemFormData.additional_report_headers}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        const currentData = itemFormData.additional_headers_data;
                        
                        // Resize the array to match the count
                        let newData = [...currentData];
                        if (count > currentData.length) {
                          // Add empty entries
                          for (let i = currentData.length; i < count; i++) {
                            newData.push({ client: "", sample: "", manufacturer: "", batch: "" });
                          }
                        } else if (count < currentData.length) {
                          // Remove excess entries
                          newData = newData.slice(0, count);
                        }
                        
                        setItemFormData({ 
                          ...itemFormData, 
                          additional_report_headers: count,
                          additional_headers_data: newData,
                        });
                      }}
                      placeholder="Number of additional report headers"
                    />
                  </div>
                  
                  {/* Dynamic fields for each additional header */}
                  {itemFormData.additional_report_headers > 0 && (
                    <div className="col-span-2 space-y-4 p-4 border rounded-lg bg-muted/50">
                      <Label className="text-sm font-semibold">Additional Report Header Details</Label>
                      {Array.from({ length: itemFormData.additional_report_headers }).map((_, index) => (
                        <div key={index} className="space-y-3 p-3 border rounded bg-background">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Header #{index + 1}</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const newData = [...itemFormData.additional_headers_data];
                                newData[index] = {
                                  client: itemFormData.client,
                                  sample: itemFormData.sample,
                                  manufacturer: itemFormData.manufacturer,
                                  batch: itemFormData.batch,
                                };
                                setItemFormData({ ...itemFormData, additional_headers_data: newData });
                              }}
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy from main
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Client</Label>
                              <Popover 
                                open={additionalHeaderClientOpen[index] || false} 
                                onOpenChange={(open) => setAdditionalHeaderClientOpen({...additionalHeaderClientOpen, [index]: open})}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={additionalHeaderClientOpen[index] || false}
                                    className="w-full justify-between text-xs h-9"
                                  >
                                    {itemFormData.additional_headers_data[index]?.client || "Select or type client..."}
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Search or type new client..." 
                                      value={itemFormData.additional_headers_data[index]?.client || ""}
                                      onValueChange={(value) => {
                                        const newData = [...itemFormData.additional_headers_data];
                                        newData[index] = { ...newData[index], client: value };
                                        setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                      }}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        Press Enter to add "{itemFormData.additional_headers_data[index]?.client || ""}"
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {clients.map((client) => (
                                          <CommandItem
                                            key={client.id}
                                            value={client.name}
                                            onSelect={() => {
                                              const newData = [...itemFormData.additional_headers_data];
                                              newData[index] = { ...newData[index], client: client.name };
                                              setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                              setAdditionalHeaderClientOpen({...additionalHeaderClientOpen, [index]: false});
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                itemFormData.additional_headers_data[index]?.client === client.name ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {client.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Sample</Label>
                              <Input
                                value={itemFormData.additional_headers_data[index]?.sample || ""}
                                onChange={(e) => {
                                  const newData = [...itemFormData.additional_headers_data];
                                  newData[index] = { ...newData[index], sample: e.target.value };
                                  setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                }}
                                placeholder="Sample identifier"
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Manufacturer</Label>
                              <Popover 
                                open={additionalHeaderManufacturerOpen[index] || false} 
                                onOpenChange={(open) => setAdditionalHeaderManufacturerOpen({...additionalHeaderManufacturerOpen, [index]: open})}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={additionalHeaderManufacturerOpen[index] || false}
                                    className="w-full justify-between text-xs h-9"
                                  >
                                    {itemFormData.additional_headers_data[index]?.manufacturer || "Select or type manufacturer..."}
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Search or type new manufacturer..." 
                                      value={itemFormData.additional_headers_data[index]?.manufacturer || ""}
                                      onValueChange={(value) => {
                                        const newData = [...itemFormData.additional_headers_data];
                                        newData[index] = { ...newData[index], manufacturer: value };
                                        setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                      }}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        Press Enter to add "{itemFormData.additional_headers_data[index]?.manufacturer || ""}"
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {manufacturers.map((manufacturer) => (
                                          <CommandItem
                                            key={manufacturer.id}
                                            value={manufacturer.name}
                                            onSelect={() => {
                                              const newData = [...itemFormData.additional_headers_data];
                                              newData[index] = { ...newData[index], manufacturer: manufacturer.name };
                                              setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                              setAdditionalHeaderManufacturerOpen({...additionalHeaderManufacturerOpen, [index]: false});
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                itemFormData.additional_headers_data[index]?.manufacturer === manufacturer.name ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {manufacturer.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Batch</Label>
                              <Input
                                value={itemFormData.additional_headers_data[index]?.batch || ""}
                                onChange={(e) => {
                                  const newData = [...itemFormData.additional_headers_data];
                                  newData[index] = { ...newData[index], batch: e.target.value };
                                  setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                }}
                                placeholder="Batch number"
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Testing & Report Information */}
                  <div className="col-span-2 border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">Testing & Report Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={itemFormData.status}
                          onValueChange={(value) =>
                            setItemFormData({ ...itemFormData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="testing_in_progress">Testing in Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date Submitted</Label>
                        <Input
                          type="date"
                          value={itemFormData.date_submitted}
                          onChange={(e) =>
                            setItemFormData({ ...itemFormData, date_submitted: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date Completed</Label>
                        <Input
                          type="date"
                          value={itemFormData.date_completed}
                          onChange={(e) =>
                            setItemFormData({ ...itemFormData, date_completed: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Report URL</Label>
                        <Input
                          value={itemFormData.report_url}
                          onChange={(e) =>
                            setItemFormData({ ...itemFormData, report_url: e.target.value })
                          }
                          placeholder="Lab report URL"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Report File Upload</Label>
                      <div className="space-y-2">
                        {selectedFile && (
                          <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{selectedFile.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFile(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {itemFormData.report_file && !selectedFile && (
                          <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <a 
                                href={itemFormData.report_file} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                View current file
                              </a>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            disabled={uploadingFile}
                            className="cursor-pointer"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload PDF or image files (JPG, PNG)
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Test Results</Label>
                      <Textarea
                        value={itemFormData.test_results}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, test_results: e.target.value })
                        }
                        placeholder="Test results summary"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Testing Notes</Label>
                      <Textarea
                        value={itemFormData.testing_notes}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, testing_notes: e.target.value })
                        }
                        placeholder="Additional notes about testing"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={uploadingFile}>
                  {uploadingFile ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {editingItemId ? "Update Item" : "Add Item"}
                    </>
                  )}
                </Button>
              </form>

              <div>
                <Label>Current Items - Testing Phases</Label>
                <div className="border rounded-lg mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Submission Info</TableHead>
                        <TableHead>Testing Phase</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No items added yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        quoteItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.products.name}</TableCell>
                            <TableCell className="text-sm">
                              {item.client && <div>Client: {item.client}</div>}
                              {item.sample && <div>Sample: {item.sample}</div>}
                              {item.manufacturer && (
                                <div>Mfg: {item.manufacturer}</div>
                              )}
                              {item.batch && <div>Batch: {item.batch}</div>}
                              {(item.additional_samples || 0) > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  +{item.additional_samples} additional samples
                                </div>
                              )}
                              {(item.additional_report_headers || 0) > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  +{item.additional_report_headers} report headers
                                </div>
                              )}
                              {item.additional_headers_data && item.additional_headers_data.length > 0 && (
                                <div className="mt-2 pl-2 border-l-2 border-muted space-y-1">
                                  {item.additional_headers_data.map((header, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground">
                                      <strong>Header #{idx + 1}:</strong> {header.client} / {header.sample} / {header.manufacturer} / {header.batch}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <StatusBadge status={item.status || "pending"} />
                                {item.date_submitted && (
                                  <div className="text-xs text-muted-foreground">
                                    Submitted: {new Date(item.date_submitted).toLocaleDateString()}
                                  </div>
                                )}
                                {item.date_completed && (
                                  <div className="text-xs text-success">
                                    Completed: {new Date(item.date_completed).toLocaleDateString()}
                                  </div>
                                )}
                                {item.report_url && (
                                  <a
                                    href={item.report_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    View Report
                                  </a>
                                )}
                                {item.report_file && (
                                  <a
                                    href={item.report_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    View File
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.price?.toFixed(2) || "0.00"}
                              {(item.additional_samples || 0) > 0 && 
                               (item.products.name.toLowerCase().includes('tirzepatide') || 
                                item.products.name.toLowerCase().includes('semaglutide') || 
                                item.products.name.toLowerCase().includes('retatrutide')) && (
                                <div className="text-xs text-muted-foreground">
                                  +${((item.additional_samples || 0) * 60).toFixed(2)} (additional)
                                </div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                Total: ${calculateItemTotal(item).toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center mt-2 px-2">
                  <span className="font-medium">Total</span>
                  <span className="font-medium">
                    ${totalQuoteValue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setItemsDialogOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Save Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save this quote configuration as a reusable template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Peptide Testing"
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description (Optional)</Label>
                <Textarea
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe this template..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>Save Template</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Load Template Dialog */}
        <Dialog open={loadTemplateDialogOpen} onOpenChange={setLoadTemplateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Load Template</DialogTitle>
              <DialogDescription>
                Select a template to load its configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No templates saved yet
                </p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <EmailPreviewDialog
          open={emailPreviewOpen}
          onOpenChange={setEmailPreviewOpen}
          subject={emailPreviewData.subject}
          htmlContent={emailPreviewData.html}
          recipientEmail={emailPreviewData.recipient}
          onConfirmSend={confirmSendEmail}
          isSending={isSendingEmail}
        />

        {/* Email History Dialog */}
        <EmailHistoryDialog
          open={emailHistoryOpen}
          onOpenChange={setEmailHistoryOpen}
          quoteId={selectedQuote?.id}
        />


        {/* Quote Approval Dialog */}
        {selectedQuoteForApproval && quoteItems.length > 0 && (
          <QuoteApprovalDialog
            open={approvalDialogOpen}
            onOpenChange={setApprovalDialogOpen}
            quote={selectedQuoteForApproval}
            quoteItems={quoteItems}
            onApprove={() => refetchQuotes()}
            onReject={() => refetchQuotes()}
          />
        )}

        {/* Payment Details Dialog */}
        {selectedQuoteForPayment && (
          <PaymentDetailsDialog
            open={paymentDialogOpen}
            onOpenChange={(open) => {
              if (!paymentSubmitting) {
                setPaymentDialogOpen(open);
                if (!open) setSelectedQuoteForPayment(null);
              }
            }}
            onSubmit={handlePaymentSubmit}
            isSubmitting={paymentSubmitting}
            initialData={{
              payment_status: selectedQuoteForPayment.payment_status || "pending",
              payment_amount_usd: selectedQuoteForPayment.payment_amount_usd?.toString() || "",
              payment_amount_crypto: selectedQuoteForPayment.payment_amount_crypto || "",
              payment_date: selectedQuoteForPayment.payment_date || "",
              transaction_id: selectedQuoteForPayment.transaction_id || "",
            }}
          />
        )}

        {/* Shipping Details Dialog */}
        {selectedQuoteForShipping && (
          <ShippingDetailsDialog
            open={shippingDialogOpen}
            onOpenChange={(open) => {
              if (!shippingSubmitting) {
                setShippingDialogOpen(open);
                if (!open) setSelectedQuoteForShipping(null);
              }
            }}
            onSubmit={handleShippingSubmit}
            onRefreshTracking={handleRefreshTracking}
            isSubmitting={shippingSubmitting}
            initialData={{
              tracking_number: selectedQuoteForShipping.tracking_number || "",
              shipped_date: selectedQuoteForShipping.shipped_date || "",
            }}
          />
        )}

        {/* Shipping Label Generation Dialog */}
        {selectedQuoteForLabel && (
          <ShippingLabelDialog
            open={shippingLabelDialogOpen}
            onOpenChange={setShippingLabelDialogOpen}
            onSubmit={handleShippingLabelSubmit}
            quoteId={selectedQuoteForLabel.id}
          />
        )}

        {/* Save View Dialog */}
        <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save Current View</DialogTitle>
              <DialogDescription>
                Give this filter combination a name to quickly access it later
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="e.g., Pending Payment"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveCurrentView();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCurrentView}>
                  <Check className="h-4 w-4 mr-2" />
                  Save View
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setQuoteToDelete(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedDraftIds.size > 0 && !quoteToDelete 
                  ? `Delete ${selectedDraftIds.size} Quote${selectedDraftIds.size > 1 ? 's' : ''}` 
                  : 'Delete Quote'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedDraftIds.size > 0 && !quoteToDelete 
                  ? `Are you sure you want to delete ${selectedDraftIds.size} selected draft quote${selectedDraftIds.size > 1 ? 's' : ''}? This action cannot be undone.`
                  : 'Are you sure you want to delete this quote? This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setQuoteToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                disabled={isBulkDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isBulkDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </PullToRefreshWrapper>
      </TooltipProvider>
    </Layout>
  );
};

export default Quotes;