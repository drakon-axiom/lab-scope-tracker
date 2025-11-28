import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, DollarSign, Wand2, Edit, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
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

interface Compound {
  id: string;
  name: string;
  description: string | null;
  standard: string | null;
  duration_days: number | null;
}

const Compounds = () => {
  const { toast } = useToast();
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
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    standard: "",
    duration_days: "",
  });
  
  // Filtering and Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "standard" | "duration">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  useEffect(() => {
    fetchCompounds();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      standard: "",
      duration_days: "",
    });
    setEditingCompound(null);
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
    if (selectedIds.size === compounds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(compounds.map(c => c.id)));
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
      setBulkUpdateData({ standard: "", duration_days: "", description: "" });
      setSelectedIds(new Set());
      fetchCompounds();
    }
  };

  // Get unique standards for filter dropdown
  const uniqueStandards = Array.from(new Set(compounds.map(c => c.standard).filter(Boolean)));

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
    }), [compounds, searchQuery, standardFilter, durationFilter, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, standardFilter, durationFilter, sortBy, sortOrder]);

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
    setDurationFilter("all");
    setSortBy("name");
    setSortOrder("asc");
  };

  const hasActiveFilters = searchQuery || standardFilter !== "all" || durationFilter !== "all";

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Compounds</h2>
            <p className="text-muted-foreground">Manage compounds for testing</p>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="mt-2">
                {selectedIds.size} selected
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setBulkUpdateOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Bulk Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setBulkPricingWizardOpen(true)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Bulk Pricing Setup
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Compound
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                    <TableCell className="font-medium">{compound.name}</TableCell>
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
                  setBulkUpdateData({ standard: "", duration_days: "", description: "" });
                }}
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
