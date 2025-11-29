import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, DollarSign, Wand2, Edit, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Upload, Download, Eye, Check, ChevronsUpDown } from "lucide-react";
import { VendorPricingDialog } from "@/components/VendorPricingDialog";
import { BulkVendorPricingWizard } from "@/components/BulkVendorPricingWizard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCategoryColors } from "@/lib/categoryColors";
import { cn } from "@/lib/utils";

interface Compound {
  id: string;
  name: string;
  description: string | null;
  standard: string | null;
  duration_days: number | null;
  category: string | null;
  aliases: string[] | null;
}

interface ImportCompound {
  compound: string;
  aliases: string[];
  category: string;
  usd: number;
}

const Compounds = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCompound, setEditingCompound] = useState<Compound | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState<{ id: string; name: string } | null>(null);
  const [bulkPricingWizardOpen, setBulkPricingWizardOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    standard: "",
    duration_days: "",
    description: "",
    category: "",
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importLabId, setImportLabId] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [labs, setLabs] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    standard: "",
    duration_days: "",
    category: "",
  });
  
  // Filtering and Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "standard" | "duration">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState("");

  const fetchCompounds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching compounds",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCompounds(data || []);
    }
  };

  const fetchLabs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("labs")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      toast({
        title: "Error fetching labs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLabs(data || []);
      if (data && data.length > 0) {
        setImportLabId(data[0].id);
      }
    }
  };

  useEffect(() => {
    fetchCompounds();
    fetchLabs();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      standard: "",
      duration_days: "",
      category: "",
    });
    setEditingCompound(null);
    setCategoryComboOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const submitData = {
      ...formData,
      duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
    };

    if (editingCompound) {
      const { error } = await supabase
        .from("products")
        .update(submitData)
        .eq("id", editingCompound.id);

      if (error) {
        toast({
          title: "Error updating compound",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Compound updated successfully" });
        setOpen(false);
        resetForm();
        fetchCompounds();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert([{ ...submitData, user_id: user.id }]);

      if (error) {
        toast({
          title: "Error creating compound",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Compound created successfully" });
        setOpen(false);
        resetForm();
        fetchCompounds();
      }
    }
  };

  const handleEdit = (compound: Compound) => {
    setEditingCompound(compound);
    setFormData({
      name: compound.name,
      description: compound.description || "",
      standard: compound.standard || "",
      duration_days: compound.duration_days?.toString() || "",
      category: compound.category || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this compound?")) return;

    // Check if compound is used in any quotes
    const { data: quoteItems, error: checkError } = await supabase
      .from("quote_items")
      .select("id")
      .eq("product_id", id)
      .limit(1);

    if (checkError) {
      toast({
        title: "Error checking compound usage",
        description: checkError.message,
        variant: "destructive",
      });
      return;
    }

    if (quoteItems && quoteItems.length > 0) {
      toast({
        title: "Cannot delete compound",
        description: "This compound is currently used in existing quotes and cannot be deleted. Remove it from all quotes first.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting compound",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Compound deleted successfully" });
      fetchCompounds();
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedCompounds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedCompounds.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} compound(s)?`)) return;

    // Check if any compounds are used in quotes
    const { data: quoteItems, error: checkError } = await supabase
      .from("quote_items")
      .select("product_id")
      .in("product_id", Array.from(selectedIds));

    if (checkError) {
      toast({
        title: "Error checking compound usage",
        description: checkError.message,
        variant: "destructive",
      });
      return;
    }

    if (quoteItems && quoteItems.length > 0) {
      const usedIds = new Set(quoteItems.map(item => item.product_id));
      const unusedIds = Array.from(selectedIds).filter(id => !usedIds.has(id));
      
      if (unusedIds.length === 0) {
        toast({
          title: "Cannot delete compounds",
          description: "All selected compounds are currently used in existing quotes and cannot be deleted.",
          variant: "destructive",
        });
        return;
      }

      // Partial deletion: delete only unused compounds
      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", unusedIds);

      if (error) {
        toast({
          title: "Error deleting compounds",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Partial deletion completed",
          description: `${unusedIds.length} of ${selectedIds.size} compound(s) deleted. ${usedIds.size} compound(s) are used in quotes and were skipped.`,
        });
        setSelectedIds(new Set());
        fetchCompounds();
      }
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Error deleting compounds",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `${selectedIds.size} compound(s) deleted successfully` });
      setSelectedIds(new Set());
      fetchCompounds();
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;

    const updateData: any = {};
    if (bulkUpdateData.standard) updateData.standard = bulkUpdateData.standard;
    if (bulkUpdateData.duration_days) updateData.duration_days = parseInt(bulkUpdateData.duration_days);
    if (bulkUpdateData.description) updateData.description = bulkUpdateData.description;
    if (bulkUpdateData.category && bulkUpdateData.category !== "__keep_existing__") updateData.category = bulkUpdateData.category;

    if (Object.keys(updateData).length === 0) {
      toast({
        title: "No updates",
        description: "Please enter at least one field to update",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("products")
      .update(updateData)
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Error updating compounds",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `${selectedIds.size} compound(s) updated successfully` });
      setBulkUpdateOpen(false);
      setBulkUpdateData({ standard: "", duration_days: "", description: "", category: "" });
      setSelectedIds(new Set());
      fetchCompounds();
    }
  };

  // Get unique standards for filter dropdown
  const uniqueStandards = Array.from(new Set(compounds.map(c => c.standard).filter(Boolean)));
  
  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(compounds.map(c => c.category).filter(Boolean)));

  // Filter and sort compounds
  const filteredAndSortedCompounds = useMemo(() => compounds
    .filter(compound => {
      // Search filter
      if (searchQuery && !compound.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Standard filter
      if (standardFilter !== "all" && compound.standard !== standardFilter) {
        return false;
      }
      
      // Category filter
      if (categoryFilter !== "all" && compound.category !== categoryFilter) {
        return false;
      }
      
      // Duration filter
      if (durationFilter !== "all") {
        if (durationFilter === "short" && (compound.duration_days === null || compound.duration_days > 7)) {
          return false;
        }
        if (durationFilter === "medium" && (compound.duration_days === null || compound.duration_days <= 7 || compound.duration_days > 14)) {
          return false;
        }
        if (durationFilter === "long" && (compound.duration_days === null || compound.duration_days <= 14)) {
          return false;
        }
        if (durationFilter === "none" && compound.duration_days !== null) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "name") {
        compareValue = a.name.localeCompare(b.name);
      } else if (sortBy === "standard") {
        const aStandard = a.standard || "";
        const bStandard = b.standard || "";
        compareValue = aStandard.localeCompare(bStandard);
      } else if (sortBy === "duration") {
        const aDuration = a.duration_days || 0;
        const bDuration = b.duration_days || 0;
        compareValue = aDuration - bDuration;
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    }), [compounds, searchQuery, standardFilter, categoryFilter, durationFilter, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, standardFilter, categoryFilter, durationFilter, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedCompounds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompounds = filteredAndSortedCompounds.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleSort = (column: "name" | "standard" | "duration") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStandardFilter("all");
    setCategoryFilter("all");
    setDurationFilter("all");
    setSortBy("name");
    setSortOrder("asc");
  };

  const hasActiveFilters = searchQuery || standardFilter !== "all" || categoryFilter !== "all" || durationFilter !== "all";

  const handleExport = () => {
    try {
      const exportData = filteredAndSortedCompounds.map(compound => ({
        compound: compound.name,
        category: compound.category || "",
        aliases: compound.aliases || [],
        standard: compound.standard || "",
        duration_days: compound.duration_days || null,
        description: compound.description || "",
      }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `compounds-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${exportData.length} compound(s) to JSON file`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export compounds",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    try {
      const data: ImportCompound[] = JSON.parse(importJson);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to import compounds",
          variant: "destructive",
        });
        return;
      }

      if (!importLabId) {
        toast({
          title: "Error",
          description: "Please select a lab",
          variant: "destructive",
        });
        return;
      }

      setIsImporting(true);
      setImportTotal(data.length);
      setImportProgress(0);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // Check if compound already exists
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("name", item.compound)
          .eq("user_id", user.id)
          .limit(1);

        let productId: string;
        if (existing && existing.length > 0) {
          // Update existing compound
          productId = existing[0].id;
          const { error: updateError } = await supabase
            .from("products")
            .update({
              category: item.category,
              aliases: item.aliases.length > 0 ? item.aliases : null,
            })
            .eq("id", productId);

          if (updateError) {
            errorCount++;
            setImportProgress(i + 1);
            continue;
          }
        } else {
          // Create new compound
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert([{
              name: item.compound,
              category: item.category,
              aliases: item.aliases.length > 0 ? item.aliases : null,
              user_id: user.id,
            }])
            .select("id")
            .single();

          if (productError || !newProduct) {
            errorCount++;
            setImportProgress(i + 1);
            continue;
          }
          productId = newProduct.id;
        }

        // Check if pricing already exists
        const { data: existingPricing } = await supabase
          .from("product_vendor_pricing")
          .select("id")
          .eq("product_id", productId)
          .eq("lab_id", importLabId)
          .limit(1);

        if (existingPricing && existingPricing.length > 0) {
          // Update existing pricing
          const { error: pricingError } = await supabase
            .from("product_vendor_pricing")
            .update({ price: item.usd })
            .eq("id", existingPricing[0].id);

          if (pricingError) {
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          // Create new pricing
          const { error: pricingError } = await supabase
            .from("product_vendor_pricing")
            .insert([{
              product_id: productId,
              lab_id: importLabId,
              price: item.usd,
              user_id: user.id,
            }]);

          if (pricingError) {
            errorCount++;
          } else {
            successCount++;
          }
        }

        setImportProgress(i + 1);
      }

      toast({
        title: "Import completed",
        description: `Successfully imported ${successCount} compounds. ${errorCount > 0 ? `${errorCount} errors.` : ""}`,
      });

      setImportDialogOpen(false);
      setImportJson("");
      setImportProgress(0);
      setImportTotal(0);
      setIsImporting(false);
      fetchCompounds();
    } catch (error) {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        setImportJson(json);
        toast({
          title: "File loaded",
          description: "JSON file loaded successfully",
        });
      } catch (error) {
        toast({
          title: "Error reading file",
          description: "Failed to read the file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Compounds</h2>
            <p className="text-sm text-muted-foreground">Manage compounds for testing</p>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="mt-2">
                {selectedIds.size} selected
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkUpdateOpen(true)}
                  className="text-xs sm:text-sm"
                >
                  <Edit className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Bulk Update</span>
                  <span className="xs:hidden">Update</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-xs sm:text-sm"
                >
                  <Trash2 className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Delete Selected</span>
                  <span className="xs:hidden">Delete</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={compounds.length === 0}
              className="text-xs sm:text-sm"
            >
              <Download className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export JSON</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkPricingWizardOpen(true)}
              className="text-xs sm:text-sm"
            >
              <Wand2 className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Bulk Pricing Setup</span>
              <span className="md:hidden">Pricing</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="text-xs sm:text-sm"
            >
              <Upload className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Import JSON</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">
                  <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Add Compound</span>
                  <span className="xs:hidden">Add</span>
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCompound ? "Edit" : "Add"} Compound</DialogTitle>
                <DialogDescription>
                  {editingCompound ? "Update" : "Create a new"} compound entry
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Compound Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryComboOpen}
                        className="w-full justify-between"
                      >
                        {formData.category || "Select or type category..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search or type new category..." 
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => {
                                if (formData.category.trim()) {
                                  // Check if category already exists
                                  if (uniqueCategories.includes(formData.category.trim())) {
                                    setCategoryComboOpen(false);
                                    return;
                                  }
                                  // Show confirmation for new category
                                  setPendingCategory(formData.category.trim());
                                  setNewCategoryDialogOpen(true);
                                  setCategoryComboOpen(false);
                                }
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{formData.category}"
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {uniqueCategories.map((category) => (
                              <CommandItem
                                key={category}
                                value={category!}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, category: currentValue });
                                  setCategoryComboOpen(false);
                                }}
                              >
                                <Check
                                  className={
                                    formData.category === category
                                      ? "mr-2 h-4 w-4 opacity-100"
                                      : "mr-2 h-4 w-4 opacity-0"
                                  }
                                />
                                {category}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard">Standard / Specification</Label>
                  <Input
                    id="standard"
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                    placeholder="e.g., HPLC-MS, HPLC-UV, LC-MS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duration (days)</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <p>💡 Vendor and pricing are managed through the "Manage" button in the Vendor Pricing column</p>
                </div>
                <Button type="submit" className="w-full">
                  {editingCompound ? "Update" : "Create"} Compound
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* New Category Confirmation Dialog */}
        <AlertDialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
          <AlertDialogContent className="bg-card z-50">
            <AlertDialogHeader>
              <AlertDialogTitle>Add New Category</AlertDialogTitle>
              <AlertDialogDescription>
                You're about to add a new category: <strong>"{pendingCategory}"</strong>
                <br /><br />
                This category will be added to your category list and can be used for other compounds.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setPendingCategory("");
                setFormData({ ...formData, category: "" });
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setFormData({ ...formData, category: pendingCategory });
                setPendingCategory("");
                setNewCategoryDialogOpen(false);
                toast({
                  title: "Category added",
                  description: `"${pendingCategory}" can now be used for this compound.`,
                });
              }}>
                Add Category
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search" className="mb-2 block">Search by Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search compounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-[180px]">
            <Label htmlFor="standard-filter" className="mb-2 block">Standard</Label>
            <Select value={standardFilter} onValueChange={setStandardFilter}>
              <SelectTrigger id="standard-filter">
                <SelectValue placeholder="All Standards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {uniqueStandards.map((standard) => (
                  <SelectItem key={standard} value={standard!}>
                    {standard}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px]">
            <Label htmlFor="category-filter" className="mb-2 block">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category!}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px]">
            <Label htmlFor="duration-filter" className="mb-2 block">Duration</Label>
            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger id="duration-filter">
                <SelectValue placeholder="All Durations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Durations</SelectItem>
                <SelectItem value="short">Short (≤7 days)</SelectItem>
                <SelectItem value="medium">Medium (8-14 days)</SelectItem>
                <SelectItem value="long">Long (&gt;14 days)</SelectItem>
                <SelectItem value="none">No Duration Set</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="mb-0"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results count and pagination controls */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedCompounds.length)} of {filteredAndSortedCompounds.length} compound{filteredAndSortedCompounds.length !== 1 ? "s" : ""}
            </div>
            {hasActiveFilters && (
              <Badge variant="secondary">Filters Active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Per page:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredAndSortedCompounds.length > 0 && selectedIds.size === filteredAndSortedCompounds.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortBy === "name" && (
                      sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                    {sortBy !== "name" && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort("standard")}
                >
                  <div className="flex items-center gap-1">
                    Standard
                    {sortBy === "standard" && (
                      sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                    {sortBy !== "standard" && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort("duration")}
                >
                  <div className="flex items-center gap-1">
                    Duration
                    {sortBy === "duration" && (
                      sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                    {sortBy !== "duration" && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor Pricing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCompounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {compounds.length === 0 ? (
                      "No compounds found. Add your first compound to get started."
                    ) : (
                      <>
                        No compounds match your filters.{" "}
                        <Button variant="link" onClick={clearFilters} className="p-0 h-auto">
                          Clear filters
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompounds.map((compound) => (
                  <TableRow key={compound.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(compound.id)}
                        onCheckedChange={() => toggleSelection(compound.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {compound.aliases && compound.aliases.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help border-b border-dotted border-muted-foreground w-fit">
                                {(() => {
                                  const CategoryIcon = getCategoryIcon(compound.category);
                                  return <CategoryIcon className={cn("h-4 w-4 flex-shrink-0", compound.category && `text-category-${compound.category.toLowerCase().replace(/\s+/g, '-')}`)} />;
                                })()}
                                <span>{compound.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Aliases:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {compound.aliases.map((alias, idx) => (
                                  <li key={idx} className="text-sm">{alias}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const CategoryIcon = getCategoryIcon(compound.category);
                            return <CategoryIcon className={cn("h-4 w-4 flex-shrink-0", compound.category && `text-category-${compound.category.toLowerCase().replace(/\s+/g, '-')}`)} />;
                          })()}
                          <span>{compound.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {compound.category ? (
                        <Badge className={cn("flex items-center gap-1.5 w-fit", getCategoryColors(compound.category).bg, getCategoryColors(compound.category).text)}>
                          {(() => {
                            const CategoryIcon = getCategoryIcon(compound.category);
                            return <CategoryIcon className="h-3.5 w-3.5 flex-shrink-0" />;
                          })()}
                          <span>{compound.category}</span>
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{compound.standard || "—"}</TableCell>
                    <TableCell>
                      {compound.duration_days ? `${compound.duration_days} days` : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {compound.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompound({ id: compound.id, name: compound.name });
                          setPricingDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/compounds/${compound.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(compound)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(compound.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center pt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {selectedCompound && (
        <VendorPricingDialog
          open={pricingDialogOpen}
          onOpenChange={setPricingDialogOpen}
          productId={selectedCompound.id}
          productName={selectedCompound.name}
        />
      )}
      
      {/* Bulk Vendor Pricing Wizard */}
      <BulkVendorPricingWizard
        open={bulkPricingWizardOpen}
        onOpenChange={setBulkPricingWizardOpen}
        onComplete={() => {
          toast({
            title: "Success",
            description: "Vendor pricing updated successfully",
          });
          fetchCompounds();
        }}
      />

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateOpen} onOpenChange={setBulkUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Compounds</DialogTitle>
            <DialogDescription>
              Update {selectedIds.size} selected compound(s). Only fill in fields you want to update.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Category</Label>
              <Select
                value={bulkUpdateData.category}
                onValueChange={(value) => setBulkUpdateData({ ...bulkUpdateData, category: value })}
              >
                <SelectTrigger id="bulk-category">
                  <SelectValue placeholder="Leave empty to keep existing values" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep_existing__">Keep existing values</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category!}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-standard">Standard / Specification</Label>
              <Input
                id="bulk-standard"
                value={bulkUpdateData.standard}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, standard: e.target.value })}
                placeholder="Leave empty to keep existing values"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-duration">Duration (days)</Label>
              <Input
                id="bulk-duration"
                type="number"
                value={bulkUpdateData.duration_days}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, duration_days: e.target.value })}
                placeholder="Leave empty to keep existing values"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-description">Description</Label>
              <Textarea
                id="bulk-description"
                value={bulkUpdateData.description}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, description: e.target.value })}
                placeholder="Leave empty to keep existing values"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBulkUpdate} className="flex-1">
                Update {selectedIds.size} Compound(s)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkUpdateOpen(false);
                  setBulkUpdateData({ standard: "", duration_days: "", description: "", category: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import JSON Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Compounds from JSON</DialogTitle>
            <DialogDescription>
              Upload a JSON file or paste JSON data with compound, aliases, category, and usd fields.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lab-select">Lab</Label>
              <Select
                value={importLabId}
                onValueChange={setImportLabId}
                disabled={isImporting}
              >
                <SelectTrigger id="lab-select">
                  <SelectValue placeholder="Select a lab" />
                </SelectTrigger>
                <SelectContent>
                  {labs.length === 0 ? (
                    <SelectItem value="none" disabled>No labs available - create one first</SelectItem>
                  ) : (
                    labs.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload JSON File (Optional)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-json">JSON Data</Label>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"compound": "Semaglutide", "aliases": [], "category": "Peptides", "usd": 300}]'
                className="font-mono text-sm min-h-[300px]"
                disabled={isImporting}
              />
            </div>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Importing compounds...</span>
                  <span>{importProgress} / {importTotal}</span>
                </div>
                <Progress value={(importProgress / importTotal) * 100} />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                className="flex-1"
                disabled={isImporting || !importLabId || !importJson.trim()}
              >
                {isImporting ? "Importing..." : "Import Compounds"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(false);
                  setImportJson("");
                  setImportProgress(0);
                  setImportTotal(0);
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Compounds;
