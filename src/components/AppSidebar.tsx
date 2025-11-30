import { TestTube2, LayoutDashboard, Package, FlaskConical, FileCheck, FileText, Upload, Settings, LogOut, Bell, Users } from "lucide-react";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
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

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // Filter nav items based on role
  const visibleMainNavItems = mainNavItems.filter(item => {
    if (isAdmin) return true; // Admins see everything
    // Subscribers can only see Dashboard and Quotes
    return item.url === "/" || item.url === "/quotes";
  });

  const visibleUtilityNavItems = utilityNavItems.filter(item => {
    if (isAdmin) return true; // Admins see everything
    // Subscribers can see Notifications but not Bulk Import
    return item.url === "/notifications";
  });

  const visibleAdminNavItems = isAdmin ? adminNavItems : [];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <TestTube2 className="h-6 w-6 text-primary flex-shrink-0" />
          {!collapsed && <span className="font-bold text-lg">Testing Tracker</span>}
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
        <SidebarFooter className="border-t p-3 space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Settings</span>}
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

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.email || "U")}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                {role && (
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
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
