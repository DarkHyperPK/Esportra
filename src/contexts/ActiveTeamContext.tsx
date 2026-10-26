import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

export interface MyTeam {
  id: string;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  game: string | null;
  members: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    role: string | null;
    isActive: boolean;
  }[];
}

interface ActiveTeamContextValue {
  teams: MyTeam[];
  activeTeam: MyTeam | null;
  setActiveTeamId: (id: string) => void;
  isLoading: boolean;
}

const ActiveTeamContext = createContext<ActiveTeamContextValue>({
  teams: [],
  activeTeam: null,
  setActiveTeamId: () => {},
  isLoading: false,
});

const STORAGE_KEY = 'esportra:active-team-id';

export function ActiveTeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => apiClient.get<MyTeam[]>('/api/teams/me'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Auto-select first team if stored ID is gone or none stored
  useEffect(() => {
    if (!teams.length) return;
    const valid = teams.find(t => t.id === activeTeamId);
    if (!valid) {
      const first = teams[0].id;
      setActiveTeamIdState(first);
      localStorage.setItem(STORAGE_KEY, first);
    }
  }, [teams, activeTeamId]);

  function setActiveTeamId(id: string) {
    setActiveTeamIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const activeTeam = teams.find(t => t.id === activeTeamId) ?? teams[0] ?? null;

  return (
    <ActiveTeamContext.Provider value={{ teams, activeTeam, setActiveTeamId, isLoading }}>
      {children}
    </ActiveTeamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveTeam() {
  return useContext(ActiveTeamContext);
}
