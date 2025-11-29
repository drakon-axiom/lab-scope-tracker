import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Pencil, Plus, Trash2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SwipeableTableRow } from "@/components/SwipeableTableRow";

interface Lab {
  id: string;
  name: string;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  accreditations: string | null;
}

const Labs = () => {
  const { toast } = useToast();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [open, setOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    accreditations: "",
  });

  const fetchLabs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!user) return;

    const { data, error } = await supabase
      .from("labs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching labs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLabs(data || []);
    }
  };

  useEffect(() => {
    fetchLabs();

    // Set up realtime subscription
    const channel = supabase
      .channel('labs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labs'
        },
        () => {
          fetchLabs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      contact_email: "",
      contact_phone: "",
      accreditations: "",
    });
    setEditingLab(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingLab) {
      const { error } = await supabase
        .from("labs")
        .update(formData)
        .eq("id", editingLab.id);

      if (error) {
        toast({
          title: "Error updating lab",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Lab updated successfully" });
        setOpen(false);
        resetForm();
        fetchLabs();
      }
    } else {
      const { error } = await supabase
        .from("labs")
        .insert([{ ...formData, user_id: user.id }]);

      if (error) {
        toast({
          title: "Error creating lab",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Lab created successfully" });
        setOpen(false);
        resetForm();
        fetchLabs();
      }
    }
  };

  const handleEdit = (lab: Lab) => {
    setEditingLab(lab);
    setFormData({
      name: lab.name,
      location: lab.location || "",
      contact_email: lab.contact_email || "",
      contact_phone: lab.contact_phone || "",
      accreditations: lab.accreditations || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lab?")) return;

    const { error } = await supabase.from("labs").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting lab",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Lab deleted successfully" });
      fetchLabs();
    }
  };

  const handleRefresh = async () => {
    await fetchLabs();
  };

  return (
    <Layout>
      <PullToRefreshWrapper onRefresh={handleRefresh}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Labs</h2>
            <p className="text-muted-foreground">Manage testing laboratories</p>
          </div>
          <ResponsiveDialog 
            open={open} 
            onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}
            title={editingLab ? "Edit Lab" : "Add Lab"}
            description={editingLab ? "Update laboratory entry" : "Create a new laboratory entry"}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lab
              </Button>
            }
          >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Lab Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                
                <Collapsible defaultOpen className="space-y-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium text-sm hover:text-primary transition-colors">
                    <span>Contact Details</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible className="space-y-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium text-sm hover:text-primary transition-colors">
                    <span>Accreditations</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    <Label htmlFor="accreditations">Accreditations</Label>
                    <Textarea
                      id="accreditations"
                      value={formData.accreditations}
                      onChange={(e) => setFormData({ ...formData, accreditations: e.target.value })}
                    />
                  </CollapsibleContent>
                </Collapsible>
                <Button type="submit" className="w-full">
                  {editingLab ? "Update" : "Create"} Lab
                </Button>
              </form>
          </ResponsiveDialog>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="hidden md:table-cell min-w-[120px]">Location</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[150px]">Contact</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[200px]">Accreditations</TableHead>
                <TableHead className="text-right min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No labs found. Add your first lab to get started.
                  </TableCell>
                </TableRow>
              ) : (
                labs.map((lab) => (
                  <SwipeableTableRow 
                    key={lab.id}
                    onEdit={() => handleEdit(lab)}
                    onDelete={() => handleDelete(lab.id)}
                  >
                    <TableCell className="font-medium">{lab.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{lab.location || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="max-w-[150px] truncate">
                        {lab.contact_email || lab.contact_phone || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[200px] truncate">
                        {lab.accreditations || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(lab)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lab.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </SwipeableTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      </PullToRefreshWrapper>
    </Layout>
  );
};

export default Labs;
