import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle,
  Settings,
  LogOut,
  Menu,
  Beaker,
  Eye,
  X,
  Users,
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
import { useImpersonation } from "@/hooks/useImpersonation";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LabMobileBottomNav } from "@/components/lab/LabMobileBottomNav";
import { Badge } from "@/components/ui/badge";

interface LabLayoutProps {
  children: ReactNode;
}

// Core nav items for all users
const coreNavItems = [
  { icon: FileText, label: "Open Requests", path: "/lab/requests" },
  { icon: CheckCircle, label: "Completed", path: "/lab/completed" },
];

// Additional nav items for managers and admins
const managerNavItems = [
  { icon: Settings, label: "Settings", path: "/lab/settings" },
];

// Admin-only nav items
const adminOnlyNavItems = [
  { icon: Users, label: "Lab Users", path: "/lab/users" },
];

export default function LabLayout({ children }: LabLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { labUser, loading, isImpersonating } = useLabUser();
  const { stopImpersonation } = useImpersonation();
  const permissions = useLabPermissions();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const handleStopImpersonating = () => {
    stopImpersonation();
    navigate("/lab-user-management");
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/lab/auth");
      } else {
        setUser(user);
        // Fetch username from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (profile?.username) {
          setUsername(profile.username);
        }
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

  const canAccessSettings = permissions.role === "manager" || permissions.role === "admin";
  const canManageUsers = permissions.canManageLabUsers;
  
  // Build nav items based on permissions
  let navItems = [...coreNavItems];
  if (canAccessSettings) {
    navItems = [...navItems, ...managerNavItems];
  }
  if (canManageUsers) {
    navItems = [...navItems, ...adminOnlyNavItems];
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
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">
              Viewing as lab: <strong>{labUser?.lab_name}</strong>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopImpersonating}
            className="h-7 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
          >
            <X className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>
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
              {canAccessSettings && (
                <DropdownMenuItem onClick={() => navigate("/lab/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              {canAccessSettings && <DropdownMenuSeparator />}
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
          
          {/* User info in sidebar footer */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div>
                <p className="text-sm font-medium truncate">{username || user?.email}</p>
                {username && user?.email && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Role:</p>
                <Badge variant="outline" className="capitalize text-xs">
                  {permissions.role || "Unknown"}
                </Badge>
              </div>
            </div>
          </div>
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
