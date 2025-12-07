import { TestTube2, LayoutDashboard, Package, FlaskConical, FileCheck, FileText, Upload, Settings, LogOut, Bell, Users, Shield, UserPlus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Quotes", url: "/quotes", icon: FileText },
  { title: "Compounds", url: "/compounds", icon: FileCheck },
  { title: "Labs", url: "/labs", icon: FlaskConical },
];

const utilityNavItems = [
  { title: "Bulk Import", url: "/bulk-import", icon: Upload },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

const adminNavItems = [
  { title: "User Management", url: "/user-management", icon: Users },
  { title: "Lab Users", url: "/lab-user-management", icon: Users },
  { title: "Waitlist", url: "/waitlist-management", icon: UserPlus },
  { title: "Security Settings", url: "/security-settings", icon: Shield },
];

interface AppSidebarProps {
  user: User | null;
  onSignOut: () => void;
}

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { role, isAdmin } = useUserRole();
  const { isImpersonatingCustomer, impersonatedUser } = useImpersonation();

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // When impersonating a customer, show subscriber-level navigation
  const effectiveIsAdmin = isAdmin && !isImpersonatingCustomer;

  // Filter nav items based on role (or impersonated role)
  const visibleMainNavItems = mainNavItems.filter(item => {
    if (effectiveIsAdmin) return true; // Admins (not impersonating) see everything
    // Subscribers can only see Dashboard and Quotes
    return item.url === "/dashboard" || item.url === "/quotes";
  });

  const visibleUtilityNavItems = utilityNavItems.filter(item => {
    if (effectiveIsAdmin) return true; // Admins (not impersonating) see everything
    // Subscribers can see Notifications but not Bulk Import
    return item.url === "/notifications";
  });

  const visibleAdminNavItems = effectiveIsAdmin ? adminNavItems : [];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SafeBatch" className="h-8 w-8 flex-shrink-0" />
          {!collapsed && <span className="font-bold text-lg">SafeBatch</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className="hover:bg-muted/50" 
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleUtilityNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Utilities</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleUtilityNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          className="hover:bg-muted/50" 
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <Icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleAdminNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          className="hover:bg-muted/50" 
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <Icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {user && (
        <SidebarFooter className="border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(isImpersonatingCustomer ? (impersonatedUser?.email || "U") : (user.email || "U"))}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 overflow-hidden text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {isImpersonatingCustomer ? impersonatedUser?.email : user.email}
                        </p>
                      </div>
                      {isImpersonatingCustomer ? (
                        <Badge variant="outline" className="mt-1 text-xs border-amber-500 text-amber-600">
                          Viewing as Subscriber
                        </Badge>
                      ) : role && (
                        <Badge 
                          variant={role === "admin" ? "default" : "secondary"} 
                          className="mt-1 text-xs"
                        >
                          {role === "admin" ? "Admin" : "Subscriber"}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
