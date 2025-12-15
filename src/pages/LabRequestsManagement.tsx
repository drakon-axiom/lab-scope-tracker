import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FlaskConical, 
  ExternalLink,
  Plus 
} from "lucide-react";
import { format } from "date-fns";

interface LabRequest {
  id: string;
  user_id: string;
  lab_name: string;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

const LabRequestsManagement = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [createLab, setCreateLab] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [requesterEmails, setRequesterEmails] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lab_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching requests",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
      // Fetch requester emails
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      for (const userId of userIds) {
        try {
          const { data: emailData } = await supabase.functions.invoke("get-user-email", {
            body: { userId },
          });
          if (emailData?.email) {
            setRequesterEmails(prev => ({ ...prev, [userId]: emailData.email }));
          }
        } catch (e) {
          console.error("Error fetching user email:", e);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleView = (request: LabRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleApproveClick = (request: LabRequest) => {
    setSelectedRequest(request);
    setAdminNotes("");
    setCreateLab(true);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (request: LabRequest) => {
    setSelectedRequest(request);
    setAdminNotes("");
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update request status
      const { error: updateError } = await supabase
        .from("lab_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // Create lab if checkbox is checked
      if (createLab) {
        const { error: labError } = await supabase
          .from("labs")
          .insert([{
            name: selectedRequest.lab_name,
            location: selectedRequest.location,
            contact_email: selectedRequest.contact_email,
            contact_phone: selectedRequest.contact_phone,
            user_id: user.id,
          }]);

        if (labError) {
          console.error("Error creating lab:", labError);
          toast({
            title: "Request approved",
            description: "Request approved but failed to create lab: " + labError.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Request approved",
            description: "Lab request approved and lab created successfully.",
          });
        }
      } else {
        toast({
          title: "Request approved",
          description: "Lab request has been approved.",
        });
      }

      setApproveDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("lab_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: "Lab request has been rejected.",
      });

      setRejectDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setProcessing(false);
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

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lab Requests</h2>
          <p className="text-muted-foreground">
            Review and manage customer lab requests
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCount} pending</Badge>
            )}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              All Requests
            </CardTitle>
            <CardDescription>
              Customer submissions for new labs to be added
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No lab requests yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Lab Name</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[120px]">Location</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[150px]">Requester</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[120px]">Submitted</TableHead>
                      <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.lab_name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{request.location || "—"}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {requesterEmails[request.user_id] || "Loading..."}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {format(new Date(request.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApproveClick(request)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRejectClick(request)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Lab Request Details</DialogTitle>
              <DialogDescription>
                Submitted {selectedRequest && format(new Date(selectedRequest.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Lab Name</Label>
                    <p className="font-medium">{selectedRequest.lab_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                </div>
                
                {selectedRequest.location && (
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p>{selectedRequest.location}</p>
                  </div>
                )}
                
                {selectedRequest.website && (
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <p>
                      <a 
                        href={selectedRequest.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {selectedRequest.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedRequest.contact_email && (
                    <div>
                      <Label className="text-muted-foreground">Contact Email</Label>
                      <p>{selectedRequest.contact_email}</p>
                    </div>
                  )}
                  {selectedRequest.contact_phone && (
                    <div>
                      <Label className="text-muted-foreground">Contact Phone</Label>
                      <p>{selectedRequest.contact_phone}</p>
                    </div>
                  )}
                </div>
                
                {selectedRequest.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedRequest.notes}</p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Label className="text-muted-foreground">Requested By</Label>
                  <p className="text-sm">{requesterEmails[selectedRequest.user_id] || "Unknown"}</p>
                </div>

                {selectedRequest.admin_notes && (
                  <div className="pt-2 border-t">
                    <Label className="text-muted-foreground">Admin Notes</Label>
                    <p className="text-sm">{selectedRequest.admin_notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Lab Request</DialogTitle>
              <DialogDescription>
                Approve "{selectedRequest?.lab_name}" lab request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createLab"
                  checked={createLab}
                  onChange={(e) => setCreateLab(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="createLab" className="flex items-center gap-2 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  Also create the lab in the system
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={processing}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {processing ? "Approving..." : "Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Lab Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject the request for "{selectedRequest?.lab_name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="rejectNotes">Reason (optional)</Label>
              <Textarea
                id="rejectNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReject}
                disabled={processing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processing ? "Rejecting..." : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default LabRequestsManagement;
