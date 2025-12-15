import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, FlaskConical, Clock, CheckCircle, XCircle, Send, Pencil, Trash2, Search, X } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Lab {
  id: string;
  name: string;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  user_id: string;
}

interface LabRequest {
  id: string;
  lab_name: string;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const Labs = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [myRequests, setMyRequests] = useState<LabRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    lab_name: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    notes: "",
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  // Derived filtered labs
  const filteredLabs = labs.filter((lab) => {
    const matchesSearch = searchQuery === "" || 
      lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = !locationFilter || lab.location === locationFilter;
    
    return matchesSearch && matchesLocation;
  });

  // Unique locations for filter
  const uniqueLocations = [...new Set(labs.map(lab => lab.location).filter(Boolean))] as string[];

  // Admin CRUD state
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState<Lab | null>(null);
  const [adminFormData, setAdminFormData] = useState({
    name: "",
    location: "",
    contact_email: "",
    contact_phone: "",
  });

  const fetchLabs = async () => {
    const { data, error } = await supabase
      .from("labs")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching labs",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      setLabs(data || []);
    }
  };

  const fetchMyRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("lab_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching lab requests:", error);
    } else {
      setMyRequests(data || []);
    }
  };

  useEffect(() => {
    fetchLabs();
    fetchMyRequests();
  }, []);

  const resetForm = () => {
    setFormData({
      lab_name: "",
      location: "",
      contact_email: "",
      contact_phone: "",
      website: "",
      notes: "",
    });
  };

  const resetAdminForm = () => {
    setAdminFormData({
      name: "",
      location: "",
      contact_email: "",
      contact_phone: "",
    });
    setEditingLab(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a request",
        variant: "destructive",
        duration: 4000,
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("lab_requests")
      .insert([{ 
        ...formData, 
        user_id: user.id 
      }]);

    if (error) {
      toast({
        title: "Error submitting request",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      toast({ 
        title: "Request submitted", 
        description: "Our team will review your request and add the lab if approved.",
        duration: 5000 
      });

      // Notify admins via email (fire and forget)
      supabase.functions.invoke("notify-lab-request", {
        body: {
          lab_name: formData.lab_name,
          location: formData.location || undefined,
          contact_email: formData.contact_email || undefined,
          website: formData.website || undefined,
          notes: formData.notes || undefined,
          requester_email: user.email,
        },
      }).catch(err => console.error("Failed to notify admins:", err));
      setOpen(false);
      resetForm();
      fetchMyRequests();
    }
    setSubmitting(false);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
        duration: 4000,
      });
      setSubmitting(false);
      return;
    }

    if (editingLab) {
      // Update existing lab
      const { error } = await supabase
        .from("labs")
        .update({
          name: adminFormData.name,
          location: adminFormData.location || null,
          contact_email: adminFormData.contact_email || null,
          contact_phone: adminFormData.contact_phone || null,
        })
        .eq("id", editingLab.id);

      if (error) {
        toast({
          title: "Error updating lab",
          description: error.message,
          variant: "destructive",
          duration: 4000,
        });
      } else {
        toast({ title: "Lab updated successfully" });
        setAdminDialogOpen(false);
        resetAdminForm();
        fetchLabs();
      }
    } else {
      // Create new lab
      const { error } = await supabase
        .from("labs")
        .insert([{
          name: adminFormData.name,
          location: adminFormData.location || null,
          contact_email: adminFormData.contact_email || null,
          contact_phone: adminFormData.contact_phone || null,
          user_id: user.id,
        }]);

      if (error) {
        toast({
          title: "Error creating lab",
          description: error.message,
          variant: "destructive",
          duration: 4000,
        });
      } else {
        toast({ title: "Lab created successfully" });
        setAdminDialogOpen(false);
        resetAdminForm();
        fetchLabs();
      }
    }
    setSubmitting(false);
  };

  const handleEditLab = (lab: Lab) => {
    setEditingLab(lab);
    setAdminFormData({
      name: lab.name,
      location: lab.location || "",
      contact_email: lab.contact_email || "",
      contact_phone: lab.contact_phone || "",
    });
    setAdminDialogOpen(true);
  };

  const handleDeleteLab = async () => {
    if (!labToDelete) return;

    const { error } = await supabase
      .from("labs")
      .delete()
      .eq("id", labToDelete.id);

    if (error) {
      toast({
        title: "Error deleting lab",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      toast({ title: "Lab deleted successfully" });
      fetchLabs();
    }
    setDeleteDialogOpen(false);
    setLabToDelete(null);
  };

  const handleRefresh = async () => {
    await Promise.all([fetchLabs(), fetchMyRequests()]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Labs</h2>
              <p className="text-muted-foreground">Available testing laboratories</p>
            </div>
            {isAdmin ? (
              <ResponsiveDialog
                open={adminDialogOpen}
                onOpenChange={(o) => { setAdminDialogOpen(o); if (!o) resetAdminForm(); }}
                title={editingLab ? "Edit Lab" : "Add New Lab"}
                description={editingLab ? "Update lab information" : "Create a new testing laboratory"}
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lab
                  </Button>
                }
              >
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin_name">Lab Name *</Label>
                    <Input
                      id="admin_name"
                      value={adminFormData.name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                      placeholder="Enter lab name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_location">Location</Label>
                    <Input
                      id="admin_location"
                      value={adminFormData.location}
                      onChange={(e) => setAdminFormData({ ...adminFormData, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_contact_email">Contact Email</Label>
                      <Input
                        id="admin_contact_email"
                        type="email"
                        value={adminFormData.contact_email}
                        onChange={(e) => setAdminFormData({ ...adminFormData, contact_email: e.target.value })}
                        placeholder="lab@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_contact_phone">Contact Phone</Label>
                      <Input
                        id="admin_contact_phone"
                        type="tel"
                        value={adminFormData.contact_phone}
                        onChange={(e) => setAdminFormData({ ...adminFormData, contact_phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Saving..." : (editingLab ? "Update Lab" : "Create Lab")}
                  </Button>
                </form>
              </ResponsiveDialog>
            ) : (
              <ResponsiveDialog
                open={open}
                onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}
                title="Request New Lab"
                description="Submit information about a lab you'd like us to add"
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Request Lab
                  </Button>
                }
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lab_name">Lab Name *</Label>
                    <Input
                      id="lab_name"
                      value={formData.lab_name}
                      onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                      placeholder="Enter lab name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="lab@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional information about this lab..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </ResponsiveDialog>
            )}
          </div>

          {/* Available Labs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Available Labs
              </CardTitle>
              <CardDescription>
                These labs are available for testing requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search labs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {uniqueLocations.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={locationFilter === null ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setLocationFilter(null)}
                    >
                      All
                    </Button>
                    {uniqueLocations.slice(0, 5).map((location) => (
                      <Button
                        key={location}
                        variant={locationFilter === location ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setLocationFilter(locationFilter === location ? null : location)}
                      >
                        {location}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active filters indicator */}
              {(searchQuery || locationFilter) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Showing {filteredLabs.length} of {labs.length} labs</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearchQuery(""); setLocationFilter(null); }}
                    className="h-auto py-1 px-2"
                  >
                    Clear filters
                  </Button>
                </div>
              )}

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">Location</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[150px]">Contact</TableHead>
                      {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLabs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                          {labs.length === 0 ? "No labs available yet." : "No labs match your search."}
                        </TableCell>
                      </TableRow>
                    ) : filteredLabs.map((lab) => (
                        <TableRow key={lab.id}>
                          <TableCell className="font-medium">{lab.name}</TableCell>
                          <TableCell className="hidden md:table-cell">{lab.location || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="max-w-[150px] truncate">
                              {lab.contact_email || lab.contact_phone || "—"}
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditLab(lab)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setLabToDelete(lab);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* My Lab Requests - only show if user has requests */}
          {!isAdmin && myRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>My Lab Requests</CardTitle>
                <CardDescription>
                  Track the status of your lab requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Lab Name</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[120px]">Location</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[120px]">Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.lab_name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{request.location || "—"}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PullToRefreshWrapper>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{labToDelete?.name}"? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLabToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLab} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Labs;
