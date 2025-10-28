import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Programs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isCoach = user.role === 'admin' || user.role === 'head_coach' || user.role === 'assistant_coach';

  if (!isCoach) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only coaches can access program management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Programs</h1>
            <p className="mt-2 text-muted-foreground">
              Create and manage training programs for your athletes
            </p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-program" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
                <DialogDescription>
                  Design a new training program for your athletes
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., 12-Week Strength Block"
                    data-testid="input-program-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the program goals and structure..."
                    rows={3}
                    data-testid="input-program-description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="12"
                    min="1"
                    max="52"
                    data-testid="input-program-duration"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phase">Training Phase</Label>
                  <Select>
                    <SelectTrigger id="phase" data-testid="select-program-phase">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                      <SelectItem value="peaking">Peaking</SelectItem>
                      <SelectItem value="deload">Deload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-program"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast({
                      title: "Program created",
                      description: "Your training program has been created successfully.",
                    });
                    setCreateDialogOpen(false);
                  }}
                  data-testid="button-save-program"
                >
                  Create Program
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Programs List - Empty State */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">No programs yet</h3>
          <p className="mb-6 text-center text-muted-foreground">
            Get started by creating your first training program
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            data-testid="button-create-first-program"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Your First Program
          </Button>
        </div>

        {/* Sample Program Cards (hidden for now since empty) */}
        <div className="mt-8 hidden grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover-elevate cursor-pointer">
            <CardHeader>
              <div className="mb-2 flex items-start justify-between">
                <CardTitle className="text-lg">12-Week Strength Block</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>Progressive overload strength program</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>12 weeks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>5 athletes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
