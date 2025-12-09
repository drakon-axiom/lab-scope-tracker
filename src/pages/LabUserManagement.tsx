import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { toast } from "sonner";
import { UserPlus, Trash2, ToggleLeft, ToggleRight, Eye, Pencil, KeyRound } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Lab {
  id: string;
  name: string;
}

interface LabUser {
  id: string;
  user_id: string;
  lab_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  labs: {
    name: string;
  };
  email?: string;
}

export default function LabUserManagement() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { startLabImpersonation } = useImpersonation();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labUsers, setLabUsers] = useState<LabUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLabUser, setEditingLabUser] = useState<LabUser | null>(null);
  
  // Form state
  const [email, setEmail] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLabId, setSelectedLabId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  
  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<LabUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Password reset state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<LabUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/dashboard");
      return;
    }

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchData = async () => {
    try {
      // Fetch labs
      const { data: labsData, error: labsError } = await supabase
        .from("labs")
        .select("id, name")
        .order("name");

      if (labsError) throw labsError;
      setLabs(labsData || []);

      // Fetch lab users
      const { data: labUsersData, error: labUsersError } = await supabase
        .from("lab_users")
        .select(`
          id,
          user_id,
          lab_id,
          role,
          is_active,
          created_at,
          labs:lab_id (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (labUsersError) throw labUsersError;

      // Fetch user emails from auth via edge function
      const usersWithEmails = await Promise.all(
        (labUsersData || []).map(async (labUser) => {
          try {
            const { data, error } = await supabase.functions.invoke("get-user-email", {
              body: { userId: labUser.user_id },
            });
            return {
              ...labUser,
              email: error ? "Unknown" : (data?.email || "Unknown"),
            };
          } catch {
            return {
              ...labUser,
              email: "Unknown",
            };
          }
        })
      );

      setLabUsers(usersWithEmails as any);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load lab users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabUser = async () => {
    if (!email || !password || !selectedLabId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      // Get current user for created_by field
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Call edge function to create user with service role
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email,
          password,
          role: "lab",
          metadata: {
            lab_id: selectedLabId,
            lab_role: selectedRole,
            created_by: currentUser?.id,
          },
        },
      });

      if (error) throw error;
      // Handle error responses from the edge function (e.g., 409 duplicate email)
      if (data?.error) throw new Error(data.error);
      if (!data?.user) throw new Error("User creation failed");

      // Link to lab
      const { error: labUserError } = await supabase
        .from("lab_users")
        .insert({
          user_id: data.user.id,
          lab_id: selectedLabId,
          role: selectedRole,
          created_by: currentUser?.id,
        });

      if (labUserError) throw labUserError;

      toast.success("Lab user created successfully");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error creating lab user:", error);
      toast.error(error.message || "Failed to create lab user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (labUserId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("lab_users")
        .update({ is_active: !currentStatus })
        .eq("id", labUserId);

      if (error) throw error;

      toast.success(`Lab user ${!currentStatus ? "activated" : "deactivated"}`);
      fetchData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteClick = (labUser: LabUser) => {
    setUserToDelete(labUser);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteLabUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: userToDelete.user_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Lab user deleted successfully");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: unknown) {
      console.error("Error deleting lab user:", error);
      const message = error instanceof Error ? error.message : "Failed to delete lab user";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePasswordClick = (labUser: LabUser) => {
    setPasswordUser(labUser);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!passwordUser || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          userId: passwordUser.user_id,
          newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Password reset successfully");
      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword("");
    } catch (error: unknown) {
      console.error("Error resetting password:", error);
      const message = error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleImpersonate = (labId: string, labName: string, labRole: string) => {
    startLabImpersonation(labId, labName, labRole);
    navigate("/lab/dashboard");
    toast.success(`Now viewing as ${labName} (${labRole})`);
  };

  const handleEditClick = (labUser: LabUser) => {
    setEditingLabUser(labUser);
    setSelectedLabId(labUser.lab_id);
    setSelectedRole(labUser.role);
    setEditEmail(labUser.email || "");
    setEditDialogOpen(true);
  };

  const handleUpdateLabUser = async () => {
    if (!editingLabUser || !selectedLabId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUpdating(true);
    try {
      // Check if email changed
      const emailChanged = editEmail && editEmail !== editingLabUser.email;
      
      if (emailChanged) {
        const { data, error: emailError } = await supabase.functions.invoke("update-user-email", {
          body: {
            userId: editingLabUser.user_id,
            newEmail: editEmail,
          },
        });

        if (emailError) throw emailError;
        if (data?.error) throw new Error(data.error);
      }

      // Update lab_users record
      const { error } = await supabase
        .from("lab_users")
        .update({
          lab_id: selectedLabId,
          role: selectedRole,
        })
        .eq("id", editingLabUser.id);

      if (error) throw error;

      toast.success("Lab user updated successfully");
      setEditDialogOpen(false);
      setEditingLabUser(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error updating lab user:", error);
      toast.error(error.message || "Failed to update lab user");
    } finally {
      setUpdating(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setSelectedLabId("");
    setSelectedRole("member");
    setEditEmail("");
  };

  if (roleLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lab User Management</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage lab portal accounts
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Lab User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lab Users</CardTitle>
            <CardDescription>
              Accounts with access to the lab portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Lab</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No lab users yet
                    </TableCell>
                  </TableRow>
                ) : (
                  labUsers.map((labUser) => (
                    <TableRow key={labUser.id}>
                      <TableCell className="font-medium">{labUser.email}</TableCell>
                      <TableCell>{(labUser.labs as any)?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{labUser.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={labUser.is_active ? "default" : "secondary"}>
                          {labUser.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(labUser.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImpersonate(labUser.lab_id, (labUser.labs as any)?.name, labUser.role)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View lab portal as this lab</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditClick(labUser)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit lab user</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePasswordClick(labUser)}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reset password</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(labUser.id, labUser.is_active)}
                          >
                            {labUser.is_active ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(labUser)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Lab User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Lab User</DialogTitle>
              <DialogDescription>
                Create a new account for a lab to access the lab portal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="lab@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lab">Lab</Label>
                <Select value={selectedLabId} onValueChange={setSelectedLabId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {labs.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateLabUser} disabled={creating}>
                {creating ? "Creating..." : "Create Lab User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Lab User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingLabUser(null);
            resetForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Lab User</DialogTitle>
              <DialogDescription>
                Update lab assignment and role for {editingLabUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-lab">Lab</Label>
                <Select value={selectedLabId} onValueChange={setSelectedLabId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {labs.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLabUser} disabled={updating}>
                {updating ? "Updating..." : "Update Lab User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lab User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {userToDelete?.email}? This will permanently remove
                their account and access to the lab portal. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLabUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {passwordUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={isResettingPassword}>
                {isResettingPassword ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
