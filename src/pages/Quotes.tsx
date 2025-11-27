import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, FileText, Check, ChevronsUpDown, Mail, Copy, RefreshCw, Upload, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  tracking_updated_at: string | null;
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
  products: { name: string; price: number | null };
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
  price: number | null;
  vendor: string | null;
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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [testingTypes, setTestingTypes] = useState<TestingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    lab_id: "",
    quote_number: "",
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
    fetchQuotes();
    fetchProducts();
    fetchLabs();
    fetchClients();
    fetchManufacturers();
    fetchTestingTypes();
  }, []);

  // Auto-refresh stale tracking data (older than 4 hours)
  useEffect(() => {
    const checkAndRefreshStaleTracking = async () => {
      const staleQuotes = quotes.filter(quote => {
        if (!quote.tracking_number || quote.status === 'delivered') return false;
        
        if (!quote.tracking_updated_at) return true; // Never updated
        
        const hoursSinceUpdate = (Date.now() - new Date(quote.tracking_updated_at).getTime()) / (1000 * 60 * 60);
        return hoursSinceUpdate > 4; // Stale if older than 4 hours
      });

      if (staleQuotes.length > 0) {
        console.log(`Auto-refreshing ${staleQuotes.length} stale tracking records`);
        
        for (const quote of staleQuotes) {
          try {
            await supabase.functions.invoke("update-ups-tracking", {
              body: { trackingNumber: quote.tracking_number }
            });
          } catch (error) {
            console.error(`Failed to auto-refresh tracking for ${quote.tracking_number}:`, error);
          }
        }
        
        // Refresh quotes after updates
        setTimeout(() => fetchQuotes(), 2000);
      }
    };

    if (quotes.length > 0) {
      checkAndRefreshStaleTracking();
    }

    // Check every 5 minutes
    const interval = setInterval(checkAndRefreshStaleTracking, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [quotes]);

  const fetchQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quotes")
        .select("*, labs(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchLabs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setLabs(data || []);
    } catch (error: any) {
      console.error("Error fetching labs:", error);
    }
  };

  const fetchTestingTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, vendor, standard, duration_days")
        .eq("user_id", user.id);

      if (error) throw error;
      setTestingTypes(data || []);
    } catch (error: any) {
      console.error("Error fetching testing types:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setManufacturers(data || []);
    } catch (error: any) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, price)")
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

  const resetForm = () => {
    setFormData({
      lab_id: "",
      quote_number: "",
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

      const payload = {
        ...formData,
        status: updatedStatus,
        user_id: user.id,
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
        const { error } = await supabase
          .from("quotes")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        
        if (updatedStatus === "in_transit" && updatedStatus !== formData.status) {
          toast({ 
            title: "Quote updated successfully",
            description: "Status automatically changed to 'In Transit'"
          });
        } else {
          toast({ title: "Quote updated successfully" });
        }
      } else {
        const { error } = await supabase.from("quotes").insert([payload]);
        if (error) throw error;
        toast({ title: "Quote created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (quote: Quote) => {
    setFormData({
      lab_id: quote.lab_id,
      quote_number: quote.quote_number || "",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;

    try {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Quote deleted successfully" });
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    fetchQuoteItems(quote.id);
    fetchTrackingHistory(quote.id);
    setViewDialogOpen(true);
  };

  const handleManageItems = (quote: Quote) => {
    setSelectedQuote(quote);
    fetchQuoteItems(quote.id);
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create client if it doesn't exist
      let clientName = itemFormData.client;
      const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (!existingClient && clientName) {
        const { error } = await supabase
          .from("clients")
          .insert([{ name: clientName, user_id: user.id }]);
        if (!error) {
          await fetchClients(); // Refresh clients list
        }
      }

      // Create manufacturer if it doesn't exist
      let manufacturerName = itemFormData.manufacturer;
      const existingManufacturer = manufacturers.find(m => m.name.toLowerCase() === manufacturerName.toLowerCase());
      if (!existingManufacturer && manufacturerName) {
        const { error } = await supabase
          .from("manufacturers")
          .insert([{ name: manufacturerName, user_id: user.id }]);
        if (!error) {
          await fetchManufacturers(); // Refresh manufacturers list
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
        toast({ title: "Item updated successfully" });
      } else {
        // Add new item
        const { error } = await supabase.from("quote_items").insert([payload]);
        if (error) throw error;
        toast({ title: "Item added successfully" });
      }

      resetItemForm();
      fetchQuoteItems(selectedQuote.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
      toast({ title: "Item deleted successfully" });
      if (selectedQuote) fetchQuoteItems(selectedQuote.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleSendEmail = async () => {
    if (!selectedQuote) return;
    
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
      });
      return;
    }

    try {
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
        })),
        notes: selectedQuote.notes,
        totalValue: totalQuoteValue,
      };

      toast({
        title: "Sending email...",
        description: "Please wait while we send the quote to the vendor.",
      });

      const { error } = await supabase.functions.invoke('send-quote-email', {
        body: emailPayload,
      });

      if (error) throw error;

      // Update quote status to 'sent_to_vendor'
      await supabase
        .from("quotes")
        .update({ status: "sent_to_vendor" })
        .eq("id", selectedQuote.id);

      toast({
        title: "Email sent successfully",
        description: `Quote has been sent to ${lab.name}`,
      });

      // Refresh quotes list and update selectedQuote
      await fetchQuotes();
      
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
      });
    }
  };

  const handleRefreshTracking = async (trackingNumber: string) => {
    try {
      toast({
        title: "Refreshing tracking...",
        description: "Fetching latest UPS tracking data",
      });

      const { data, error } = await supabase.functions.invoke("update-ups-tracking", {
        body: { trackingNumber }
      });

      if (error) throw error;

      if (data.results?.[0]?.success) {
        const result = data.results[0];
        if (result.newStatus) {
          toast({
            title: "Tracking updated",
            description: `Status changed from ${result.oldStatus} to ${result.newStatus}`,
          });
        } else {
          toast({
            title: "Tracking refreshed",
            description: result.message || "Status unchanged",
          });
        }
        fetchQuotes();
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
      });
    }
  };

  const handleProductChange = (productId: string) => {
    setItemFormData((prev) => ({ ...prev, product_id: productId }));
    const product = testingTypes.find((t) => t.id === productId);
    if (product) {
      setItemFormData((prev) => ({
        ...prev,
        price: product.price?.toString() || "",
        sample: product.name, // Auto-populate sample with product name
        additional_headers_data: prev.additional_headers_data.map(header => ({
          ...header,
          sample: product.name,
        })),
      }));
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground">
              Manage testing quotes and generate test records
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Quote" : "New Quote"}
                </DialogTitle>
                <DialogDescription>
                  Create a quote for testing services
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="quote_number">Quote Number</Label>
                    <Input
                      id="quote_number"
                      value={formData.quote_number}
                      onChange={(e) =>
                        setFormData({ ...formData, quote_number: e.target.value })
                      }
                      placeholder="Enter or leave blank for auto-generation"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="payment_pending">Payment Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
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
                <div className="space-y-2">
                  <Label htmlFor="tracking_number">Tracking Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tracking_number"
                      value={formData.tracking_number}
                      onChange={(e) =>
                        setFormData({ ...formData, tracking_number: e.target.value })
                      }
                      placeholder="Enter tracking number"
                      className="flex-1"
                    />
                    {editingId && formData.tracking_number && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRefreshTracking(formData.tracking_number)}
                        title="Refresh UPS tracking"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Payment Information */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-medium text-sm">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_status">Payment Status</Label>
                      <Select
                        value={formData.payment_status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, payment_status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid_usd">Paid (USD)</SelectItem>
                          <SelectItem value="paid_crypto">Paid (Crypto)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_date">Payment Date</Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) =>
                          setFormData({ ...formData, payment_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_amount_usd">Amount (USD)</Label>
                      <Input
                        id="payment_amount_usd"
                        type="number"
                        step="0.01"
                        value={formData.payment_amount_usd}
                        onChange={(e) =>
                          setFormData({ ...formData, payment_amount_usd: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_amount_crypto">Amount (Crypto)</Label>
                      <Input
                        id="payment_amount_crypto"
                        value={formData.payment_amount_crypto}
                        onChange={(e) =>
                          setFormData({ ...formData, payment_amount_crypto: e.target.value })
                        }
                        placeholder="e.g., 0.5 BTC"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">Transaction ID (for crypto)</Label>
                    <Input
                      id="transaction_id"
                      value={formData.transaction_id}
                      onChange={(e) =>
                        setFormData({ ...formData, transaction_id: e.target.value })
                      }
                      placeholder="Blockchain transaction ID"
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
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No quotes yet. Create your first quote to get started.
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      {quote.quote_number || "—"}
                    </TableCell>
                    <TableCell>{quote.labs.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span>{quote.tracking_number || "—"}</span>
                          {quote.tracking_number && quote.tracking_updated_at && (
                            <span className="text-xs text-muted-foreground">
                              Updated: {new Date(quote.tracking_updated_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {quote.tracking_number && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRefreshTracking(quote.tracking_number!)}
                            title="Refresh UPS tracking"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(quote.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(quote)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageItems(quote)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quote)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(quote.id)}
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
                    <p className="font-medium">
                      {selectedQuote.quote_number || "Not assigned"}
                    </p>
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
                  <Button
                    variant="outline"
                    onClick={handleSendEmail}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send to Vendor
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Items Dialog */}
        <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Quote Items</DialogTitle>
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
                    <Label>Product *</Label>
                    <Select
                      value={itemFormData.product_id}
                      onValueChange={handleProductChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
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
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemFormData.price}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, price: e.target.value })
                      }
                      placeholder="0.00"
                    />
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
                <Label>Current Items</Label>
                <div className="border rounded-lg mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Submission Info</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground"
                          >
                            No items added yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        quoteItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.products.name}</TableCell>
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
      </div>
    </Layout>
  );
};

export default Quotes;