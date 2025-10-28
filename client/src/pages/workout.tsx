import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Plus, Minus, Timer, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Workout() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<number>(5);
  const [rpe, setRpe] = useState<string>("7");
  const [restTime, setRestTime] = useState<number>(180);
  const [isResting, setIsResting] = useState(false);

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

  const handleLogSet = () => {
    toast({
      title: "Set logged",
      description: `${weight} lbs × ${reps} reps @ RPE ${rpe}`,
    });
    setIsResting(true);
    // Reset after logging
  };

  // Calculate plate loading for barbell
  const calculatePlates = (totalWeight: number) => {
    const barWeight = 45; // Standard barbell
    const weightPerSide = (totalWeight - barWeight) / 2;
    
    if (weightPerSide <= 0) return [];
    
    const plates = [45, 35, 25, 10, 5, 2.5];
    const result: number[] = [];
    let remaining = weightPerSide;
    
    for (const plate of plates) {
      while (remaining >= plate) {
        result.push(plate);
        remaining -= plate;
      }
    }
    
    return result;
  };

  const plates = weight ? calculatePlates(parseFloat(weight) || 0) : [];

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto max-w-4xl p-4">
        {/* Workout Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Today's Workout</h1>
            <Badge variant="outline" data-testid="badge-workout-status">
              No Active Session
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            No workout scheduled. Check with your coach for program assignment.
          </p>
        </div>

        {/* Sample Exercise Card - Mobile Optimized */}
        <Card className="mb-6">
          <CardHeader className="space-y-0 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Back Squat</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  5 sets × 5 reps @ 75%
                </p>
              </div>
              <Dumbbell className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exercise History */}
            <div>
              <h3 className="mb-3 text-sm font-medium">Previous Performance</h3>
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                  <div>Date</div>
                  <div className="text-right">Weight</div>
                  <div className="text-right">Reps</div>
                  <div className="text-right">RPE</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>Last week</div>
                  <div className="text-right font-mono">225</div>
                  <div className="text-right font-mono">5</div>
                  <div className="text-right font-mono">8</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm text-muted-foreground">
                  <div>2 weeks ago</div>
                  <div className="text-right font-mono">220</div>
                  <div className="text-right font-mono">5</div>
                  <div className="text-right font-mono">7</div>
                </div>
              </div>
            </div>

            {/* Set Logger - Large Touch Targets */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Log Current Set</h3>
              
              {/* Weight Input */}
              <div className="grid gap-2">
                <Label htmlFor="weight" className="text-base">Weight (lbs)</Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    placeholder="225"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-12 text-lg font-mono"
                    data-testid="input-weight"
                  />
                  <Select defaultValue="lbs">
                    <SelectTrigger className="h-12 w-20" data-testid="select-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lbs">lbs</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Plate Calculator */}
              {plates.length > 0 && (
                <div className="rounded-lg bg-primary/10 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">Per Side:</span>
                    <span className="font-mono text-primary">
                      {plates.map((p, i) => (
                        <span key={i}>{i > 0 && ' + '}{p}</span>
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {/* Reps Input with Quick Buttons */}
              <div className="grid gap-2">
                <Label htmlFor="reps" className="text-base">Reps</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setReps(Math.max(1, reps - 1))}
                    data-testid="button-decrease-reps"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="reps"
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                    className="h-12 text-center text-lg font-mono"
                    data-testid="input-reps"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setReps(reps + 1)}
                    data-testid="button-increase-reps"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* RPE Selector */}
              <div className="grid gap-2">
                <Label htmlFor="rpe" className="text-base">RPE (Rate of Perceived Exertion)</Label>
                <Select value={rpe} onValueChange={setRpe}>
                  <SelectTrigger className="h-12 text-base" id="rpe" data-testid="select-rpe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        RPE {num} {num >= 9 ? '(Very Hard)' : num >= 7 ? '(Hard)' : num >= 5 ? '(Moderate)' : '(Easy)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button - Full Width */}
              <Button
                onClick={handleLogSet}
                className="h-12 w-full text-base font-medium"
                data-testid="button-log-set"
                disabled={!weight || !reps}
              >
                Log Set
              </Button>
            </div>

            {/* Rest Timer */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Rest Timer</span>
                </div>
                <span className="font-mono text-2xl font-bold">
                  {Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Button
                variant={isResting ? "destructive" : "secondary"}
                className="w-full"
                onClick={() => setIsResting(!isResting)}
                data-testid="button-rest-timer"
              >
                {isResting ? 'Stop Rest' : 'Start Rest'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
