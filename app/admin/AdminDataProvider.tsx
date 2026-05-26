'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllProfiles, getAllTickets, getAllTravelLogs, type Profile, type Ticket, type TravelLog } from '../lib/supabase';

type AdminDataContextValue = {
  profiles: Profile[];
  tickets: Ticket[];
  travelLogs: TravelLog[];
  loading: boolean;
  refreshData: () => Promise<void>;
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  setTickets: Dispatch<SetStateAction<Ticket[]>>;
  setTravelLogs: Dispatch<SetStateAction<TravelLog[]>>;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  const loadData = useCallback(
    async (force = false) => {
      if (!user?.id || !isAdmin) {
        setLoading(false);
        return;
      }

      if (!force && inflightRef.current) {
        return inflightRef.current;
      }

      const request = (async () => {
        setLoading(true);
        try {
          const [profilesData, ticketsData, travelLogsData] = await Promise.all([
            getAllProfiles(),
            getAllTickets(),
            getAllTravelLogs(),
          ]);
          setProfiles(profilesData);
          setTickets(ticketsData);
          setTravelLogs(travelLogsData);
          loadedUserIdRef.current = user.id;
        } finally {
          setLoading(false);
          inflightRef.current = null;
        }
      })();

      inflightRef.current = request;
      return request;
    },
    [isAdmin, user?.id]
  );

  useEffect(() => {
    if (!user?.id || !isAdmin) {
      loadedUserIdRef.current = null;
      setProfiles([]);
      setTickets([]);
      setTravelLogs([]);
      setLoading(false);
      inflightRef.current = null;
      return;
    }

    if (loadedUserIdRef.current !== user.id) {
      void loadData(true);
    }
  }, [isAdmin, loadData, user?.id]);

  const value = useMemo<AdminDataContextValue>(
    () => ({
      profiles,
      tickets,
      travelLogs,
      loading,
      refreshData: () => loadData(true),
      setProfiles,
      setTickets,
      setTravelLogs,
    }),
    [loading, loadData, profiles, tickets, travelLogs]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminDataContext);

  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }

  return context;
}
