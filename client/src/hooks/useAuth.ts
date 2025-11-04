// Email/password authentication - useAuth hook
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<Omit<User, 'passwordHash'> | null>({
    queryKey: ["/api/auth/user"],
    retry: 1, // Retry once if network fails
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null instead of throwing
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
