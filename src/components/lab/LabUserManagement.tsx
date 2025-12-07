import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Edit, UserCog } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface LabUserData {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  email?: string;
}

export function LabUserManagement() {
  const { labUser } = useLabUser();
  const permissions = useLabPermissions();
  const [labUsers, setLabUsers] = useState<LabUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LabUserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("member");
  const [editRole, setEditRole] = useState<string>("member");

  const fetchLabUsers = async () => {
    if (!labUser?.lab_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lab_users")
        .select("id, user_id, role, is_active, created_at")
        .eq("lab_id", labUser.lab_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch emails for each user
      const usersWithEmails = await Promise.all(
        (data || []).map(async (user) => {
          try {
            const { data: emailData } = await supabase.functions.invoke(
              "get-lab-user-email",
              { body: { userId: user.user_id } }
            );
            return { ...user, email: emailData?.email || "Unknown" };
          } catch {
            return { ...user, email: "Unknown" };
          }
        })
      );

      setLabUsers(usersWithEmails);
    } catch (error) {
      console.error("Error fetching lab users:", error);
      toast.error("Failed to load lab users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions.canManageLabUsers) {
      fetchLabUsers();
    }
  }, [labUser?.lab_id, permissions.canManageLabUsers]);

  const handleCreateUser = async () => {
    if (!labUser?.lab_id || !newEmail || !newPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lab-user", {
        body: {
          email: newEmail,
          password: newPassword,
          role: newRole,
          labId: labUser.lab_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Lab user created successfully");
      setShowCreateDialog(false);
      resetForm();
      fetchLabUsers();
    } catch (error: any) {
      console.error("Error creating lab user:", error);
      toast.error(error.message || "Failed to create lab user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("lab_users")
        .update({ role: editRole })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("User role updated successfully");
      setShowEditDialog(false);
      setSelectedUser(null);
      fetchLabUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update user role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: LabUserData) => {
    try {
      const { error } = await supabase
        .from("lab_users")
        .update({ is_active: !user.is_active })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`User ${user.is_active ? "deactivated" : "activated"} successfully`);
      fetchLabUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-lab-user", {
        body: { labUserId: selectedUser.id, userId: selectedUser.user_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Lab user deleted successfully");
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchLabUsers();
    } catch (error: any) {
      console.error("Error deleting lab user:", error);
      toast.error(error.message || "Failed to delete lab user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewRole("member");
  };

  const openEditDialog = (user: LabUserData) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: LabUserData) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  if (!permissions.canManageLabUsers) {
    return null;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Users className="h-5 w-5" />
                Lab Users
              </CardTitle>
              <CardDescription className="text-sm">
                Manage users who can access your lab portal
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : labUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No lab users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    labUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "outline"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(user)}
                              title={user.is_active ? "Deactivate" : "Activate"}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                              title="Edit role"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(user)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lab User</DialogTitle>
            <DialogDescription>
              Create a new user account with access to this lab portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (Read-only)</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="editRole">Role</Label>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member (Read-only)</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This will remove their access to the lab portal and delete their account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
