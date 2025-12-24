import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { Plus, Search, Filter, X } from "lucide-react";
import { Lab, Product, SavedView } from "./types";

interface QuotesFiltersProps {
  activeView: string;
  searchQuery: string;
  filterStatus: string;
  filterLab: string;
  filterProduct: string;
  filterLockStatus: string;
  searchExpanded: boolean;
  filtersExpanded: boolean;
  savedViews: SavedView[];
  labs: Lab[];
  products: Product[];
  onSelectStatusTab: (status: string) => void;
  onSearchChange: (value: string) => void;
  onSetFilterLab: (value: string) => void;
  onSetFilterProduct: (value: string) => void;
  onSetFilterLockStatus: (value: string) => void;
  onSetSearchExpanded: (value: boolean) => void;
  onSetFiltersExpanded: (value: boolean) => void;
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string, name: string, e: React.MouseEvent) => void;
  onSaveViewClick: () => void;
  hasActiveFilters: () => boolean;
}

export function QuotesFilters({
  activeView,
  searchQuery,
  filterStatus,
  filterLab,
  filterProduct,
  filterLockStatus,
  searchExpanded,
  filtersExpanded,
  savedViews,
  labs,
  products,
  onSelectStatusTab,
  onSearchChange,
  onSetFilterLab,
  onSetFilterProduct,
  onSetFilterLockStatus,
  onSetSearchExpanded,
  onSetFiltersExpanded,
  onLoadView,
  onDeleteView,
  onSaveViewClick,
  hasActiveFilters,
}: QuotesFiltersProps) {
  const statusTabs = [
    { value: "all", label: "All" },
    { value: "draft", label: "Drafts" },
    { value: "sent_to_vendor", label: "Sent" },
    { value: "awaiting_customer_approval", label: "Approval" },
    { value: "approved_payment_pending", label: "Payment" },
    { value: "in_transit", label: "In Transit" },
    { value: "testing_in_progress", label: "Testing" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Status Quick Filters Tabs */}
      <div className="flex items-center justify-between border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {statusTabs.map((tab) => (
              <Button
                key={tab.value}
                variant="ghost"
                size="sm"
                onClick={() => onSelectStatusTab(tab.value)}
                className={cn(
                  "rounded-none border-b-2 px-4 h-10 whitespace-nowrap",
                  activeView === tab.value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Button>
            ))}

            {/* Saved Views as Tabs */}
            {savedViews.map((view) => (
              <div key={view.id} className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoadView(view)}
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
                  onClick={(e) => onDeleteView(view.id, view.name, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Save Current View Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveViewClick}
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
              onSetSearchExpanded(!searchExpanded);
              onSetFiltersExpanded(false);
            }}
            className={cn(searchExpanded && "bg-accent")}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onSetFiltersExpanded(!filtersExpanded);
              onSetSearchExpanded(false);
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 border-0 focus-visible:ring-0 shadow-none"
              maxLength={200}
              autoFocus
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSetSearchExpanded(false);
              onSearchChange("");
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
                <span>{labs.find((l) => l.id === filterLab)?.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-auto"
                  onClick={() => onSetFilterLab("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {filterProduct !== "all" && (
              <div className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded text-sm">
                <span className="text-xs text-muted-foreground">Product:</span>
                <span>{products.find((p) => p.id === filterProduct)?.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-auto"
                  onClick={() => onSetFilterProduct("all")}
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
                  onClick={() => onSetFilterLockStatus("all")}
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
                          onSelect={() => onSetFilterLab(lab.id)}
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
                          onSelect={() => onSetFilterProduct(product.id)}
                        >
                          {product.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={filterLockStatus} onValueChange={onSetFilterLockStatus}>
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
                  onSetFilterLab("all");
                  onSetFilterProduct("all");
                  onSetFilterLockStatus("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
