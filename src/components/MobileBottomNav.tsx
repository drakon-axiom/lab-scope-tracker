import { Home, TestTube2, Building2, FileText, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRole();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16">
        <NavLink
          to="/"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </NavLink>
        
        <NavLink
          to="/quotes"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Quotes</span>
        </NavLink>
        
        {isAdmin && (
          <>
            <NavLink
              to="/compounds"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
              activeClassName="text-primary bg-muted/50"
            >
              <TestTube2 className="h-5 w-5" />
              <span className="text-xs">Compounds</span>
            </NavLink>
            
            <NavLink
              to="/labs"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
              activeClassName="text-primary bg-muted/50"
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs">Labs</span>
            </NavLink>
          </>
        )}
        
        <NavLink
          to="/settings"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
