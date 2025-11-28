import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { EmailHistoryDialog } from "@/components/EmailHistoryDialog";
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
import { Plus, Pencil, Trash2, Eye, FileText, Check, ChevronsUpDown, Mail, Copy, RefreshCw, Upload, X, Save, FolderOpen, Download, History, Search, Filter, LayoutGrid, Table as TableIcon, Lock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { QuoteKanbanBoard } from "@/components/QuoteKanbanBoard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { z } from "zod";

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

  // Helper function to check if quote is locked (paid or later status)
  const isQuoteLocked = (status: string) => {
    const lockedStatuses = ['paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
    return lockedStatuses.includes(status);
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLab, setFilterLab] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterLockStatus, setFilterLockStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const { toast } = useToast();

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
    fetchTemplates();
    fetchEmailTemplates();
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

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quote_templates")
        .select("*")
        .order("created_at", { ascending: false });

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

      const { error } = await supabase
        .from("quote_templates")
        .insert({
          user_id: user.id,
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

  const handleExportPDF = (quote: any) => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(18);
    doc.text("Quote Details", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Quote Number: ${quote.quote_number || 'N/A'}`, 14, 30);
    doc.text(`Status: ${quote.status}`, 14, 37);
    doc.text(`Lab: ${quote.labs?.name || 'N/A'}`, 14, 44);
    
    if (quote.notes) {
      doc.text(`Notes: ${quote.notes}`, 14, 51);
    }
    
    // Add items table
    const tableData = quote.quote_items?.map((item: any) => [
      item.products?.name || 'N/A',
      item.client || '-',
      item.sample || '-',
      item.manufacturer || '-',
      item.batch || '-',
      `$${(item.price || 0).toFixed(2)}`,
      item.additional_samples || 0,
      item.additional_report_headers || 0,
    ]) || [];
    
    autoTable(doc, {
      startY: 60,
      head: [['Product', 'Client', 'Sample', 'Manufacturer', 'Batch', 'Price', 'Add. Samples', 'Add. Headers']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });
    
    doc.save(`quote-${quote.quote_number || quote.id}.pdf`);
    
    toast({
      title: "Success",
      description: "Quote exported as PDF",
    });
  };

  const handleExportExcel = (quote: any) => {
    const ws_data = [
      ['Quote Details'],
      [],
      ['Quote Number', quote.quote_number || 'N/A'],
      ['Status', quote.status],
      ['Lab', quote.labs?.name || 'N/A'],
      ['Notes', quote.notes || ''],
      [],
      ['Items'],
      ['Product', 'Client', 'Sample', 'Manufacturer', 'Batch', 'Price', 'Additional Samples', 'Additional Report Headers', 'Status'],
    ];
    
    quote.quote_items?.forEach((item: any) => {
      ws_data.push([
        item.products?.name || 'N/A',
        item.client || '-',
        item.sample || '-',
        item.manufacturer || '-',
        item.batch || '-',
        item.price || 0,
        item.additional_samples || 0,
        item.additional_report_headers || 0,
        item.status || 'pending',
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quote");
    
    XLSX.writeFile(wb, `quote-${quote.quote_number || quote.id}.xlsx`);
    
    toast({
      title: "Success",
      description: "Quote exported as Excel",
    });
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
    
    // Prevent sending locked quotes
    if (isQuoteLocked(selectedQuote.status)) {
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
    const itemsHtml = items.map((item, index) => {
      const productName = item.products.name.toLowerCase();
      const qualifiesForAdditionalSamplePricing = 
        productName.includes("tirzepatide") || 
        productName.includes("semaglutide") || 
        productName.includes("retatrutide");

      let itemHtml = 
        `<div style="margin-bottom: 15px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px;">` +
        `<strong>${index + 1}. ${item.products.name}</strong> - $${(item.price || 0).toFixed(2)}<br/>` +
        `<div style="margin-top: 8px; color: #6b7280; font-size: 0.9em;">` +
        `Client: ${item.client || "—"}<br/>` +
        `Sample: ${item.sample || "—"}<br/>` +
        `Manufacturer: ${item.manufacturer || "—"}<br/>` +
        `Batch: ${item.batch || "—"}` +
        `</div>`;

      if ((item.additional_samples || 0) > 0 && qualifiesForAdditionalSamplePricing) {
        itemHtml += 
          `<div style="margin-top: 8px; padding: 8px; background-color: #f9fafb; border-radius: 4px;">` +
          `Additional Samples: ${item.additional_samples} × $60 = $${((item.additional_samples || 0) * 60).toFixed(2)}` +
          `</div>`;
      }

      if ((item.additional_report_headers || 0) > 0) {
        itemHtml += 
          `<div style="margin-top: 8px; padding: 8px; background-color: #fefce8; border-radius: 4px;">` +
          `<strong>Additional Report Headers:</strong> ${item.additional_report_headers} × $30 = $${((item.additional_report_headers || 0) * 30).toFixed(2)}<br/>`;
        
        if (item.additional_headers_data && item.additional_headers_data.length > 0) {
          item.additional_headers_data.forEach((header, idx) => {
            itemHtml += 
              `<div style="margin-left: 16px; margin-top: 4px; font-size: 0.85em;">` +
              `Header #${idx + 1}: ${header.client} / ${header.sample} / ${header.manufacturer} / ${header.batch}` +
              `</div>`;
          });
        }
        itemHtml += `</div>`;
      }

      itemHtml += `</div>`;
      return itemHtml;
    }).join("");

    let subject: string;
    let html: string;

    if (emailTemplate) {
      subject = emailTemplate.subject
        .replace(/\{\{quote_number\}\}/g, quoteNumber)
        .replace(/\{\{lab_name\}\}/g, labName);

      html = 
        `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>` +
        `<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">` +
        `<div>${emailTemplate.body
          .replace(/\{\{lab_name\}\}/g, labName)
          .replace(/\{\{quote_number\}\}/g, quoteNumber)
          .replace(/\{\{quote_items\}\}/g, itemsHtml)
          .replace(/\{\{total\}\}/g, `$${totalQuoteValue.toFixed(2)}`)
        }</div>` +
        (notes ? `<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;"><strong>Additional Notes:</strong><br/>${notes}</div>` : "") +
        `</body></html>`;
    } else {
      subject = `Testing Quote Request ${quoteNumber ? `#${quoteNumber}` : ""}`;
      html = 
        `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>` +
        `<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">` +
        `<h1 style="color: #111827;">Testing Quote Request</h1>` +
        `<p style="color: #6b7280;">Quote Number: ${quoteNumber}</p>` +
        `<p>Dear ${labName},</p>` +
        `<p>Please review the following quote request for testing services:</p>` +
        itemsHtml +
        `<div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px; font-size: 1.25em; font-weight: bold; text-align: right;">` +
        `Total Quote Value: $${totalQuoteValue.toFixed(2)}</div>` +
        (notes ? `<div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px;"><strong>Additional Notes:</strong><br/>${notes}</div>` : "") +
        `<div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb;">` +
        `<p><strong>Next Steps:</strong></p>` +
        `<ul style="color: #6b7280;">` +
        `<li>Please review the quote details above</li>` +
        `<li>Confirm pricing and availability</li>` +
        `<li>Provide a quote number if needed</li>` +
        `<li>Respond with any questions or concerns</li>` +
        `</ul>` +
        `<p style="margin-top: 20px;">Thank you for your service!</p>` +
        `</div></body></html>`;
    }

    return { subject, html };
  };

  const confirmSendEmail = async () => {
    if (!selectedQuote) return;
    
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
        await supabase.from("email_history").insert({
          user_id: user.id,
          quote_id: selectedQuote.id,
          lab_id: selectedQuote.lab_id,
          recipient_email: labData.contact_email,
          subject: emailPreviewData.subject,
          body: emailPreviewData.html,
          template_id: selectedEmailTemplate || null,
          status: "sent",
        });
      }

      // Update quote status to "sent_to_vendor"
      await supabase
        .from("quotes")
        .update({ status: "sent_to_vendor" })
        .eq("id", selectedQuote.id);

      toast({
        title: "Email sent successfully",
        description: `Quote has been sent to ${lab.name}`,
      });

      setEmailPreviewOpen(false);

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
    } finally {
      setIsSendingEmail(false);
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
                  <Button type="submit">
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Mode Toggle and Search/Filter Controls */}
        <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Table View
                  </Button>
                  <Button
                    variant={viewMode === "kanban" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Kanban View
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <Label htmlFor="search">Search Quotes</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by quote number, notes, or tracking..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-8"
                      maxLength={200}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:w-auto">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
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
                    <Label>Lab</Label>
                    <Select value={filterLab} onValueChange={setFilterLab}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Labs</SelectItem>
                        {labs.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select value={filterProduct} onValueChange={setFilterProduct}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lock Status</Label>
                    <Select value={filterLockStatus} onValueChange={setFilterLockStatus}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quotes</SelectItem>
                        <SelectItem value="locked">Locked (Paid+)</SelectItem>
                        <SelectItem value="unlocked">Unlocked (Pre-Payment)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(searchQuery || filterStatus !== "all" || filterLab !== "all" || filterProduct !== "all" || filterLockStatus !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                      setFilterLab("all");
                      setFilterProduct("all");
                      setFilterLockStatus("all");
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {viewMode === "table" ? (
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
              {(() => {
                // Apply filters
                let filteredQuotes = quotes;

                // Search filter
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  filteredQuotes = filteredQuotes.filter(
                    (quote) =>
                      quote.quote_number?.toLowerCase().includes(query) ||
                      quote.notes?.toLowerCase().includes(query) ||
                      quote.tracking_number?.toLowerCase().includes(query) ||
                      quote.labs.name.toLowerCase().includes(query)
                  );
                }

                // Status filter
                if (filterStatus !== "all") {
                  filteredQuotes = filteredQuotes.filter(
                    (quote) => quote.status === filterStatus
                  );
                }

                // Lab filter
                if (filterLab !== "all") {
                  filteredQuotes = filteredQuotes.filter(
                    (quote) => quote.lab_id === filterLab
                  );
                }

                // Lock status filter
                if (filterLockStatus !== "all") {
                  filteredQuotes = filteredQuotes.filter(
                    (quote) => {
                      const locked = isQuoteLocked(quote.status);
                      return filterLockStatus === "locked" ? locked : !locked;
                    }
                  );
                }

                // Note: Product filter would require pre-fetching quote items
                // For now, it's available in the UI but needs server-side implementation
                // to work efficiently with large datasets

                return filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {quotes.length === 0
                        ? "No quotes yet. Create your first quote to get started."
                        : "No quotes match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isQuoteLocked(quote.status) && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        {quote.quote_number || "—"}
                      </div>
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
                          disabled={isQuoteLocked(quote.status)}
                          title={isQuoteLocked(quote.status) ? "Cannot modify items in paid quotes" : "Manage items"}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quote)}
                          disabled={isQuoteLocked(quote.status)}
                          title={isQuoteLocked(quote.status) ? "Cannot edit paid quotes" : "Edit quote"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExportPDF(quote)}
                          title="Export as PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExportExcel(quote)}
                          title="Export as Excel"
                        >
                          <FileText className="h-4 w-4" />
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
                  );
              })()}
            </TableBody>
          </Table>
        </div>
            ) : (
              <QuoteKanbanBoard
                quotes={(() => {
                  let filteredQuotes = quotes;

                  if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    filteredQuotes = filteredQuotes.filter(
                      (quote) =>
                        quote.quote_number?.toLowerCase().includes(query) ||
                        quote.notes?.toLowerCase().includes(query) ||
                        quote.tracking_number?.toLowerCase().includes(query) ||
                        quote.labs.name.toLowerCase().includes(query)
                    );
                  }

                  if (filterStatus !== "all") {
                    filteredQuotes = filteredQuotes.filter(
                      (quote) => quote.status === filterStatus
                    );
                  }

                  if (filterLab !== "all") {
                    filteredQuotes = filteredQuotes.filter(
                      (quote) => quote.lab_id === filterLab
                    );
                  }

                  if (filterLockStatus !== "all") {
                    filteredQuotes = filteredQuotes.filter(
                      (quote) => {
                        const locked = isQuoteLocked(quote.status);
                        return filterLockStatus === "locked" ? locked : !locked;
                      }
                    );
                  }

                  return filteredQuotes;
                })()}
                onStatusUpdate={async (quoteId, newStatus) => {
                  try {
                    const { error } = await supabase
                      .from("quotes")
                      .update({ status: newStatus })
                      .eq("id", quoteId);

                    if (error) throw error;

                    toast({
                      title: "Success",
                      description: "Quote status updated",
                    });

                    fetchQuotes();
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
                onViewQuote={(quote) => {
                  setSelectedQuote(quote);
                  fetchQuoteItems(quote.id);
                  fetchTrackingHistory(quote.id);
                  setViewDialogOpen(true);
                }}
                onEditQuote={(quote) => {
                  if (isQuoteLocked(quote.status)) {
                    toast({
                      title: "Cannot Edit",
                      description: "Quotes cannot be edited after payment",
                      variant: "destructive",
                    });
                    return;
                  }
                  setEditingId(quote.id);
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
                  fetchQuoteItems(quote.id);
                  setDialogOpen(true);
                }}
                onManageItems={(quote) => {
                  if (isQuoteLocked(quote.status)) {
                    toast({
                      title: "Cannot Modify Items",
                      description: "Quote items cannot be modified after payment",
                      variant: "destructive",
                    });
                    return;
                  }
                  setSelectedQuote(quote);
                  fetchQuoteItems(quote.id);
                  setItemsDialogOpen(true);
                }}
              />
            )}

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
                    onClick={() => setEmailHistoryOpen(true)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Email History
                  </Button>
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
                  <Button
                    variant="outline"
                    onClick={handleSendEmail}
                    disabled={selectedQuote && isQuoteLocked(selectedQuote.status)}
                    title={selectedQuote && isQuoteLocked(selectedQuote.status) ? "Cannot send paid quotes to vendor" : "Send quote to vendor"}
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
                                    <Download className="h-3 w-3" />
                                    Download File
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
      </div>
    </Layout>
  );
};

export default Quotes;