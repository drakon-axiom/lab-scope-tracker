import { LayoutDashboard, FileText, CreditCard, Package, FlaskConical, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";

export function LabMobileBottomNav() {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <NavLink
          to="/lab/dashboard"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-xs">Dashboard</span>
        </NavLink>
        
        <NavLink
          to="/lab/quotes"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Quotes</span>
        </NavLink>
        
        <NavLink
          to="/lab/payments"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-xs">Payments</span>
        </NavLink>
        
        <NavLink
          to="/lab/shipping"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <Package className="h-5 w-5" />
          <span className="text-xs">Shipping</span>
        </NavLink>
        
        <NavLink
          to="/lab/results"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          activeClassName="text-primary bg-muted/50"
        >
          <FlaskConical className="h-5 w-5" />
          <span className="text-xs">Results</span>
        </NavLink>
        
        <NavLink
          to="/lab/settings"
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
