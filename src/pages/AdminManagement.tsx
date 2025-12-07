import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Shield, UserPlus, Trash2, Pencil, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const AdminManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [editFullName, setEditFullName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Redirect non-admins
    if (!roleLoading && !isAdmin) {
      navigate("/dashboard");
      return;
    }

    if (isAdmin) {
      fetchCurrentUser();
      fetchAdmins();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/list-admins`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch admins");
      }

      const { admins: adminsData } = await response.json();
      setAdmins(adminsData);
    } catch (error: any) {
      console.error("Error fetching admins:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load admins",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAdmins();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...newAdmin, role: "admin" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create admin");
      }

      toast({
        title: "Admin created",
        description: `Admin ${newAdmin.email} has been created successfully`,
        duration: 3000,
      });

      // Reset form and close dialog
      setNewAdmin({
        email: "",
        password: "",
        fullName: "",
      });
      setIsAddDialogOpen(false);

      // Refresh the admins list
      fetchAdmins();
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditFullName(admin.full_name || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editFullName })
        .eq("id", editingAdmin.id);

      if (error) throw error;

      toast({
        title: "Admin updated",
        description: "Admin profile has been updated successfully",
        duration: 3000,
      });

      setIsEditDialogOpen(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      console.error("Error updating admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update admin",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async (admin: AdminUser) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(admin.email, {
        redirectTo: `${window.location.origin}/overseer-alpha/auth`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: `A password reset link has been sent to ${admin.email}`,
        duration: 4000,
      });
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleDemoteAdmin = async (admin: AdminUser) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/update-user-role`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: admin.id, newRole: "subscriber" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to demote admin");
      }

      toast({
        title: "Admin demoted",
        description: `${admin.email} has been changed to a subscriber`,
        duration: 3000,
      });

      fetchAdmins();
    } catch (error: any) {
      console.error("Error demoting admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to demote admin",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  if (roleLoading || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Loading admins...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Management</h2>
              <p className="text-sm text-muted-foreground">Manage administrator accounts</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Add a new administrator to the system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name (Optional)</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={newAdmin.fullName}
                      onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Admin"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{admins.length}</div>
            </CardContent>
          </Card>

          {/* Admins Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Administrators</CardTitle>
              <CardDescription>View and manage admin accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {admin.full_name || "No name"}
                            {admin.id === currentUserId && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditClick(admin)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit admin</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePasswordReset(admin)}
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Send password reset</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {admin.id !== currentUserId && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Demote Admin?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will change {admin.email} from an admin to a regular subscriber.
                                      They will lose all admin privileges.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDemoteAdmin(admin)}>
                                      Demote to Subscriber
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {admins.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="mx-auto h-12 w-12 opacity-50 mb-3" />
                  <p>No admins found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Admin Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingAdmin(null);
              setEditFullName("");
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Admin</DialogTitle>
                <DialogDescription>
                  Update profile for {editingAdmin?.email}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input
                    id="edit-fullName"
                    type="text"
                    placeholder="John Doe"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateAdmin} disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PullToRefreshWrapper>
    </Layout>
  );
};

export default AdminManagement;
