import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookmarkIcon, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SavedView {
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
}

interface SavedViewsDropdownProps {
  currentFilters: {
    searchQuery: string;
    filterStatus: string;
    filterLab: string;
    filterProduct: string;
    filterLockStatus: string;
  };
  onLoadView: (filters: SavedView["filters"]) => void;
}

const STORAGE_KEY = "quotes_saved_views";

export function SavedViewsDropdown({ currentFilters, onLoadView }: SavedViewsDropdownProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSavedViews();
  }, []);

  const loadSavedViews = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedViews(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load saved views:", error);
    }
  };

  const saveCurrentView = () => {
    if (!viewName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this view",
        variant: "destructive",
      });
      return;
    }

    const newView: SavedView = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: currentFilters,
      createdAt: Date.now(),
    };

    const updatedViews = [...savedViews, newView];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));
    setSavedViews(updatedViews);
    setSaveDialogOpen(false);
    setViewName("");

    toast({
      title: "View saved",
      description: `"${newView.name}" has been saved`,
    });
  };

  const deleteView = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedViews = savedViews.filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));
    setSavedViews(updatedViews);

    toast({
      title: "View deleted",
      description: `"${name}" has been removed`,
    });
  };

  const hasActiveFilters = () => {
    return (
      currentFilters.searchQuery !== "" ||
      currentFilters.filterStatus !== "all" ||
      currentFilters.filterLab !== "all" ||
      currentFilters.filterProduct !== "all" ||
      currentFilters.filterLockStatus !== "all"
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookmarkIcon className="h-4 w-4" />
            Saved
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 z-50 bg-background">
          <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {savedViews.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No saved views yet
            </div>
          ) : (
            savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => onLoadView(view.filters)}
              >
                <span className="flex-1">{view.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => deleteView(view.id, view.name, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={!hasActiveFilters()}
            onClick={() => setSaveDialogOpen(true)}
          >
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
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
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveCurrentView();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveCurrentView}>
                <Check className="h-4 w-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
