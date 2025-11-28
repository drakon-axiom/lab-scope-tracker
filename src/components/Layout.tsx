import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [mfaChecked, setMfaChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-state');
    return saved !== 'collapsed';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check MFA status and enforce it
  useEffect(() => {
    const checkAndEnforceMFA = async () => {
      if (!user) return;
      
      // Skip MFA check for MFA setup and settings pages
      const currentPath = window.location.pathname;
      if (currentPath === "/mfa-setup" || currentPath === "/settings") {
        setMfaChecked(true);
        return;
      }

      try {
        const { data: factors, error } = await supabase.auth.mfa.listFactors();
        
        if (error) {
          console.error("Error checking MFA status:", error);
          setMfaChecked(true);
          return;
        }

        const hasVerifiedMFA = factors?.totp?.some(
          (factor) => factor.status === "verified"
        );

        if (!hasVerifiedMFA) {
          toast({
            title: "2FA Required",
            description: "Please set up two-factor authentication to continue.",
            variant: "destructive",
          });
          navigate("/mfa-setup");
        } else {
          setMfaChecked(true);
        }
      } catch (error) {
        console.error("Error enforcing MFA:", error);
        setMfaChecked(true);
      }
    };

    checkAndEnforceMFA();
  }, [user, navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  if (!user || !mfaChecked) {
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
          <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <SidebarTrigger />
            </div>
          </header>
          
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="container mx-auto">
              <Breadcrumbs />
            </div>
          </div>
          
          <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
