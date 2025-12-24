import { useState, useEffect, memo, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Check, ChevronsUpDown, ArrowLeft, ArrowRight, FlaskConical, Building2, Pencil, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerSuccessConfetti } from "@/lib/confetti";
import { QuoteEmailPreviewDialog } from "@/components/QuoteEmailPreviewDialog";

interface Lab {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
}

interface Client {
  id: string;
  name: string;
}

interface Manufacturer {
  id: string;
  name: string;
}

interface QuoteItem {
  id?: string;
  product_id: string;
  product_name: string;
  client: string;
  sample: string;
  manufacturer: string;
  batch: string;
  price: number;
  additional_samples: number;
  additional_report_headers: number;
  has_additional_samples: boolean;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }>;
}

// Memoized quote item row component
interface QuoteItemRowProps {
  item: QuoteItem;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  calculateItemTotal: (item: QuoteItem) => number;
}

const QuoteItemRow = memo(({ item, index, onEdit, onRemove, calculateItemTotal }: QuoteItemRowProps) => (
  <div className="flex items-start justify-between p-4 border rounded-lg bg-background">
    <div className="flex-1 min-w-0 space-y-1">
      <p className="font-medium">{item.product_name}</p>
      <p className="text-sm text-muted-foreground">
        {item.client} • {item.manufacturer} • Batch: {item.batch}
      </p>
      {(item.additional_samples > 0 || item.additional_report_headers > 0) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {item.additional_samples > 0 && (
            <span className="text-xs px-2 py-1 bg-muted rounded-full">
              +{item.additional_samples} samples
            </span>
          )}
          {item.additional_report_headers > 0 && (
            <span className="text-xs px-2 py-1 bg-muted rounded-full">
              +{item.additional_report_headers} headers
            </span>
          )}
        </div>
      )}
      <p className="text-sm font-semibold text-primary mt-2">
        ${calculateItemTotal(item).toFixed(2)}
      </p>
    </div>
    <div className="flex flex-col gap-1">
      <Button variant="ghost" size="icon" onClick={() => onEdit(index)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  </div>
));

QuoteItemRow.displayName = "QuoteItemRow";

// Memoized review item row component
interface ReviewItemRowProps {
  item: QuoteItem;
  calculateItemTotal: (item: QuoteItem) => number;
}

const ReviewItemRow = memo(({ item, calculateItemTotal }: ReviewItemRowProps) => (
  <div className="p-4 border rounded-lg space-y-2">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="font-medium">{item.product_name}</p>
        <p className="text-sm text-muted-foreground">
          {item.client} • {item.manufacturer} • Batch: {item.batch}
        </p>
      </div>
      <span className="font-medium">${item.price.toFixed(2)}</span>
    </div>
    
    {item.additional_samples > 0 && (
      <div className="flex justify-between text-sm pl-4">
        <span className="text-muted-foreground">
          + Additional Samples ({item.additional_samples} × $60)
        </span>
        <span>${(item.additional_samples * 60).toFixed(2)}</span>
      </div>
    )}
    
    {item.additional_report_headers > 0 && (
      <div className="flex justify-between text-sm pl-4">
        <span className="text-muted-foreground">
          + Additional Headers ({item.additional_report_headers} × $30)
        </span>
        <span>${(item.additional_report_headers * 30).toFixed(2)}</span>
      </div>
    )}

    {item.additional_headers_data.length > 0 && (
      <div className="mt-2 pl-4 space-y-1">
        {item.additional_headers_data.map((header, hIdx) => (
          <p key={hIdx} className="text-xs text-muted-foreground">
            Header {hIdx + 1}: {header.client} • {header.sample} • {header.manufacturer} • {header.batch}
          </p>
        ))}
      </div>
    )}

    <div className="flex justify-between pt-2 border-t font-medium">
      <span>Item Total</span>
      <span className="text-primary">${calculateItemTotal(item).toFixed(2)}</span>
    </div>
  </div>
));

ReviewItemRow.displayName = "ReviewItemRow";

const QuoteCreate = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId?: string }>();
  const { isSubscriber, isAdmin } = useUserRole();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const { toast } = useToast();

  // Edit mode
  const isEditMode = !!quoteId;
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Wizard step
  const [step, setStep] = useState(1);

  // Labs
  const [labs, setLabs] = useState<Lab[]>([]);

  // Quote form data
  const [formData, setFormData] = useState({
    lab_id: "",
    quote_number: "",
    notes: "",
  });

  // Items state
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(false);

  // Add/Edit item dialog
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [itemFormData, setItemFormData] = useState<QuoteItem>({
    product_id: "",
    product_name: "",
    client: "",
    sample: "",
    manufacturer: "",
    batch: "",
    price: 0,
    additional_samples: 0,
    additional_report_headers: 0,
    has_additional_samples: false,
    additional_headers_data: [],
  });

  // Popover states
  const [clientOpen, setClientOpen] = useState(false);
  const [manufacturerOpen, setManufacturerOpen] = useState(false);
  
  // Additional header popover states (track by index)
  const [headerClientOpen, setHeaderClientOpen] = useState<number | null>(null);
  const [headerManufacturerOpen, setHeaderManufacturerOpen] = useState<number | null>(null);

  // Email preview dialog
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewLabEmail, setPreviewLabEmail] = useState("");
  const [previewLabName, setPreviewLabName] = useState("");

  // Fetch labs on mount
  useEffect(() => {
    fetchLabs();
    fetchClients();
    fetchManufacturers();
  }, []);

  // Load existing quote data if editing
  useEffect(() => {
    if (isEditMode && quoteId) {
      loadExistingQuote(quoteId);
    }
  }, [quoteId]);

  // Fetch products when lab is selected
  useEffect(() => {
    if (formData.lab_id) {
      fetchProductsForLab(formData.lab_id);
    } else {
      setProducts([]);
    }
  }, [formData.lab_id]);

  const loadExistingQuote = async (id: string) => {
    setLoadingQuote(true);
    try {
      // Fetch quote data
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*, labs(name)")
        .eq("id", id)
        .maybeSingle();

      if (quoteError) throw quoteError;
      if (!quote) {
        toast({ title: "Quote not found", variant: "destructive" });
        navigate("/quotes");
        return;
      }

      // Only allow editing draft quotes
      if (quote.status !== "draft") {
        toast({ title: "Only draft quotes can be edited here", variant: "destructive" });
        navigate("/quotes");
        return;
      }

      // Set form data
      setFormData({
        lab_id: quote.lab_id,
        quote_number: quote.quote_number || "",
        notes: quote.notes || "",
      });

      // Fetch quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*, products(id, name)")
        .eq("quote_id", id);

      if (itemsError) throw itemsError;

      // Transform items to local format
      const loadedItems: QuoteItem[] = (quoteItems || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || "",
        client: item.client || "",
        sample: item.sample || "",
        manufacturer: item.manufacturer || "",
        batch: item.batch || "",
        price: item.price || 0,
        additional_samples: item.additional_samples || 0,
        additional_report_headers: item.additional_report_headers || 0,
        has_additional_samples: (item.additional_samples || 0) > 0,
        additional_headers_data: (item.additional_headers_data as Array<{
          client: string;
          sample: string;
          manufacturer: string;
          batch: string;
        }>) || [],
      }));

      setItems(loadedItems);
    } catch (error: any) {
      console.error("Error loading quote:", error);
      toast({ title: "Error loading quote", description: error.message, variant: "destructive" });
    } finally {
      setLoadingQuote(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setLabs(data || []);
    } catch (error) {
      console.error("Error fetching labs:", error);
    }
  };

  const fetchProductsForLab = async (labId: string) => {
    try {
      const { data: pricingData, error: pricingError } = await supabase
        .from("product_vendor_pricing")
        .select("product_id, price, products(id, name)")
        .eq("lab_id", labId)
        .eq("is_active", true);

      if (pricingError) throw pricingError;

      const productsWithPricing = pricingData
        ?.filter((p) => p.products)
        .map((p) => ({
          id: p.products!.id,
          name: p.products!.name,
          price: p.price,
        })) || [];

      setProducts(productsWithPricing as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", targetUserId)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name")
        .eq("user_id", targetUserId)
        .order("name");

      if (error) throw error;
      setManufacturers(data || []);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      product_id: "",
      product_name: "",
      client: "",
      sample: "",
      manufacturer: "",
      batch: "",
      price: 0,
      additional_samples: 0,
      additional_report_headers: 0,
      has_additional_samples: false,
      additional_headers_data: [],
    });
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      // Update main item data and sync sample to all additional headers
      const updatedHeadersData = itemFormData.additional_headers_data.map(header => ({
        ...header,
        sample: product.name,
      }));
      
      setItemFormData({
        ...itemFormData,
        product_id: productId,
        product_name: product.name,
        sample: product.name,
        price: product.price || 0,
        additional_headers_data: updatedHeadersData,
      });
    }
  };

  const handleAddItem = () => {
    if (!itemFormData.product_id || !itemFormData.client || !itemFormData.manufacturer || !itemFormData.batch) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate additional headers if any
    if (itemFormData.additional_report_headers > 0) {
      const incompleteHeaders = itemFormData.additional_headers_data.filter(
        (header) => !header.client || !header.manufacturer || !header.batch
      );
      if (incompleteHeaders.length > 0) {
        toast({
          title: "Incomplete headers",
          description: `Please fill in all fields for additional report headers`,
          variant: "destructive",
        });
        return;
      }
    }

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = {
        ...itemFormData,
        id: items[editingItemIndex].id,
      };
      setItems(updatedItems);
      setEditingItemIndex(null);
    } else {
      // Add new item
      const newItem: QuoteItem = {
        ...itemFormData,
        id: `temp-${Date.now()}`,
      };
      setItems([...items, newItem]);
    }
    
    resetItemForm();
    setShowAddItemDialog(false);
  };

  const handleEditItem = (index: number) => {
    const item = items[index];
    setItemFormData({ ...item });
    setEditingItemIndex(index);
    setShowAddItemDialog(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveAsDraft = async () => {
    if (!formData.lab_id) {
      toast({
        title: "Missing lab",
        description: "Please select a lab before saving",
        variant: "destructive",
      });
      return;
    }

    setSavingDraft(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      let targetQuoteId: string;

      if (isEditMode && quoteId) {
        // Update existing quote
        const { error: quoteError } = await supabase
          .from("quotes")
          .update({
            lab_id: formData.lab_id,
            quote_number: formData.quote_number || null,
            notes: formData.notes || null,
          })
          .eq("id", quoteId);

        if (quoteError) throw quoteError;
        targetQuoteId = quoteId;

        // Delete existing items and recreate them
        await supabase.from("quote_items").delete().eq("quote_id", quoteId);
      } else {
        // Create new quote
        const { data: newQuote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            lab_id: formData.lab_id,
            quote_number: formData.quote_number || null,
            notes: formData.notes || null,
            status: "draft",
            user_id: effectiveUserId,
          })
          .select()
          .single();

        if (quoteError) throw quoteError;
        targetQuoteId = newQuote.id;
      }

      // Create clients and manufacturers if they don't exist
      for (const item of items) {
        const existingClient = clients.find(
          (c) => c.name.toLowerCase() === item.client.toLowerCase()
        );
        if (!existingClient && item.client) {
          await supabase
            .from("clients")
            .insert([{ name: item.client, user_id: effectiveUserId }]);
        }

        const existingManufacturer = manufacturers.find(
          (m) => m.name.toLowerCase() === item.manufacturer.toLowerCase()
        );
        if (!existingManufacturer && item.manufacturer) {
          await supabase
            .from("manufacturers")
            .insert([{ name: item.manufacturer, user_id: effectiveUserId }]);
        }
      }

      // Create quote items if any
      if (items.length > 0) {
        const quoteItems = items.map((item) => ({
          quote_id: targetQuoteId,
          product_id: item.product_id,
          client: item.client,
          sample: item.sample,
          manufacturer: item.manufacturer,
          batch: item.batch,
          price: item.price,
          additional_samples: item.additional_samples || 0,
          additional_report_headers: item.additional_report_headers || 0,
          additional_headers_data: item.additional_headers_data || [],
          status: "pending",
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: targetQuoteId,
        user_id: user.id,
        activity_type: isEditMode ? "quote_updated" : "quote_created",
        description: isEditMode 
          ? `Quote draft updated${items.length > 0 ? ` with ${items.length} item(s)` : ""}`
          : `Quote saved as draft${items.length > 0 ? ` with ${items.length} item(s)` : ""}`,
        metadata: {
          lab_id: formData.lab_id,
          status: "draft",
          items_count: items.length,
        },
      });

      toast({ title: isEditMode ? "Quote updated" : "Quote saved as draft", duration: 3000 });
      navigate("/quotes");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const calculateItemTotal = (item: QuoteItem): number => {
    const basePrice = item.price || 0;
    const productName = item.product_name.toLowerCase();

    const qualifiesForAdditionalSamplePricing =
      productName.includes("tirzepatide") ||
      productName.includes("semaglutide") ||
      productName.includes("retatrutide");

    let total = basePrice;

    if (qualifiesForAdditionalSamplePricing && (item.additional_samples || 0) > 0) {
      total += (item.additional_samples || 0) * 60;
    }

    if ((item.additional_report_headers || 0) > 0) {
      total += (item.additional_report_headers || 0) * 30;
    }

    return total;
  };

  const getTotalQuoteValue = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleOpenEmailPreview = async () => {
    if (!formData.lab_id) {
      toast({
        title: "Missing lab",
        description: "Please select a lab",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one item to the quote",
        variant: "destructive",
      });
      return;
    }

    // Fetch lab email for preview
    const { data: labData } = await supabase
      .from("labs")
      .select("contact_email, name")
      .eq("id", formData.lab_id)
      .single();

    if (!labData?.contact_email) {
      toast({
        title: "Lab has no email",
        description: "This lab has no email configured. Please add one in lab settings.",
        variant: "destructive",
      });
      return;
    }

    setPreviewLabEmail(labData.contact_email);
    setPreviewLabName(labData.name);
    setShowEmailPreview(true);
  };

  const handleSubmitAndEmail = async () => {
    setShowEmailPreview(false);

    setSubmittingQuote(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      let targetQuoteId: string;

      if (isEditMode && quoteId) {
        // Update existing quote and change status to sent_to_vendor
        const { error: quoteError } = await supabase
          .from("quotes")
          .update({
            lab_id: formData.lab_id,
            quote_number: formData.quote_number || null,
            notes: formData.notes || null,
            status: "sent_to_vendor",
          })
          .eq("id", quoteId);

        if (quoteError) throw quoteError;
        targetQuoteId = quoteId;

        // Delete existing items and recreate them
        await supabase.from("quote_items").delete().eq("quote_id", quoteId);
      } else {
        // Create new quote with sent_to_vendor status
        const { data: newQuote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            lab_id: formData.lab_id,
            quote_number: formData.quote_number || null,
            notes: formData.notes || null,
            status: "sent_to_vendor",
            user_id: effectiveUserId,
          })
          .select()
          .single();

        if (quoteError) throw quoteError;
        targetQuoteId = newQuote.id;
      }

      // Create clients and manufacturers if they don't exist
      for (const item of items) {
        const existingClient = clients.find(
          (c) => c.name.toLowerCase() === item.client.toLowerCase()
        );
        if (!existingClient && item.client) {
          await supabase
            .from("clients")
            .insert([{ name: item.client, user_id: effectiveUserId }]);
        }

        const existingManufacturer = manufacturers.find(
          (m) => m.name.toLowerCase() === item.manufacturer.toLowerCase()
        );
        if (!existingManufacturer && item.manufacturer) {
          await supabase
            .from("manufacturers")
            .insert([{ name: item.manufacturer, user_id: effectiveUserId }]);
        }
      }

      // Create quote items
      const quoteItems = items.map((item) => ({
        quote_id: targetQuoteId,
        product_id: item.product_id,
        client: item.client,
        sample: item.sample,
        manufacturer: item.manufacturer,
        batch: item.batch,
        price: item.price,
        additional_samples: item.additional_samples || 0,
        additional_report_headers: item.additional_report_headers || 0,
        additional_headers_data: item.additional_headers_data || [],
        status: "pending",
      }));

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      // Get lab email for sending
      const { data: labData } = await supabase
        .from("labs")
        .select("contact_email, name")
        .eq("id", formData.lab_id)
        .single();

      if (!labData?.contact_email) {
        toast({
          title: "Quote saved",
          description: "Quote saved but lab has no email configured.",
          variant: "default",
        });
        triggerSuccessConfetti();
        navigate("/quotes");
        return;
      }

      // Calculate total value
      const totalValue = items.reduce((sum, item) => {
        let itemTotal = item.price || 0;
        const productName = item.product_name.toLowerCase();
        if (item.additional_samples > 0) {
          if (productName.includes('tirzepatide') || productName.includes('semaglutide') || productName.includes('retatrutide')) {
            itemTotal += item.additional_samples * 60;
          }
        }
        if (item.additional_report_headers > 0) {
          itemTotal += item.additional_report_headers * 30;
        }
        return sum + itemTotal;
      }, 0);

      // Build email payload
      const emailPayload = {
        quoteId: targetQuoteId,
        labEmail: labData.contact_email,
        labName: labData.name,
        quoteNumber: formData.quote_number || null,
        items: items.map(item => ({
          productName: item.product_name,
          client: item.client,
          sample: item.sample,
          manufacturer: item.manufacturer,
          batch: item.batch,
          price: item.price,
          additional_samples: item.additional_samples,
          additional_report_headers: item.additional_report_headers,
          additional_headers_data: item.additional_headers_data,
        })),
        notes: formData.notes || null,
        totalValue,
        confirmationUrl: `${window.location.origin}/quote-confirm/${targetQuoteId}`,
      };

      // Send email to lab
      const { error: emailError } = await supabase.functions.invoke("send-quote-email", {
        body: emailPayload,
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Still log success but notify about email issue
        toast({
          title: "Quote submitted",
          description: "Quote saved but email could not be sent. You can resend from the quotes page.",
          variant: "default",
          duration: 5000,
        });
      } else {
        toast({ title: "Quote submitted and sent to lab", duration: 3000 });
      }

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: targetQuoteId,
        user_id: user.id,
        activity_type: "quote_submitted",
        description: `Quote submitted and sent to lab with ${items.length} item(s)`,
        metadata: {
          lab_id: formData.lab_id,
          status: "sent_to_vendor",
          items_count: items.length,
        },
      });

      triggerSuccessConfetti();
      navigate("/quotes");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleAdditionalHeadersChange = (count: number) => {
    const newHeadersData = [...itemFormData.additional_headers_data];
    
    // Use the compound name as the sample for all headers
    const sampleName = itemFormData.product_name || itemFormData.sample;
    
    while (newHeadersData.length < count) {
      newHeadersData.push({ client: "", sample: sampleName, manufacturer: "", batch: "" });
    }
    while (newHeadersData.length > count) {
      newHeadersData.pop();
    }
    
    // Ensure all existing headers have the correct sample value
    newHeadersData.forEach((header) => {
      header.sample = sampleName;
    });

    setItemFormData({
      ...itemFormData,
      additional_report_headers: count,
      additional_headers_data: newHeadersData,
    });
  };

  const getSelectedLabName = () => {
    return labs.find(l => l.id === formData.lab_id)?.name || "";
  };

  const canProceedToStep2 = formData.lab_id !== "";
  const canProceedToStep3 = items.length > 0;

  if (loadingQuote) {
    return (
      <Layout>
        <div className="space-y-4 pb-24">
          {/* Header Skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>

          {/* Progress Skeleton */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <Skeleton key={s} className="h-2 flex-1 rounded-full" />
            ))}
          </div>

          {/* Card Skeleton */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step > 1 ? setStep(step - 1) : navigate("/quotes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{isEditMode ? "Edit Quote" : "Create Quote"}</h1>
            <p className="text-sm text-muted-foreground">
              Step {step} of 3 - {step === 1 ? "Quote Details" : step === 2 ? "Add Items" : "Review & Submit"}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step 1: Lab & Quote Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Quote Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lab_id">Select Lab *</Label>
                <Select
                  value={formData.lab_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, lab_id: value })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose a testing lab" />
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

              <div className="space-y-2">
                <Label htmlFor="quote_number">Internal Tracking Number</Label>
                <Input
                  id="quote_number"
                  value={formData.quote_number}
                  onChange={(e) =>
                    setFormData({ ...formData, quote_number: e.target.value })
                  }
                  placeholder="Your internal reference (optional)"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes for this quote (optional)"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={handleSaveAsDraft}
                  disabled={savingDraft || !canProceedToStep2}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingDraft ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  className="flex-1 h-12"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Next: Add Items
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Items */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Selected Lab Display */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Testing Lab</p>
                    <p className="font-semibold">{getSelectedLabName()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Quote Items ({items.length})</CardTitle>
                  <Button onClick={() => {
                    setEditingItemIndex(null);
                    resetItemForm();
                    setShowAddItemDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No items added yet</p>
                    <p className="text-sm">Click "Add Item" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <QuoteItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onEdit={handleEditItem}
                        onRemove={handleRemoveItem}
                        calculateItemTotal={calculateItemTotal}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="h-12">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveAsDraft}
                disabled={savingDraft}
                className="h-12"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingDraft ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                className="flex-1 h-12"
              >
                Review Quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review Quote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quote Info */}
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lab</span>
                    <span className="font-medium">{getSelectedLabName()}</span>
                  </div>
                  {formData.quote_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Internal #</span>
                      <span className="font-medium">{formData.quote_number}</span>
                    </div>
                  )}
                  {formData.notes && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="text-sm mt-1">{formData.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <h3 className="font-medium">Items ({items.length})</h3>
                  {items.map((item) => (
                    <ReviewItemRow
                      key={item.id}
                      item={item}
                      calculateItemTotal={calculateItemTotal}
                    />
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-lg font-semibold">Quote Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ${getTotalQuoteValue().toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="h-12">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={savingDraft || submittingQuote}
                className="flex-1 h-12"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingDraft ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={handleOpenEmailPreview}
                disabled={submittingQuote || savingDraft}
                className="flex-1 h-12"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit Quote
              </Button>
            </div>
          </div>
        )}

        {/* Add/Edit Item Dialog */}
        <Dialog open={showAddItemDialog} onOpenChange={(open) => {
          setShowAddItemDialog(open);
          if (!open) {
            setEditingItemIndex(null);
            resetItemForm();
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItemIndex !== null ? "Edit Item" : "Add Item"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Compound *</Label>
                <Select
                  value={itemFormData.product_id}
                  onValueChange={handleProductChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select compound" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ${product.price?.toFixed(2)}
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
                      className="w-full justify-between"
                    >
                      {itemFormData.client || "Select or type client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type client..."
                        value={itemFormData.client}
                        onValueChange={(value) =>
                          setItemFormData({ ...itemFormData, client: value })
                        }
                      />
                      <CommandList>
                        <CommandEmpty>
                          Press Enter to use "{itemFormData.client}"
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

              <div className="space-y-2">
                <Label>Manufacturer *</Label>
                <Popover open={manufacturerOpen} onOpenChange={setManufacturerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {itemFormData.manufacturer || "Select or type manufacturer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type manufacturer..."
                        value={itemFormData.manufacturer}
                        onValueChange={(value) =>
                          setItemFormData({ ...itemFormData, manufacturer: value })
                        }
                      />
                      <CommandList>
                        <CommandEmpty>
                          Press Enter to use "{itemFormData.manufacturer}"
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
                />
              </div>

              {/* Additional Samples Checkbox */}
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_additional_samples"
                    checked={itemFormData.has_additional_samples}
                    onCheckedChange={(checked) =>
                      setItemFormData({
                        ...itemFormData,
                        has_additional_samples: !!checked,
                        additional_samples: checked ? (itemFormData.additional_samples || 1) : 0,
                      })
                    }
                  />
                  <Label htmlFor="has_additional_samples" className="text-sm font-medium">
                    Additional samples for variance testing
                  </Label>
                </div>
                
                {itemFormData.has_additional_samples && (
                  <div className="pl-6 space-y-2">
                    <Label className="text-sm text-muted-foreground">Number of additional samples</Label>
                    <Select
                      value={itemFormData.additional_samples.toString()}
                      onValueChange={(value) =>
                        setItemFormData({ ...itemFormData, additional_samples: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      $60 per additional sample for Tirzepatide, Semaglutide, Retatrutide
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Report Headers Checkbox */}
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_additional_headers"
                    checked={itemFormData.additional_report_headers > 0}
                    onCheckedChange={(checked) =>
                      handleAdditionalHeadersChange(checked ? 1 : 0)
                    }
                  />
                  <Label htmlFor="has_additional_headers" className="text-sm font-medium">
                    Additional report headers
                  </Label>
                </div>
                
                {itemFormData.additional_report_headers > 0 && (
                  <div className="pl-6 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Number of additional headers</Label>
                      <Select
                        value={itemFormData.additional_report_headers.toString()}
                        onValueChange={(value) => handleAdditionalHeadersChange(parseInt(value))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">$30 per additional header</p>
                    </div>

                    {/* Header Details */}
                    {itemFormData.additional_headers_data.map((header, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                        <p className="text-sm font-medium">Header {index + 1}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Client Dropdown */}
                          <Popover open={headerClientOpen === index} onOpenChange={(open) => setHeaderClientOpen(open ? index : null)}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-9 text-sm"
                              >
                                <span className="truncate">{header.client || "Client..."}</span>
                                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search or type..."
                                  value={header.client}
                                  onValueChange={(value) => {
                                    const newData = [...itemFormData.additional_headers_data];
                                    newData[index].client = value;
                                    setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>Press Enter to use "{header.client}"</CommandEmpty>
                                  <CommandGroup>
                                    {clients.map((client) => (
                                      <CommandItem
                                        key={client.id}
                                        value={client.name}
                                        onSelect={() => {
                                          const newData = [...itemFormData.additional_headers_data];
                                          newData[index].client = client.name;
                                          setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                          setHeaderClientOpen(null);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", header.client === client.name ? "opacity-100" : "opacity-0")} />
                                        {client.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Sample (read-only) */}
                          <Input
                            placeholder="Sample"
                            value={header.sample || itemFormData.sample || itemFormData.product_name}
                            readOnly
                            className="bg-muted cursor-not-allowed h-9 text-sm"
                          />
                          
                          {/* Manufacturer Dropdown */}
                          <Popover open={headerManufacturerOpen === index} onOpenChange={(open) => setHeaderManufacturerOpen(open ? index : null)}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-9 text-sm"
                              >
                                <span className="truncate">{header.manufacturer || "Manufacturer..."}</span>
                                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search or type..."
                                  value={header.manufacturer}
                                  onValueChange={(value) => {
                                    const newData = [...itemFormData.additional_headers_data];
                                    newData[index].manufacturer = value;
                                    setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>Press Enter to use "{header.manufacturer}"</CommandEmpty>
                                  <CommandGroup>
                                    {manufacturers.map((manufacturer) => (
                                      <CommandItem
                                        key={manufacturer.id}
                                        value={manufacturer.name}
                                        onSelect={() => {
                                          const newData = [...itemFormData.additional_headers_data];
                                          newData[index].manufacturer = manufacturer.name;
                                          setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                          setHeaderManufacturerOpen(null);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", header.manufacturer === manufacturer.name ? "opacity-100" : "opacity-0")} />
                                        {manufacturer.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Batch */}
                          <Input
                            placeholder="Batch"
                            value={header.batch}
                            onChange={(e) => {
                              const newData = [...itemFormData.additional_headers_data];
                              newData[index].batch = e.target.value;
                              setItemFormData({ ...itemFormData, additional_headers_data: newData });
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Preview */}
              {itemFormData.product_id && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Base Price</span>
                    <span>${itemFormData.price.toFixed(2)}</span>
                  </div>
                  {itemFormData.has_additional_samples && itemFormData.additional_samples > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Additional Samples</span>
                      <span>${(itemFormData.additional_samples * 60).toFixed(2)}</span>
                    </div>
                  )}
                  {itemFormData.additional_report_headers > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Additional Headers</span>
                      <span>${(itemFormData.additional_report_headers * 30).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t mt-2">
                    <span>Total</span>
                    <span className="text-primary">${calculateItemTotal(itemFormData).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddItemDialog(false);
                    setEditingItemIndex(null);
                    resetItemForm();
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddItem}>
                  {editingItemIndex !== null ? "Update Item" : "Add Item"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <QuoteEmailPreviewDialog
          open={showEmailPreview}
          onOpenChange={setShowEmailPreview}
          onConfirm={handleSubmitAndEmail}
          labName={previewLabName}
          labEmail={previewLabEmail}
          quoteNumber={formData.quote_number}
          items={items}
          notes={formData.notes}
          isSubmitting={submittingQuote}
        />
      </div>
    </Layout>
  );
};

export default QuoteCreate;
