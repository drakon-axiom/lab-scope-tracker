import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { toast } from "sonner";
import { Save, DollarSign, History, Search, Upload, Download, Edit, Check, X } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import PullToRefresh from "react-pull-to-refresh";
import { PriceEditDialog } from "@/components/lab/PriceEditDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductPricing {
  id: string;
  price: number;
  product_id: string;
  products: {
    name: string;
    category: string | null;
  };
}

interface PricingAudit {
  id: string;
  old_price: number | null;
  new_price: number;
  changed_at: string;
  change_reason: string | null;
  products: {
    name: string;
  };
}

interface EditedItem {
  price?: number;
  category?: string;
}

export default function LabSettings() {
  const { labUser } = useLabUser();
  const isMobile = useIsMobile();
  const [pricing, setPricing] = useState<ProductPricing[]>([]);
  const [auditLog, setAuditLog] = useState<PricingAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isImporting, setIsImporting] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductPricing | null>(null);
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedItems, setEditedItems] = useState<Record<string, EditedItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [applyPrice, setApplyPrice] = useState<string>("");
  const [applyCategory, setApplyCategory] = useState<string>("");

  const fetchData = async () => {
    if (!labUser?.lab_id) return;

    try {
      setLoading(true);
      // Fetch pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from("product_vendor_pricing")
        .select(`
          id,
          price,
          product_id,
          products (
            name,
            category
          )
        `)
        .eq("lab_id", labUser.lab_id)
        .eq("is_active", true)
        .order("product_id");

      if (pricingError) throw pricingError;
      setPricing(pricingData || []);

      // Fetch audit log
      const { data: auditData, error: auditError } = await supabase
        .from("pricing_audit_log")
        .select(`
          id,
          old_price,
          new_price,
          changed_at,
          change_reason,
          products (
            name
          )
        `)
        .eq("lab_id", labUser.lab_id)
        .order("changed_at", { ascending: false })
        .limit(50);

      if (auditError) throw auditError;
      setAuditLog(auditData as any || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [labUser?.lab_id]);

  const handleRefresh = async () => {
    await fetchData();
  };

  // Get unique categories
  const categories = Array.from(new Set(pricing.map(p => p.products.category).filter(Boolean))) as string[];

  // Filter and sort pricing data
  const filteredPricing = pricing
    .filter((item) => {
      const matchesSearch = item.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.products.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.products.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.products.name.localeCompare(b.products.name));

  const handlePriceUpdate = async (pricingId: string, productId: string, oldPrice: number, newPrice: number) => {
    if (!labUser?.lab_id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update price
      const { error: updateError } = await supabase
        .from("product_vendor_pricing")
        .update({ price: newPrice })
        .eq("id", pricingId);

      if (updateError) throw updateError;

      // Log change
      const { error: logError } = await supabase
        .from("pricing_audit_log")
        .insert({
          product_id: productId,
          lab_id: labUser.lab_id,
          old_price: oldPrice,
          new_price: newPrice,
          changed_by: user.id,
          change_reason: isMobile ? "Updated from mobile" : "Updated from lab portal",
        });

      if (logError) throw logError;

      toast.success("Price updated successfully");
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error("Failed to update price");
    }
  };

  const allCategories = ["Peptides", "SARMs", "AAS", "Analysis", "Small Molecules", "SERMs"];
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredPricing.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handlePriceChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditedItems(prev => ({
        ...prev,
        [id]: { ...prev[id], price: numValue }
      }));
    }
  };

  const handleCategoryChange = (id: string, category: string) => {
    setEditedItems(prev => ({
      ...prev,
      [id]: { ...prev[id], category }
    }));
  };

  const handleApplyPriceToSelected = () => {
    const numPrice = parseFloat(applyPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    
    const newEditedItems = { ...editedItems };
    selectedIds.forEach(id => {
      newEditedItems[id] = { ...newEditedItems[id], price: numPrice };
    });
    setEditedItems(newEditedItems);
    setApplyPrice("");
    toast.success(`Applied $${numPrice.toFixed(2)} to ${selectedIds.size} item(s)`);
  };

  const handleApplyCategoryToSelected = () => {
    if (!applyCategory) {
      toast.error("Please select a category");
      return;
    }
    
    const newEditedItems = { ...editedItems };
    selectedIds.forEach(id => {
      newEditedItems[id] = { ...newEditedItems[id], category: applyCategory };
    });
    setEditedItems(newEditedItems);
    setApplyCategory("");
    toast.success(`Applied "${applyCategory}" to ${selectedIds.size} item(s)`);
  };

  const hasChanges = Object.keys(editedItems).length > 0;

  const handleSaveChanges = async () => {
    if (!labUser?.lab_id || !hasChanges) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let successCount = 0;

      for (const [id, changes] of Object.entries(editedItems)) {
        const item = pricing.find(p => p.id === id);
        if (!item) continue;

        // Update price if changed
        if (changes.price !== undefined && changes.price !== item.price) {
          const { error: updateError } = await supabase
            .from("product_vendor_pricing")
            .update({ price: changes.price })
            .eq("id", id);

          if (updateError) throw updateError;

          // Log price change
          await supabase
            .from("pricing_audit_log")
            .insert({
              product_id: item.product_id,
              lab_id: labUser.lab_id,
              old_price: item.price,
              new_price: changes.price,
              changed_by: user.id,
              change_reason: "Inline bulk edit",
            });
        }

        // Update category if changed
        if (changes.category && changes.category !== item.products.category) {
          const { error: categoryError } = await supabase
            .from("products")
            .update({ category: changes.category })
            .eq("id", item.product_id);

          if (categoryError) throw categoryError;
        }

        successCount++;
      }

      toast.success(`Successfully updated ${successCount} item(s)`);
      setEditedItems({});
      setSelectedIds(new Set());
      await fetchData();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setEditedItems({});
  };

  const SwipeableRow = ({ item }: { item: ProductPricing }) => {
    const handlers = useSwipeable({
      onSwipedLeft: () => isMobile && setSwipedRowId(item.id),
      onSwipedRight: () => isMobile && setSwipedRowId(null),
      trackMouse: false,
    });

    const isSwiped = swipedRowId === item.id;
    const isSelected = selectedIds.has(item.id);
    const editedItem = editedItems[item.id];
    const currentPrice = editedItem?.price ?? item.price;
    const currentCategory = editedItem?.category ?? item.products.category ?? "";

    return (
      <div {...handlers} className="relative">
        <TableRow className={`transition-transform duration-200 ${isSwiped ? '-translate-x-20' : ''} ${isSelected ? 'bg-muted/50' : ''}`}>
          <TableCell className="w-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
            />
          </TableCell>
          <TableCell className="font-medium">
            <div className="font-medium">{item.products.name}</div>
          </TableCell>
          <TableCell>
            <Select
              value={currentCategory}
              onValueChange={(value) => handleCategoryChange(item.id, value)}
            >
              <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={currentPrice}
                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                className="w-24 h-8 text-sm"
              />
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingItem(item)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
        {isMobile && isSwiped && (
          <div className="absolute right-0 top-0 h-full flex items-center pr-2 bg-primary">
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground h-full"
              onClick={() => {
                setEditingItem(item);
                setSwipedRowId(null);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const handleExportCSV = () => {
    const csvHeader = "Compound Name,Category,Current Price\n";
    const csvRows = filteredPricing
      .map((item) => 
        `"${item.products.name}","${item.products.category || "Uncategorized"}",${item.price}`
      )
      .join("\n");
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `lab-pricing-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Pricing exported successfully");
  };

  const handleDownloadTemplate = () => {
    const csvHeader = "Compound Name,Category,Current Price\n";
    const csvRows = pricing
      .sort((a, b) => a.products.name.localeCompare(b.products.name))
      .map((item) => 
        `"${item.products.name}","${item.products.category || "Uncategorized"}",0.00`
      )
      .join("\n");
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `pricing-template-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Template downloaded successfully");
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const rows = text.split("\n").filter(row => row.trim());
      
      // Skip header row
      const dataRows = rows.slice(1);
      
      let successCount = 0;
      let errorCount = 0;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const row of dataRows) {
        // Parse CSV row handling quoted values
        const match = row.match(/^"([^"]*)","([^"]*)",(.+)$/);
        if (!match) continue;

        const [, compoundName, , priceStr] = match;
        const newPrice = parseFloat(priceStr.trim());

        if (isNaN(newPrice) || newPrice <= 0) {
          errorCount++;
          continue;
        }

        // Find the pricing record by compound name
        const pricingItem = pricing.find(
          p => p.products.name.toLowerCase() === compoundName.toLowerCase()
        );

        if (!pricingItem) {
          errorCount++;
          continue;
        }

        // Update price
        const { error: updateError } = await supabase
          .from("product_vendor_pricing")
          .update({ price: newPrice })
          .eq("id", pricingItem.id);

        if (updateError) {
          errorCount++;
          continue;
        }

        // Log change
        await supabase
          .from("pricing_audit_log")
          .insert({
            product_id: pricingItem.product_id,
            lab_id: labUser?.lab_id,
            old_price: pricingItem.price,
            new_price: newPrice,
            changed_by: user.id,
            change_reason: "Bulk import from CSV",
          });

        successCount++;
      }

      // Refresh pricing data
      const { data } = await supabase
        .from("product_vendor_pricing")
        .select(`
          id,
          price,
          product_id,
          products (
            name,
            category
          )
        `)
        .eq("lab_id", labUser?.lab_id)
        .eq("is_active", true);

      setPricing(data || []);

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} price${successCount !== 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.warning(`Failed to import ${errorCount} price${errorCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error("Failed to import pricing");
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobile) {
      return (
        <PullToRefresh
          onRefresh={handleRefresh}
          className="min-h-screen"
        >
          {children}
        </PullToRefresh>
      );
    }
    return <>{children}</>;
  };

  return (
    <LabLayout>
      <ContentWrapper>
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Lab Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage pricing, test panels, and lab configuration
              {isMobile && <span className="block text-xs mt-1">Pull down to refresh</span>}
            </p>
          </div>

        {/* Pricing Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <DollarSign className="h-5 w-5" />
                  Test Pricing
                </CardTitle>
                <CardDescription className="text-sm">
                  Edit prices and categories inline. Select items and make changes, then save.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={pricing.length === 0}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Download Template</span>
                  <span className="sm:hidden">Template</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={filteredPricing.length === 0}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
                <div className="relative w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                    id="csv-upload"
                    disabled={isImporting}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('csv-upload')?.click()}
                    disabled={isImporting}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? "Importing..." : "Import CSV"}
                  </Button>
                </div>
                {hasChanges && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="w-full sm:w-auto"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : `Save Changes (${Object.keys(editedItems).length})`}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Discard
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Apply to Selected Section */}
            {selectedIds.size > 0 && (
              <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">{selectedIds.size} selected</Badge>
                  <span className="text-sm text-muted-foreground">Apply to selected:</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 flex-1">
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={applyPrice}
                        onChange={(e) => setApplyPrice(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleApplyPriceToSelected}
                      disabled={!applyPrice}
                    >
                      Apply Price
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-1">
                    <Select value={applyCategory} onValueChange={setApplyCategory}>
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleApplyCategoryToSelected}
                      disabled={!applyCategory}
                    >
                      Apply Category
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by test name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredPricing.length > 0 && selectedIds.size === filteredPricing.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="min-w-[150px]">Test / Compound</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPricing.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {searchQuery ? "No tests match your search" : "No pricing configured"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPricing.map((item) => (
                    <SwipeableRow key={item.id} item={item} />
                  ))
                )}
              </TableBody>
            </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Audit Log */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <History className="h-5 w-5" />
                  Pricing Audit Trail
                </CardTitle>
                <CardDescription className="text-sm">
                  Complete history of all pricing changes
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAuditLog(!showAuditLog)}
                className="w-full sm:w-auto"
              >
                {showAuditLog ? "Hide" : "Show"} Audit Log
              </Button>
            </div>
          </CardHeader>
          {showAuditLog && (
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Test / Compound</TableHead>
                    <TableHead className="hidden sm:table-cell">Old Price</TableHead>
                    <TableHead>New Price</TableHead>
                    <TableHead className="hidden md:table-cell">Changed</TableHead>
                    <TableHead className="hidden lg:table-cell">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No pricing changes yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.products.name}</div>
                            <div className="sm:hidden text-xs text-muted-foreground mt-1">
                              {log.old_price ? `$${log.old_price.toFixed(2)}` : "-"} → ${log.new_price.toFixed(2)}
                            </div>
                            <div className="md:hidden text-xs text-muted-foreground mt-1">
                              {format(new Date(log.changed_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {log.old_price ? `$${log.old_price.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${log.new_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {format(new Date(log.changed_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {log.change_reason || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        </div>
      </ContentWrapper>

      {/* Price Edit Dialog */}
      {editingItem && (
        <PriceEditDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          compoundName={editingItem.products.name}
          currentPrice={editingItem.price}
          onSave={(newPrice) =>
            handlePriceUpdate(
              editingItem.id,
              editingItem.product_id,
              editingItem.price,
              newPrice
            )
          }
        />
      )}

    </LabLayout>
  );
}
