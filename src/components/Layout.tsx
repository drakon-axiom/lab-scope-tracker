import { ReactNode, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: ReactNode;
}

// Memoized impersonation banner
const ImpersonationBanner = memo(({ 
  impersonatedUser, 
  onStop 
}: { 
  impersonatedUser: any; 
  onStop: () => void;
}) => (
  <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Eye className="h-4 w-4" />
      <span className="text-sm font-medium">
        Viewing as {impersonatedUser.type === "customer" ? "customer" : "lab"}:{" "}
        <strong>{impersonatedUser.name || impersonatedUser.email || impersonatedUser.labName}</strong>
      </span>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={onStop}
      className="h-7 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
    >
      <X className="h-4 w-4 mr-1" />
      Stop
    </Button>
  </div>
));
ImpersonationBanner.displayName = "ImpersonationBanner";

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-state');
    return saved !== 'collapsed';
  });
  const { isAdmin } = useUserRole();
  const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
      duration: 3000,
    });
    navigate("/auth");
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    toast({
      title: "Stopped impersonation",
      description: "You are now viewing as yourself",
      duration: 3000,
    });
    navigate("/users");
  };

  // Don't render until we know auth state
  if (authLoading || !user) {
    return null;
  }

  return (
    <SidebarProvider 
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarOpen(open);
        localStorage.setItem('sidebar-state', open ? 'expanded' : 'collapsed');
      }}
    >
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} onSignOut={handleSignOut} />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Impersonation Banner */}
          {isImpersonating && impersonatedUser && (
            <ImpersonationBanner 
              impersonatedUser={impersonatedUser} 
              onStop={handleStopImpersonation} 
            />
          )}
          
          <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
            <div className="flex items-center justify-between px-3 md:px-4 py-3">
              <SidebarTrigger />
              {isAdmin && !isImpersonating && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>
          </header>
          
          <div className="border-b bg-muted/30 px-3 md:px-4 py-2 md:py-3">
            <div className="container mx-auto">
              <Breadcrumbs />
            </div>
          </div>
          
          <main className="flex-1 container mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8 pb-20 md:pb-8">{children}</main>
        </div>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default memo(Layout);
