import { FileText, CheckCircle, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLabPermissions } from "@/hooks/useLabPermissions";

export function LabMobileBottomNav() {
  const isMobile = useIsMobile();
  const permissions = useLabPermissions();

  if (!isMobile) return null;

  const canAccessSettings = permissions.role === "manager" || permissions.role === "admin";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <NavLink
          to="/lab/requests"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Open</span>
        </NavLink>
        
        <NavLink
          to="/lab/completed"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs">Completed</span>
        </NavLink>
        
        {canAccessSettings && (
          <NavLink
            to="/lab/settings"
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
            activeClassName="text-primary bg-muted/50"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}