import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";

export default function Progress() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) return null;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Progress Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Track your strength gains and performance metrics
          </p>
        </div>

        {/* Honest placeholder: no analytics endpoint exists yet for 1RM, RPE,
            PRs, or historical volume, so we don't fabricate numbers here. */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics Coming Soon</CardTitle>
            <CardDescription>
              We're not tracking 1RM progression, average RPE, personal records, or
              volume trends yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={TrendingUp}
              title="Nothing to show yet"
              description="Once workout analytics are available, your strength gains and performance metrics will appear here."
              variant="inline"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
