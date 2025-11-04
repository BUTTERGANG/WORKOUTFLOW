import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">An unexpected error occurred. We apologize for the inconvenience.</p>
        <pre className="mt-4 text-sm text-left p-4 bg-muted rounded-md overflow-auto max-h-40 mb-4">
          {error.message}
        </pre>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleGoHome} variant="outline">
            Go Home
          </Button>
          <Button onClick={resetErrorBoundary}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Onboarding from "@/pages/onboarding";
import JoinTeam from "@/pages/join-team";
import JoinViaInvite from "@/pages/join-via-invite";
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

  // Show landing, login, and registration pages if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Show authenticated app with sidebar
  const style = {
    "--sidebar-width": "16rem",       // 256px
    "--sidebar-width-icon": "3rem",   // 48px (default icon width)
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col w-full">
          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/onboarding" component={Onboarding} />
              <Route path="/join-team" component={JoinTeam} />
              <Route path="/join/:inviteCode" component={JoinViaInvite} />
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
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <AppProvider>
              <Router />
              <Toaster />
            </AppProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
