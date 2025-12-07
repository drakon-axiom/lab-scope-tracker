import LabLayout from "@/components/lab/LabLayout";
import { LabUserManagement } from "@/components/lab/LabUserManagement";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export default function LabUsers() {
  const permissions = useLabPermissions();

  if (!permissions.canManageLabUsers) {
    return (
      <LabLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Lab Users</h1>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage lab users. Only lab admins can access this page.
            </AlertDescription>
          </Alert>
        </div>
      </LabLayout>
    );
  }

  return (
    <LabLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Lab Users</h1>
        <LabUserManagement />
      </div>
    </LabLayout>
  );
}
