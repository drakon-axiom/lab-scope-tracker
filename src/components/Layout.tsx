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
import { MobileBottomNav } from "@/components/MobileBottomNav";

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

  // Set mfaChecked to true immediately - MFA is optional
  useEffect(() => {
    setMfaChecked(true);
  }, []);

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
            <div className="flex items-center justify-between px-3 md:px-4 py-3">
              <SidebarTrigger />
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

export default Layout;
