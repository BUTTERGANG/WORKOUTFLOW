import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Organization, Team } from '@shared/schema';

interface AppContextType {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedOrg = localStorage.getItem('currentOrganization');
      const storedTeam = localStorage.getItem('currentTeam');

      // Parse and validate stored data
      const org = storedOrg ? JSON.parse(storedOrg) : null;
      const team = storedTeam ? JSON.parse(storedTeam) : null;

      // Batch state updates to prevent multiple re-renders
      if (org) setCurrentOrganization(org);
      if (team) setCurrentTeam(team);
    } catch (error) {
      console.error('Failed to parse stored app context data:', error);
      // Clear corrupted data
      localStorage.removeItem('currentOrganization');
      localStorage.removeItem('currentTeam');
    } finally {
      // Clean up any old currentUser data from localStorage
      localStorage.removeItem('currentUser');
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('currentOrganization', JSON.stringify(currentOrganization));
    } else {
      localStorage.removeItem('currentOrganization');
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('currentTeam', JSON.stringify(currentTeam));
    } else {
      localStorage.removeItem('currentTeam');
    }
  }, [currentTeam]);

  return (
    <AppContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        currentTeam,
        setCurrentTeam,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
