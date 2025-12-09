import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2, Users } from "lucide-react";
import { format } from "date-fns";

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  invited_at: string | null;
}

export default function WaitlistManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchEntries();
    }
  }, [isAdmin]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries((data || []) as WaitlistEntry[]);
    } catch (error) {
      console.error("Error fetching waitlist:", error);
      toast.error("Failed to load waitlist entries");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, email: string) => {
    setProcessing(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("waitlist")
        .update({
          status: "approved",
          approved_by: user?.id,
          invited_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Send approval email
      try {
        const entry = entries.find(e => e.id === id);
        await supabase.functions.invoke('send-waitlist-approval', {
          body: { email, full_name: entry?.full_name || '' }
        });
        toast.success(`Approved ${email}. Approval email sent!`);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        toast.success(`Approved ${email}. They can now sign up! (Email notification failed)`);
      }
      
      fetchEntries();
    } catch (error) {
      console.error("Error approving entry:", error);
      toast.error("Failed to approve entry");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from("waitlist")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Entry rejected");
      fetchEntries();
    } catch (error) {
      console.error("Error rejecting entry:", error);
      toast.error("Failed to reject entry");
    } finally {
      setProcessing(null);
    }
  };

  if (roleLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const approvedCount = entries.filter((e) => e.status === "approved").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Waitlist Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage user access requests and approve new members
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Waitlist Entries</CardTitle>
            <CardDescription>
              Review and manage access requests from potential users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No waitlist entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.full_name}</TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.reason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "approved"
                              ? "default"
                              : entry.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(entry.id, entry.email)}
                              disabled={processing === entry.id}
                            >
                              {processing === entry.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(entry.id)}
                              disabled={processing === entry.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
