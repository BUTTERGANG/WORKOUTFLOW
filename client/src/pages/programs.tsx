import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, Users, ChevronRight, Trash2, Pencil, Check, ChevronsUpDown } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Program, ProgramWeek, ProgramDay, ProgramExercise, Exercise } from "@shared/schema";

export default function Programs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentOrganization } = useApp();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [programDuration, setProgramDuration] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const res = await fetch(`/api/programs?organizationId=${currentOrganization.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch programs');
      return res.json();
    },
    enabled: !!currentOrganization,
  });

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
    enabled: !!currentOrganization,
  });

  const createProgramMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; durationWeeks: number; organizationId: string }) => {
      // Create the program
      const program = await apiRequest<Program>("/api/programs", {
        method: "POST",
        body: data,
      });
      
      // Auto-populate all weeks based on duration
      const weekPromises = [];
      for (let i = 1; i <= data.durationWeeks; i++) {
        weekPromises.push(
          apiRequest(`/api/programs/${program.id}/weeks`, {
            method: "POST",
            body: { weekNumber: i },
          })
        );
      }
      
      // Wait for all weeks to be created
      await Promise.all(weekPromises);
      
      return program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', currentOrganization?.id] });
      toast({ title: "Success", description: `Program created with ${program.durationWeeks} weeks` });
      setCreateDialogOpen(false);
      setProgramName("");
      setProgramDescription("");
      setProgramDuration("");
      setSelectedProgram(program);
      setBuildDialogOpen(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create program", variant: "destructive" });
    },
  });

  const handleCreateProgram = () => {
    if (!programName.trim() || !programDuration || !currentOrganization) return;
    createProgramMutation.mutate({
      name: programName,
      description: programDescription,
      durationWeeks: parseInt(programDuration),
      organizationId: currentOrganization.id,
    });
  };

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

  if (!currentOrganization) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Organization Selected</CardTitle>
            <CardDescription>
              Please select or create an organization to manage programs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-4">
        {/* Header - Mobile-First */}
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Programs</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Create and manage training programs for your athletes
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="button-create-program" 
                className="h-12 w-full gap-2 text-base sm:h-10 sm:w-auto sm:text-sm"
                size="default"
              >
                <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Create New Program</DialogTitle>
                <DialogDescription className="text-base">
                  Build a structured training program for your athletes
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-3">
                  <Label htmlFor="programName" className="text-base">Program Name</Label>
                  <Input
                    id="programName"
                    placeholder="e.g., Strength & Conditioning - Week 1-12"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    data-testid="input-program-name"
                    className="h-12 text-base"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="description" className="text-base">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Program goals and overview..."
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    data-testid="input-program-description"
                    className="min-h-[120px] text-base"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="duration" className="text-base">Duration (Weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="52"
                    placeholder="12"
                    value={programDuration}
                    onChange={(e) => setProgramDuration(e.target.value)}
                    data-testid="input-program-duration"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleCreateProgram}
                  disabled={!programName.trim() || !programDuration}
                  data-testid="button-submit-program"
                  className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm"
                >
                  Create & Build Program
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Programs Grid */}
        {programsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-muted-foreground">Loading programs...</p>
            </div>
          </div>
        ) : !programs || programs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Programs Yet</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Create your first training program to get started
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                Create Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Card
                key={program.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => {
                  setSelectedProgram(program);
                  setBuildDialogOpen(true);
                }}
                data-testid={`card-program-${program.id}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-base truncate">{program.name}</CardTitle>
                      {program.description && (
                        <CardDescription className="mt-2 line-clamp-2 text-sm">
                          {program.description}
                        </CardDescription>
                      )}
                    </div>
                    <ChevronRight className="h-6 w-6 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1 h-7 px-3 text-sm">
                      <Calendar className="h-4 w-4" />
                      {program.durationWeeks} weeks
                    </Badge>
                    {program.phase && (
                      <Badge variant="outline" className="h-7 px-3 text-sm">{program.phase}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Program Builder Dialog */}
        <ProgramBuilderDialog
          program={selectedProgram}
          open={buildDialogOpen}
          onOpenChange={setBuildDialogOpen}
          exercises={exercises || []}
        />
      </div>
    </div>
  );
}

// Program Builder Dialog Component
function ProgramBuilderDialog({
  program,
  open,
  onOpenChange,
  exercises,
}: {
  program: Program | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
}) {
  const { toast } = useToast();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editDayName, setEditDayName] = useState("");

  // Fetch program weeks
  const { data: programWeeks, isLoading: weeksLoading } = useQuery<(ProgramWeek & { days: (ProgramDay & { exercises: (ProgramExercise & { exercise: Exercise })[] })[] })[]>({
    queryKey: ['/api/programs', program?.id, 'weeks'],
    enabled: !!program && open,
  });

  const addDayMutation = useMutation({
    mutationFn: async ({ weekId, dayNumber, name }: { weekId: string; dayNumber: number; name: string }) => {
      return await apiRequest<ProgramDay>(`/api/weeks/${weekId}/days`, {
        method: "POST",
        body: { dayNumber, name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program?.id, 'weeks'] });
      toast({ title: "Day added successfully" });
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (data: { dayId: string; exerciseId: string; order: number; sets: number; reps: string; intensity?: string; notes?: string }) => {
      return await apiRequest<ProgramExercise>(`/api/days/${data.dayId}/exercises`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program?.id, 'weeks'] });
      toast({ title: "Exercise added successfully" });
      setSelectedDayId(null);
    },
  });

  if (!program) return null;

  // Flatten all days from all weeks for card-based display
  const allDays = programWeeks?.flatMap((week) =>
    (week.days || []).map((day) => ({
      ...day,
      weekNumber: week.weekNumber,
      weekId: week.id,
    }))
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl">{program.name}</DialogTitle>
          <DialogDescription className="text-base">
            {program.durationWeeks} week program • Add and manage workout days
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {weeksLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Loading weeks...</p>
              </div>
            </div>
          ) : !programWeeks || programWeeks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Weeks are being set up for your program...
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Day Cards */}
              {allDays.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No Workout Days Yet</h3>
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      Start by adding workout days to any week
                    </p>
                  </CardContent>
                </Card>
              ) : (
                allDays.map((day) => (
                  <Card key={day.id} className="bg-muted/30" data-testid={`card-day-${day.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left side - Day info */}
                        <div className="flex gap-3 flex-1 min-w-0">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingDayId === day.id ? (
                              <div className="flex gap-2 mb-2">
                                <Input
                                  value={editDayName}
                                  onChange={(e) => setEditDayName(e.target.value)}
                                  className="h-8 text-sm"
                                  data-testid={`input-edit-day-name-${day.id}`}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Implement update day API
                                    toast({ title: "Update day feature coming soon" });
                                    setEditingDayId(null);
                                  }}
                                  data-testid={`button-save-day-${day.id}`}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingDayId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-base">{day.name}</h3>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-11 w-11 sm:h-8 sm:w-8"
                                    onClick={() => {
                                      setEditingDayId(day.id);
                                      setEditDayName(day.name || "");
                                    }}
                                    data-testid={`button-edit-day-${day.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Week {day.weekNumber}
                                  {program.phase && ` • ${program.phase}`}
                                </p>
                              </>
                            )}
                            
                            {/* Exercise List */}
                            {day.exercises && day.exercises.length > 0 && (
                              <ul className="mt-3 space-y-1.5">
                                {day.exercises
                                  .sort((a, b) => a.order - b.order)
                                  .map((ex) => (
                                    <li key={ex.id} className="flex items-start gap-2 text-sm">
                                      <span className="text-muted-foreground mt-1">•</span>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-foreground">{ex.exercise.name}</span>
                                        {(ex.sets || ex.reps || ex.intensity) && (
                                          <span className="text-muted-foreground ml-2">
                                            {ex.sets && ex.reps && `${ex.sets} × ${ex.reps}`}
                                            {ex.intensity && ` @ ${ex.intensity}`}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Right side - Action button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDayId(day.id)}
                          data-testid={`button-edit-workout-${day.id}`}
                          className="flex-shrink-0"
                        >
                          {day.exercises && day.exercises.length > 0 ? 'Edit workout' : 'Add exercises'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Add New Day Sections by Week */}
              {programWeeks.map((week) => (
                <Card key={week.id} className="border-dashed">
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        const nextDay = (week.days?.length || 0) + 1;
                        addDayMutation.mutate({
                          weekId: week.id,
                          dayNumber: nextDay,
                          name: `Day ${nextDay}`,
                        });
                      }}
                      data-testid={`button-add-day-week-${week.weekNumber}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Day to Week {week.weekNumber}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Exercise Dialog */}
        {selectedDayId && (
          <AddExerciseDialog
            day={allDays.find((d) => d.id === selectedDayId)!}
            exercises={exercises}
            programId={program.id}
            onClose={() => setSelectedDayId(null)}
            onAdd={(data) => addExerciseMutation.mutate(data)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Add Exercise Dialog
function AddExerciseDialog({
  day,
  exercises,
  programId,
  onClose,
  onAdd,
}: {
  day: ProgramDay & { exercises: (ProgramExercise & { exercise: Exercise })[] };
  exercises: Exercise[];
  programId: string;
  onClose: () => void;
  onAdd: (data: { dayId: string; exerciseId: string; order: number; sets: number; reps: string; intensity?: string; notes?: string }) => void;
}) {
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("5");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const updateExerciseMutation = useMutation({
    mutationFn: async (data: { id: string; sets?: number; reps?: string; intensity?: string; notes?: string }) => {
      return await apiRequest(`/api/program-exercises/${data.id}`, {
        method: "PATCH",
        body: { sets: data.sets, reps: data.reps, intensity: data.intensity, notes: data.notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', programId, 'weeks'] });
      toast({ title: "Exercise updated successfully" });
      setEditingExerciseId(null);
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/program-exercises/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', programId, 'weeks'] });
      toast({ title: "Exercise deleted successfully" });
    },
  });

  const handleAdd = () => {
    if (!selectedExercise || !sets || !reps) return;
    onAdd({
      dayId: day.id,
      exerciseId: selectedExercise,
      order: (day.exercises?.length || 0) + 1,
      sets: parseInt(sets),
      reps,
      intensity: intensity || undefined,
      notes: notes || undefined,
    });
    // Reset form
    setSelectedExercise("");
    setSets("3");
    setReps("5");
    setIntensity("");
    setNotes("");
  };

  const handleEdit = (exercise: ProgramExercise & { exercise: Exercise }) => {
    setEditingExerciseId(exercise.id);
    setSets(exercise.sets?.toString() || "3");
    setReps(exercise.reps || "5");
    setIntensity(exercise.intensity || "");
    setNotes(exercise.notes || "");
  };

  const handleUpdate = (exerciseId: string) => {
    updateExerciseMutation.mutate({
      id: exerciseId,
      sets: parseInt(sets),
      reps,
      intensity: intensity || undefined,
      notes: notes || undefined,
    });
  };

  const handleCancelEdit = () => {
    setEditingExerciseId(null);
    setSets("3");
    setReps("5");
    setIntensity("");
    setNotes("");
  };

  if (!day) return null;

  const selectedExerciseName = exercises?.find(ex => ex.id === selectedExercise)?.name || "";
  const editingExercise = day.exercises?.find(ex => ex.id === editingExerciseId);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{day.name}</DialogTitle>
          <DialogDescription>Add exercises to this workout day</DialogDescription>
        </DialogHeader>

        {/* Current Exercises List */}
        {day.exercises && day.exercises.length > 0 && (
          <div className="border rounded-md p-3 bg-muted/30">
            <h4 className="text-sm font-semibold mb-2">Current Exercises:</h4>
            <ul className="space-y-2">
              {day.exercises
                .sort((a, b) => a.order - b.order)
                .map((ex, idx) => (
                  <li key={ex.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                    {editingExerciseId === ex.id ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">{ex.exercise.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`edit-sets-${ex.id}`} className="text-xs">Sets</Label>
                            <Input
                              id={`edit-sets-${ex.id}`}
                              type="number"
                              min="1"
                              value={sets}
                              onChange={(e) => setSets(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-reps-${ex.id}`} className="text-xs">Reps</Label>
                            <Input
                              id={`edit-reps-${ex.id}`}
                              value={reps}
                              onChange={(e) => setReps(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`edit-intensity-${ex.id}`} className="text-xs">Intensity</Label>
                          <Input
                            id={`edit-intensity-${ex.id}`}
                            value={intensity}
                            onChange={(e) => setIntensity(e.target.value)}
                            placeholder="e.g., 75%, RPE 8"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-notes-${ex.id}`} className="text-xs">Notes</Label>
                          <Textarea
                            id={`edit-notes-${ex.id}`}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Special instructions..."
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(ex.id)}
                            disabled={updateExerciseMutation.isPending}
                            data-testid={`button-save-exercise-${ex.id}`}
                          >
                            {updateExerciseMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-edit-${ex.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-foreground font-medium">{ex.exercise.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ex.sets} × {ex.reps}
                                {ex.intensity && ` @ ${ex.intensity}`}
                              </span>
                              {ex.notes && (
                                <div className="text-xs text-muted-foreground mt-1">{ex.notes}</div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-11 w-11 sm:h-8 sm:w-8"
                                onClick={() => handleEdit(ex)}
                                data-testid={`button-edit-exercise-${ex.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-11 w-11 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete "${ex.exercise.name}"?`)) {
                                    deleteExerciseMutation.mutate(ex.id);
                                  }
                                }}
                                data-testid={`button-delete-exercise-${ex.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Select Exercise</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-12 text-base sm:h-10 sm:text-sm"
                    data-testid="button-exercise-search"
                  >
                    {selectedExerciseName || "Search and select exercise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search exercises..." data-testid="input-exercise-search" />
                    <CommandList>
                      <CommandEmpty>No exercises found.</CommandEmpty>
                      <CommandGroup>
                        {exercises?.map((exercise) => (
                          <CommandItem
                            key={exercise.id}
                            value={exercise.name}
                            onSelect={() => {
                              setSelectedExercise(exercise.id);
                              setOpen(false);
                            }}
                            data-testid={`option-exercise-${exercise.id}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedExercise === exercise.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{exercise.name}</span>
                              {exercise.category && (
                                <span className="text-xs text-muted-foreground">
                                  {exercise.category}{exercise.muscleGroup && ` • ${exercise.muscleGroup}`}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sets">Sets</Label>
                <Input
                  id="sets"
                  type="number"
                  min="1"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  data-testid="input-sets"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reps">Reps</Label>
                <Input
                  id="reps"
                  placeholder="e.g., 5 or 8-12"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  data-testid="input-reps"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="intensity">Intensity (Optional)</Label>
              <Input
                id="intensity"
                placeholder="e.g., 75%, RPE 8, or @8"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                data-testid="input-intensity"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Special instructions, tempo, rest time, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
                className="min-h-[80px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-close-dialog">
            Done
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedExercise || !sets || !reps}
            data-testid="button-submit-exercise"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
