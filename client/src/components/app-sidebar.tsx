import { useLocation } from "wouter";
import {
  Building2,
  Users,
  FileText,
  Dumbbell,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Building2,
      roles: ['admin', 'head_coach', 'assistant_coach', 'athlete'],
    },
    {
      title: "Programs",
      url: "/programs",
      icon: FileText,
      roles: ['admin', 'head_coach', 'assistant_coach'],
    },
    {
      title: "Workout",
      url: "/workout",
      icon: Dumbbell,
      roles: ['athlete'],
    },
    {
      title: "Athletes",
      url: "/athletes",
      icon: Users,
      roles: ['admin', 'head_coach', 'assistant_coach'],
    },
    {
      title: "Progress",
      url: "/progress",
      icon: TrendingUp,
      roles: ['admin', 'head_coach', 'assistant_coach', 'athlete'],
    },
    {
      title: "Messages",
      url: "/messages",
      icon: MessageSquare,
      roles: ['admin', 'head_coach', 'assistant_coach', 'athlete'],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      roles: ['admin', 'head_coach', 'assistant_coach', 'athlete'],
    },
  ];

  const visibleItems = navItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'head_coach': return 'secondary';
      case 'assistant_coach': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Dumbbell className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">Workout Pro</span>
            <span className="text-xs text-muted-foreground">Team Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex w-full items-center gap-3 rounded-lg p-2 hover-elevate active-elevate-2"
                data-testid="button-user-menu"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profileImageUrl || undefined} style={{ objectFit: 'cover' }} />
                  <AvatarFallback>
                    {user.firstName?.[0] || user.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col overflow-hidden text-left">
                  <span className="truncate text-sm font-medium">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email || 'User'}
                  </span>
                  {user.role && (
                    <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1 w-fit text-xs">
                      {getRoleLabel(user.role)}
                    </Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/settings" data-testid="link-settings">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer" 
                data-testid="link-logout"
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Logout failed:', error);
                  }
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
