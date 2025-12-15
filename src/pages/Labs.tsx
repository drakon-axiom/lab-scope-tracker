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
import { useToast } from "@/hooks/use-toast";
import { Plus, FlaskConical, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Lab {
  id: string;
  name: string;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
            {!isAdmin && (
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
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">Location</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[150px]">Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No labs available yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      labs.map((lab) => (
                        <TableRow key={lab.id}>
                          <TableCell className="font-medium">{lab.name}</TableCell>
                          <TableCell className="hidden md:table-cell">{lab.location || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="max-w-[150px] truncate">
                              {lab.contact_email || lab.contact_phone || "—"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
    </Layout>
  );
};

export default Labs;
