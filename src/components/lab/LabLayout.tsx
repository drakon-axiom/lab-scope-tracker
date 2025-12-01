import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Package,
  FlaskConical,
  Settings,
  Bell,
  LogOut,
  Menu,
  Beaker,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useLabUser } from "@/hooks/useLabUser";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { LabMobileBottomNav } from "@/components/lab/LabMobileBottomNav";

interface LabLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/lab/dashboard" },
  { icon: FileText, label: "Quote Requests", path: "/lab/quotes" },
  { icon: CreditCard, label: "Payments", path: "/lab/payments" },
  { icon: Package, label: "Shipping", path: "/lab/shipping" },
  { icon: FlaskConical, label: "Results", path: "/lab/results" },
  { icon: Settings, label: "Lab Settings", path: "/lab/settings" },
  { icon: Bell, label: "Notifications", path: "/lab/notifications" },
];

export default function LabLayout({ children }: LabLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { labUser, loading, isImpersonating } = useLabUser();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stopImpersonating = () => {
    sessionStorage.removeItem("impersonatedLabId");
    sessionStorage.removeItem("impersonatedLabName");
    navigate("/lab-user-management");
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/lab/auth");
      } else {
        setUser(user);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/lab/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/lab/auth");
  };

  if (loading || !user || !labUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Beaker className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lab portal...</p>
        </div>
      </div>
    );
  }

  const NavContent = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-amber-500/10 border-amber-500">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              <strong>Admin Mode:</strong> You are viewing as {labUser?.lab_name}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={stopImpersonating}
              className="h-6 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Exit
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex items-center gap-2 mb-8">
                  <Beaker className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">Lab Portal</span>
                </div>
                <nav className="flex flex-col gap-2">
                  <NavContent />
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <Beaker className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg hidden sm:inline">Lab Portal</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {labUser.lab_name?.[0] || "L"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm hidden md:flex">
                  <span className="font-medium">{labUser.lab_name || "Lab"}</span>
                  <span className="text-xs text-muted-foreground">{labUser.role}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Lab Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/lab/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 border-r min-h-[calc(100vh-4rem)] bg-muted/30">
          <nav className="flex flex-col gap-2 p-4">
            <NavContent />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <LabMobileBottomNav />
    </div>
  );
}
