import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";

// Pages
import Landing from "@/pages/landing";
import Register from "@/pages/register";
import Onboarding from "@/pages/onboarding";
import JoinTeam from "@/pages/join-team";
import Dashboard from "@/pages/dashboard";
import Programs from "@/pages/programs";
import Workout from "@/pages/workout";
import Athletes from "@/pages/athletes";
import Progress from "@/pages/progress";
import Messages from "@/pages/messages";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Show registration if authenticated but profile incomplete
  if (!user?.firstName || !user?.lastName) {
    return (
      <Switch>
        <Route path="/" component={Register} />
        <Route path="/register" component={Register} />
        <Route component={Register} />
      </Switch>
    );
  }

  // Show authenticated app with sidebar
  return (
    <>
      <AppSidebar />
      <div className="flex w-full flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-background px-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </header>
        <main className="flex-1 overflow-hidden">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/join-team" component={JoinTeam} />
            <Route path="/programs" component={Programs} />
            <Route path="/workout" component={Workout} />
            <Route path="/athletes" component={Athletes} />
            <Route path="/progress" component={Progress} />
            <Route path="/messages" component={Messages} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </>
  );
}

export default function App() {
  // Custom sidebar width for workout application
  const style = {
    "--sidebar-width": "16rem",       // 256px
    "--sidebar-width-icon": "3rem",   // 48px (default icon width)
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppProvider>
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <Router />
              </div>
            </SidebarProvider>
            <Toaster />
          </AppProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
