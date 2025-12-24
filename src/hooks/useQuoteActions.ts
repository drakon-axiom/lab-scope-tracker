import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuoteMutations } from "@/hooks/useQuoteMutations";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useUserRole } from "@/hooks/useUserRole";
import { PaymentFormData } from "@/components/PaymentDetailsDialog";
import { ShippingFormData } from "@/components/ShippingDetailsDialog";
import { ShippingLabelFormData } from "@/components/ShippingLabelDialog";

interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  status: string;
  tracking_number: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  shipped_date: string | null;
  labs: { name: string };
}

export function useQuoteActions(refetchQuotes: () => Promise<void>) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserRole();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const { deleteQuote } = useQuoteMutations();

  // State for dialogs
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedQuoteForApproval, setSelectedQuoteForApproval] = useState<Quote | null>(null);
  const [selectedQuoteForPayment, setSelectedQuoteForPayment] = useState<Quote | null>(null);
  const [selectedQuoteForShipping, setSelectedQuoteForShipping] = useState<Quote | null>(null);
  const [selectedQuoteForLabel, setSelectedQuoteForLabel] = useState<Quote | null>(null);
  
  // Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingLabelDialogOpen, setShippingLabelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  
  // Loading states
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [shippingSubmitting, setShippingSubmitting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Selection state
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  
  // Tracking refresh
  const [lastTrackingRefresh, setLastTrackingRefresh] = useState<number | null>(null);
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState("");
  const hasRefreshedStaleTracking = useRef(false);

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

  // Helper function to check if quote is locked
  const isQuoteLocked = useCallback((status: string) => {
    const lockedStatuses = ['paid_awaiting_shipping', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
    return lockedStatuses.includes(status);
  }, []);

  // Helper function to check if editing should be disabled
  const isEditingDisabled = useCallback((status: string) => {
    if (role === 'admin') return false;
    return isQuoteLocked(status);
  }, [role, isQuoteLocked]);

  // Get available actions for a quote
  const getAvailableActions = useCallback((quote: Quote) => {
    const actions = {
      view: true,
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
        break;
      case 'sent_to_vendor':
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
        actions.manageItems = true;
        break;
      case 'completed':
        break;
    }

    if (role === 'admin' && quote.status !== 'sent_to_vendor' && quote.status !== 'awaiting_customer_approval') {
      actions.edit = true;
      actions.delete = true;
      actions.manageItems = true;
    }

    return actions;
  }, [role, isEditingDisabled]);

  // Check if tracking can be refreshed
  const canRefreshTracking = useCallback(() => {
    if (!lastTrackingRefresh) return true;
    const elapsed = Date.now() - lastTrackingRefresh;
    return elapsed >= 60 * 60 * 1000; // 60 minutes
  }, [lastTrackingRefresh]);

  // Handle refresh tracking
  const handleRefreshTracking = useCallback(async () => {
    if (!canRefreshTracking()) {
      toast({
        title: "Rate limited",
        description: timeUntilNextRefresh || "Please wait before refreshing again",
        variant: "destructive",
      });
      return;
    }

    try {
      const now = Date.now();
      setLastTrackingRefresh(now);
      localStorage.setItem('lastTrackingRefresh', now.toString());

      await supabase.functions.invoke("update-ups-tracking", { body: {} });

      toast({
        title: "Tracking Updated",
        description: "Tracking information has been refreshed",
      });

      setTimeout(() => refetchQuotes(), 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh tracking",
        variant: "destructive",
      });
    }
  }, [canRefreshTracking, timeUntilNextRefresh, toast, refetchQuotes]);

  // Handle view
  const handleView = useCallback((quote: Quote, isMobile: boolean) => {
    if (isMobile) {
      navigate(`/quotes/${quote.id}`);
    } else {
      setSelectedQuote(quote);
      setViewDialogOpen(true);
    }
  }, [navigate]);

  // Handle edit
  const handleEdit = useCallback((quote: Quote) => {
    if (quote.status === 'awaiting_customer_approval') {
      setSelectedQuoteForApproval(quote);
      setApprovalDialogOpen(true);
      return;
    }

    if (isEditingDisabled(quote.status)) {
      toast({
        title: "Cannot Edit",
        description: "Quotes cannot be edited after payment",
        variant: "destructive",
      });
      return;
    }

    if (quote.status === 'draft') {
      navigate(`/quotes/${quote.id}/edit`);
      return;
    }

    // For other editable statuses, would need to handle dialog
    setSelectedQuote(quote);
  }, [isEditingDisabled, navigate, toast]);

  // Handle delete
  const handleDelete = useCallback((id: string) => {
    setQuoteToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    if (selectedDraftIds.size > 0 && !quoteToDelete) {
      setIsBulkDeleting(true);
      try {
        const idsToDelete = Array.from(selectedDraftIds);
        
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
        });
        setSelectedDraftIds(new Set());
        refetchQuotes();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsBulkDeleting(false);
        setDeleteDialogOpen(false);
      }
      return;
    }

    if (!quoteToDelete) return;

    deleteQuote.mutate(quoteToDelete, {
      onSuccess: () => {
        toast({ title: "Quote deleted successfully" });
        setDeleteDialogOpen(false);
        setQuoteToDelete(null);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setQuoteToDelete(null);
      },
    });
  }, [selectedDraftIds, quoteToDelete, deleteQuote, toast, refetchQuotes]);

  // Handle duplicate
  const handleDuplicate = useCallback(async (quote: Quote) => {
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

      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      const { data: originalItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          user_id: targetUserId,
          lab_id: quote.lab_id,
          status: "draft",
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

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
      navigate(`/quotes/${newQuote.id}/edit`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate quote",
        variant: "destructive",
      });
    }
  }, [isImpersonatingCustomer, impersonatedUser, toast, refetchQuotes, navigate]);

  // Handle payment submit
  const handlePaymentSubmit = useCallback(async (paymentData: PaymentFormData) => {
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
      });

      setPaymentDialogOpen(false);
      setSelectedQuoteForPayment(null);
      refetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPaymentSubmitting(false);
    }
  }, [selectedQuoteForPayment, toast, refetchQuotes]);

  // Handle shipping submit
  const handleShippingSubmit = useCallback(async (shippingData: ShippingFormData) => {
    if (!selectedQuoteForShipping) return;

    setShippingSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        tracking_number: shippingData.tracking_number,
        shipped_date: shippingData.shipped_date || null,
        status: "in_transit",
      };

      const { error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", selectedQuoteForShipping.id);

      if (error) throw error;

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
      });

      setShippingDialogOpen(false);
      setSelectedQuoteForShipping(null);
      refetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShippingSubmitting(false);
    }
  }, [selectedQuoteForShipping, toast, refetchQuotes]);

  // Handle shipping label submit
  const handleShippingLabelSubmit = useCallback(async (labelData: ShippingLabelFormData) => {
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
        });

        if (data.labelImage) {
          const link = document.createElement('a');
          link.href = `data:image/gif;base64,${data.labelImage}`;
          link.download = `shipping-label-${selectedQuoteForLabel.id}.gif`;
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
      });
    }
  }, [selectedQuoteForLabel, toast, refetchQuotes]);

  // Draft selection handlers
  const handleToggleDraftSelection = useCallback((quoteId: string) => {
    setSelectedDraftIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllDrafts = useCallback((draftQuotes: Quote[]) => {
    const allDraftIds = draftQuotes.map(q => q.id);
    const allSelected = allDraftIds.every(id => selectedDraftIds.has(id));

    if (allSelected) {
      setSelectedDraftIds(new Set());
    } else {
      setSelectedDraftIds(new Set(allDraftIds));
    }
  }, [selectedDraftIds]);

  const handleBulkDeleteClick = useCallback(() => {
    setQuoteToDelete(null);
    setDeleteDialogOpen(true);
  }, []);

  return {
    // State
    selectedQuote,
    selectedQuoteForApproval,
    selectedQuoteForPayment,
    selectedQuoteForShipping,
    selectedQuoteForLabel,
    selectedDraftIds,
    quoteToDelete,
    
    // Dialog states
    viewDialogOpen,
    approvalDialogOpen,
    paymentDialogOpen,
    shippingDialogOpen,
    shippingLabelDialogOpen,
    deleteDialogOpen,
    
    // Loading states
    paymentSubmitting,
    shippingSubmitting,
    isBulkDeleting,
    
    // Tracking
    timeUntilNextRefresh,
    canRefreshTracking,
    
    // Setters
    setSelectedQuote,
    setSelectedQuoteForApproval,
    setSelectedQuoteForPayment,
    setSelectedQuoteForShipping,
    setSelectedQuoteForLabel,
    setViewDialogOpen,
    setApprovalDialogOpen,
    setPaymentDialogOpen,
    setShippingDialogOpen,
    setShippingLabelDialogOpen,
    setDeleteDialogOpen,
    setQuoteToDelete,
    
    // Helpers
    isQuoteLocked,
    isEditingDisabled,
    getAvailableActions,
    
    // Handlers
    handleView,
    handleEdit,
    handleDelete,
    handleDuplicate,
    handleRefreshTracking,
    handlePaymentSubmit,
    handleShippingSubmit,
    handleShippingLabelSubmit,
    confirmDelete,
    handleToggleDraftSelection,
    handleSelectAllDrafts,
    handleBulkDeleteClick,
  };
}
