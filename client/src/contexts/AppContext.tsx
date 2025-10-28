import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Organization, Team, User } from '@shared/schema';

interface AppContextType {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedOrg = localStorage.getItem('currentOrganization');
    const storedTeam = localStorage.getItem('currentTeam');
    const storedUser = localStorage.getItem('currentUser');

    if (storedOrg) setCurrentOrganization(JSON.parse(storedOrg));
    if (storedTeam) setCurrentTeam(JSON.parse(storedTeam));
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        currentTeam,
        setCurrentTeam,
        currentUser,
        setCurrentUser,
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
