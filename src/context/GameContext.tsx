/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  getDocs,
  updateDoc, 
  deleteDoc,
  runTransaction,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { logSystemError } from '../utils/logger';
import { Session, Team, Decision, RoundResult, GameStatus, INITIAL_VALUES, GameSettings, GameEvent, Product, SimulationParameters, DEFAULT_PARAMETERS, DEFAULT_STATIONS } from '../types';
import { processDecision, getInitialContracts } from '../lib/gameLogic';

// Helper to add timeout to any promise
export const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Please check your internet connection and ensure Firestore Database is created in Firebase Console.`)), ms)
    )
  ]);

interface GameContextType {
  user: User | null;
  loading: boolean;
  session: Session | null;
  currentTeam: Team | null;
  allTeams: Team[];
  results: RoundResult[];
  isAdmin: boolean;
  isDirectPlay: boolean;
  setIsDirectPlay: (active: boolean) => void;
  directParams: SimulationParameters;
  updateDirectParameters: (params: Partial<SimulationParameters>) => void;
  resetDirectSession: () => void;
  login: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  loginWithEmail: (email: string, password: string, isSignUp: boolean) => Promise<void>;
  loginWithMockCredentials: (id: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  createSession: (licenseCode?: string) => Promise<string>;
  provisionSession: (maxSeats: number, totalRounds: number, instId: string, instPass: string, studId: string, studPass: string, startDate?: string, endDate?: string) => Promise<string>;
  joinSession: (code: string, teamName: string) => Promise<void>;
  startSession: () => Promise<void>;
  togglePauseSession: (isPaused: boolean) => Promise<void>;
  submitDecision: (production: Record<string, number>, rawMaterials: number, marketing: number) => Promise<void>;
  advanceRound: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  triggerEvent: (event: GameEvent | null) => Promise<void>;
  acceptContract: (contractId: string) => Promise<void>;
  abortContract: (contractId: string) => Promise<void>;
  buyMachine: (stationId: 'mixing' | 'bottling' | 'packaging' | 'icing') => Promise<void>;
  updateActiveMachines: (stationId: 'mixing' | 'bottling' | 'packaging' | 'icing', count: number) => Promise<void>;
  updateProcurementSettings: (Q: number, R: number) => Promise<void>;
  updateProcurementSettingsEx: (settings: {
    flourQ: number; flourR: number;
    sugarQ: number; sugarR: number;
    eggsQ: number; eggsR: number;
    cocoaQ: number; cocoaR: number;
  }) => Promise<void>;
  rewardOvertimeLabor: (bonusCash: number, bonusRawMaterials: number) => Promise<void>;
  resumeSession: (code: string) => Promise<void>;
  updateSession: (updates: Partial<Session>) => Promise<void>;
  updateTeamState: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeamState: (teamId: string) => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  logout: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', next);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const updateClasses = () => {
      try {
        const root = document.documentElement;
        
        if (theme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
      } catch {}
    };

    updateClasses();
    window.addEventListener('hashchange', updateClasses);
    return () => window.removeEventListener('hashchange', updateClasses);
  }, [theme]);
  const [session, setSession] = useState<Session | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);

  // ----------------------------------------------------------------
  // Direct Play (Solo / Sandbox / Non-Firestore) Modes
  // ----------------------------------------------------------------
  const [isDirectPlay, setIsDirectPlay] = useState<boolean>(() => {
    try {
      const isDP = new URLSearchParams(window.location.search).get('dp') === 'true';
      const savedDP = localStorage.getItem('isDirectPlay');
      return isDP || savedDP === 'true';
    } catch {
      return false;
    }
  });

  const [directParams, setDirectParams] = useState<SimulationParameters>(() => {
    try {
      const saved = localStorage.getItem('direct_params');
      return saved ? JSON.parse(saved) : DEFAULT_PARAMETERS;
    } catch {
      return DEFAULT_PARAMETERS;
    }
  });

  const [directSession, setDirectSession] = useState<Session>(() => {
    try {
      const saved = localStorage.getItem('direct_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old manual-advance sessions to auto-advance
        if (parsed.settings?.roundDuration >= 3600) {
          parsed.settings.roundDuration = 15;
          if (!parsed.roundStartedAt) parsed.roundStartedAt = new Date().toISOString();
        }
        return parsed;
      }
    } catch {}
    return {
      id: 'direct-play',
      instructorId: 'direct',
      code: 'DIRECT',
      status: 'active',
      currentRound: 1,
      totalRounds: 10,
      settings: {
        roundDuration: 15,
        difficulty: 'medium',
        totalRounds: 10,
        capacity: DEFAULT_PARAMETERS.initialCapacity,
      },
      createdAt: new Date().toISOString(),
      roundStartedAt: new Date().toISOString(),
    };
  });

  const [directTeam, setDirectTeam] = useState<Team>(() => {
    try {
      const saved = localStorage.getItem('direct_team');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'solo-chef',
      sessionId: 'direct-play',
      name: 'Solo Chef',
      balance: DEFAULT_PARAMETERS.initialBalance,
      inventory: { standard: 0 },
      rawMaterials: DEFAULT_PARAMETERS.initialRawMaterials,
      satisfaction: 100,
      ready: false,
      joinedAt: new Date().toISOString(),
      orderQuantity: 2000,
      reorderPoint: 500,
      stations: JSON.parse(JSON.stringify(DEFAULT_STATIONS)),
      deliveries: [],
      contracts: getInitialContracts()
    };
  });

  const [directResults, setDirectResults] = useState<RoundResult[]>(() => {
    try {
      const saved = localStorage.getItem('direct_results');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Local storage persistence
  useEffect(() => {
    try {
      localStorage.setItem('isDirectPlay', isDirectPlay.toString());
    } catch {}
  }, [isDirectPlay]);

  useEffect(() => {
    try {
      localStorage.setItem('direct_params', JSON.stringify(directParams));
    } catch {}
  }, [directParams]);

  useEffect(() => {
    try {
      localStorage.setItem('direct_session', JSON.stringify(directSession));
    } catch {}
  }, [directSession]);

  useEffect(() => {
    try {
      localStorage.setItem('direct_team', JSON.stringify(directTeam));
    } catch {}
  }, [directTeam]);

  useEffect(() => {
    try {
      localStorage.setItem('direct_results', JSON.stringify(directResults));
    } catch {}
  }, [directResults]);

  // ----------------------------------------------------------------
  // Auth listeners
  // ----------------------------------------------------------------
  useEffect(() => {
    // Check if there is an active mock session first (sessionStorage for same-tab, localStorage as fallback)
    let activeMockStr = sessionStorage.getItem('active_mock_user');
    
    // Fallback: check localStorage for admin sessions that should persist across reloads/tabs
    if (!activeMockStr) {
      const adminSessionStr = localStorage.getItem('admin_session');
      if (adminSessionStr) {
        try {
          const adminSession = JSON.parse(adminSessionStr);
          if (adminSession.role === 'admin') {
            activeMockStr = adminSessionStr;
            // Sync back to sessionStorage
            sessionStorage.setItem('active_mock_user', adminSessionStr);
          }
        } catch {}
      }
    }

    if (activeMockStr) {
      try {
        const mockUser = JSON.parse(activeMockStr);
        setUser({
          uid: mockUser.uid,
          email: mockUser.email || mockUser.uid,
          emailVerified: true,
          isAnonymous: mockUser.isAnonymous || false,
          isMock: true,
          mockRole: mockUser.role,
          mockSessionCode: mockUser.sessionCode,
        } as any);
        
        if (mockUser.role === 'admin') {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        if (mockUser.sessionCode) {
          // Listen to the session from Firestore in realtime!
          const sessionRef = doc(db, 'sessions', mockUser.sessionCode);
          const unsubSession = onSnapshot(sessionRef, (snap) => {
            if (snap.exists()) {
              setSession({ id: snap.id, ...snap.data() } as Session);
            }
          });

          setLoading(false);
          return () => unsubSession();
        }
      } catch (e) {
        console.error("Failed to restore mock session:", e);
      }
    }

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Firebase Auth connection timed out. Enabling local fallback.");
        setLoading(false);
      }
    }, 3500);

    let unsubAdmin: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, (u) => {
      // If we have an active mock user, do NOT let Firebase Auth override it!
      if (sessionStorage.getItem('active_mock_user')) {
        setLoading(false);
        return;
      }

      clearTimeout(timeout);
      setUser(u);
      
      if (unsubAdmin) {
        unsubAdmin();
        unsubAdmin = null;
      }

      const emailLower = u?.email?.toLowerCase();
      const isAllowedAdmin = emailLower && (
        emailLower === '111shivamrai@gmail.com' ||
        emailLower === 'aryajain1906@gmail.com'
      );

      if (u && isAllowedAdmin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsub();
      if (unsubAdmin) unsubAdmin();
    };
  }, []);

  // Listen to session changes (multiplayer only)
  useEffect(() => {
    if (!session?.id || session.id === 'direct-play') return;

    const sessionRef = doc(db, 'sessions', session.id);
    const unsubSession = onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        setSession({ id: snap.id, ...snap.data() } as Session);
      }
    });

    const teamsRef = collection(db, `sessions/${session.id}/teams`);
    const unsubTeams = onSnapshot(teamsRef, (snap) => {
      const teams = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(t => t.status !== 'deleted');
      setAllTeams(teams as Team[]);
      
      const baseUid = user?.uid ? user.uid.split(/[-_]/)[0] : '';
      const mine = teams.find(t => t.id === user?.uid || t.id === baseUid);
      if (mine) {
        setCurrentTeam(mine);
      } else if (user?.isMock && user?.mockRole === 'student') {
        try {
          const localTeamStr = localStorage.getItem(`mock_team_${session.id}_${user.uid}`) || localStorage.getItem(`mock_team_${session.id}_${baseUid}`);
          if (localTeamStr) {
            const localTeam = JSON.parse(localTeamStr);
            setCurrentTeam({ id: user.uid, ...localTeam });
          }
        } catch (e) {
          console.error("Local team load fallback failed:", e);
        }
      }
    }, (err) => {
      console.warn("Firestore teams subscription failed, trying local storage fallback:", err);
      if (user?.isMock && user?.mockRole === 'student') {
        try {
          const baseUid = user?.uid ? user.uid.split(/[-_]/)[0] : '';
          const localTeamStr = localStorage.getItem(`mock_team_${session.id}_${user.uid}`) || localStorage.getItem(`mock_team_${session.id}_${baseUid}`);
          if (localTeamStr) {
            const localTeam = JSON.parse(localTeamStr);
            setCurrentTeam({ id: user.uid, ...localTeam });
            setAllTeams([{ id: user.uid, ...localTeam }]);
          }
        } catch (e) {
          console.error("Local team load fallback on error failed:", e);
        }
      }
    });

    // Heartbeat for online presence
    const presenceRef = doc(db, `sessions/${session.id}/presence`, user?.email?.toLowerCase() || user?.uid || 'unknown');
    const updatePresence = () => {
      setDoc(presenceRef, {
        email: user?.email?.toLowerCase() || '',
        uid: user?.uid || '',
        lastSeen: serverTimestamp(),
        isInstructor: user?.uid === session.instructorId
      }, { merge: true }).catch(console.error);
    };
    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 30000);

    return () => {
      unsubSession();
      unsubTeams();
      clearInterval(heartbeatInterval);
    };
  }, [session?.id, user?.uid, user?.email]);

  // Listen to results for the current team (multiplayer only)
  useEffect(() => {
    if (!session?.id || session.id === 'direct-play' || !currentTeam?.id) return;

    const resultsRef = collection(db, `sessions/${session.id}/teams/${currentTeam.id}/results`);
    const q = query(resultsRef, orderBy('round', 'asc'));
    const unsubResults = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(d => d.data() as RoundResult));
    });

    return () => unsubResults();
  }, [session?.id, currentTeam?.id]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAnonymously = async () => {
    await signInAnonymously(auth);
  };

  const loginWithEmail = async (email: string, password: string, isSignUp: boolean) => {
    if (isSignUp) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  };

  const loginAdmin = async (username: string, password: string) => {
    let email = username.trim().toLowerCase();
    
    // If simple username, resolve it to the corresponding whitelisted email
    if (!email.includes('@')) {
      if (email === 'shivamrai' || email === '111shivamrai') {
        email = '111shivamrai@gmail.com';
      } else if (email === 'aryajain' || email === 'aryajain1906') {
        email = 'aryajain1906@gmail.com';
      } else {
        throw new Error('This ID is not an authorized administrator.');
      }
    }

    const isAllowedEmail = 
      email === '111shivamrai@gmail.com' ||
      email === 'aryajain1906@gmail.com';

    if (!isAllowedEmail) {
      throw new Error('This ID is not an authorized administrator.');
    }

    if (password !== '@Aryajain19') {
      throw new Error('Incorrect Admin ID or Password.');
    }

    // Prepare mock admin object for session persistence
    const mockAdminBase = {
      email: email,
      emailVerified: true,
      isAnonymous: true,
      isMock: true,
      role: 'admin',
    };

    try {
      // Tier 1: Try standard Firebase sign-in
      await signInWithEmailAndPassword(auth, email, password);
      // Save admin state to both storages for persistence
      const adminState = { ...mockAdminBase, uid: auth.currentUser?.uid || email };
      sessionStorage.setItem('active_mock_user', JSON.stringify(adminState));
      localStorage.setItem('admin_session', JSON.stringify(adminState));
      setIsAdmin(true);
    } catch (err: any) {
      console.warn("Standard email sign in failed. Trying to register user account...", err);
      
      // Tier 2: Try creating the user account in Firebase Auth
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        const adminState = { ...mockAdminBase, uid: auth.currentUser?.uid || email };
        sessionStorage.setItem('active_mock_user', JSON.stringify(adminState));
        localStorage.setItem('admin_session', JSON.stringify(adminState));
        setIsAdmin(true);
      } catch (createErr: any) {
        console.warn("User registration failed. Bypassing with anonymous session auth...", createErr);
        
        // Tier 3: If registration is disabled on the client, sign in anonymously (allows Firestore writes to work)
        try {
          // IMPORTANT: Save to sessionStorage BEFORE signInAnonymously to prevent
          // onAuthStateChanged from overriding our admin state
          const tempMockAdmin = { ...mockAdminBase, uid: 'pending-anon' };
          sessionStorage.setItem('active_mock_user', JSON.stringify(tempMockAdmin));
          
          const cred = await signInAnonymously(auth);
          const mockAdmin = {
            ...mockAdminBase,
            uid: cred.user.uid,
          };
          // Update with real UID after sign-in
          sessionStorage.setItem('active_mock_user', JSON.stringify(mockAdmin));
          localStorage.setItem('admin_session', JSON.stringify(mockAdmin));
          setUser(mockAdmin as any);
          setIsAdmin(true);
        } catch (anonErr) {
          // Clean up on failure
          sessionStorage.removeItem('active_mock_user');
          throw new Error('Database authentication failed. Please check your internet connection.');
        }
      }
    }
  };
  const loginWithMockCredentials = async (id: string, password: string) => {
    // Set a sentinel BEFORE anonymous sign-in so onAuthStateChanged doesn't wipe our mock user
    sessionStorage.setItem('active_mock_user', JSON.stringify({ uid: 'pending-login', email: id, role: 'pending' }));

    // Ensure user is signed in anonymously to pass Firestore security rules
    if (!auth.currentUser) {
      try { await signInAnonymously(auth); } catch (e) { console.warn("Anon sign-in failed:", e); }
    }

    const loginId = id.trim();
    const pwd = password.trim();

    // ────────────────────────────────────────────────────
    // BULLETPROOF APPROACH: Fetch ALL sessions + licenses
    // in one parallel call, then search client-side.
    // No more fragile multi-query chains.
    // ────────────────────────────────────────────────────
    try {
      let allSessions: any[] = [];
      let allLicenses: any[] = [];

      try {
        const sessionsSnap = await getDocs(collection(db, 'sessions'));
        allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      } catch (e) {
        console.warn('Failed to fetch sessions directly:', e);
      }
      
      if (allSessions.length === 0) {
        try {
          const loc = localStorage.getItem('local_sessions');
          if (loc) allSessions = JSON.parse(loc);
        } catch (e) {}
      }

      try {
        const licensesSnap = await getDocs(collection(db, 'licenses'));
        allLicenses = licensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      } catch (e) {
        console.warn('Failed to fetch licenses directly (may require auth):', e);
      }
      
      if (allLicenses.length === 0) {
        try {
          const loc = localStorage.getItem('cached_licenses');
          if (loc) allLicenses = JSON.parse(loc);
        } catch (e) {}
      }

      // ═══ 1. INSTRUCTOR MATCH IN SESSIONS ═══
      const instSession = allSessions.find(s =>
        (s.customInstructorId === loginId && s.customInstructorPassword === pwd) ||
        (s.instructorIdMock === loginId && s.instructorPassword === pwd) ||
        (s.instructorId === loginId && s.instructorPassword === pwd)
      );

      if (instSession) {
        // Date schedule checks
        const now = new Date();
        if (instSession.startDate && now < new Date(instSession.startDate)) {
          throw new Error(`This simulation room is scheduled to start on ${new Date(instSession.startDate).toLocaleString()}.`);
        }
        if (instSession.endDate && instSession.endDate !== '' && now > new Date(instSession.endDate)) {
          throw new Error(`This simulation room expired on ${new Date(instSession.endDate).toLocaleString()}.`);
        }

        const mockUser = {
          uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
          isMock: true, mockRole: 'instructor', mockSessionCode: instSession.id,
        };
        sessionStorage.setItem('active_mock_user', JSON.stringify({
          uid: loginId, email: loginId, role: 'instructor', sessionCode: instSession.id
        }));
        setUser(mockUser as any);
        setSession({ ...instSession } as Session);
        return;
      }

      // ═══ 2. STUDENT MATCH IN SESSIONS ═══
      const studSession = allSessions.find(s => {
        if (s.status === 'deleted') return false;
        // Check studentAccounts array
        if (Array.isArray(s.studentAccounts) && s.studentAccounts.some((a: any) => a.studentId === loginId && a.studentPassword === pwd)) return true;
        // Check legacy/custom single-student fields
        if (s.customStudentId === loginId && s.customStudentPassword === pwd) return true;
        if (s.studentId === loginId && s.studentPassword === pwd) return true;
        return false;
      });

      if (studSession) {
        // Date schedule checks
        const now = new Date();
        if (studSession.startDate && now < new Date(studSession.startDate)) {
          throw new Error(`This simulation room is scheduled to start on ${new Date(studSession.startDate).toLocaleString()}.`);
        }
        if (studSession.endDate && studSession.endDate !== '' && now > new Date(studSession.endDate)) {
          throw new Error(`This simulation room expired on ${new Date(studSession.endDate).toLocaleString()}.`);
        }

        // Auto-create student team in Firestore
        try {
          const teamRef = doc(db, `sessions/${studSession.id}/teams`, loginId);
          const teamSnap = await getDoc(teamRef);
          if (!teamSnap.exists() || teamSnap.data()?.status === 'deleted') {
            await setDoc(teamRef, {
              sessionId: studSession.id,
              name: loginId.toUpperCase(),
              balance: INITIAL_VALUES.BALANCE,
              inventory: { standard: 0 },
              rawMaterials: INITIAL_VALUES.RAW_MATERIALS,
              satisfaction: 100,
              ready: false,
              joinedAt: new Date().toISOString(),
              orderQuantity: 2000,
              reorderPoint: 500,
              stations: JSON.parse(JSON.stringify(DEFAULT_STATIONS)),
              deliveries: [],
              contracts: getInitialContracts()
            });
          }
        } catch (e) { console.warn("Auto-creation of student team failed:", e); }

        const mockUser = {
          uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
          isMock: true, mockRole: 'student', mockSessionCode: studSession.id,
        };
        sessionStorage.setItem('active_mock_user', JSON.stringify({
          uid: loginId, email: loginId, role: 'student', sessionCode: studSession.id
        }));
        setUser(mockUser as any);
        setSession({ ...studSession } as Session);
        return;
      }

      // ═══ 3. INSTRUCTOR MATCH IN LICENSES (auto-provision session) ═══
      const instLicense = allLicenses.find(l =>
        l.instructorId === loginId && l.instructorPassword === pwd
      );

      if (instLicense) {
        // Expiry check
        if (instLicense.expiresAt && new Date() > new Date(instLicense.expiresAt)) {
          throw new Error("This SaaS License Key has expired.");
        }

        // Check if a session already exists for this license
        const existingSess = allSessions.find(s => s.licenseCode === instLicense.id && s.status !== 'deleted');
        if (existingSess) {
          // Use the existing session
          const mockUser = {
            uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
            isMock: true, mockRole: 'instructor', mockSessionCode: existingSess.id,
          };
          sessionStorage.setItem('active_mock_user', JSON.stringify({
            uid: loginId, email: loginId, role: 'instructor', sessionCode: existingSess.id
          }));
          setUser(mockUser as any);
          setSession({ ...existingSess } as Session);
          return;
        }

        // Auto-provision a new session
        const code = instLicense.id; // Reuse the license ID to cleanly overwrite any old soft-deleted sessions!
        const newSession: any = {
          instructorId: instLicense.instructorId || loginId,
          customInstructorId: instLicense.instructorId || loginId,
          customInstructorPassword: instLicense.instructorPassword || pwd,
          customStudentId: instLicense.studentId || '',
          customStudentPassword: instLicense.studentPassword || '',
          studentAccounts: instLicense.studentAccounts || [],
          instructorIdMock: instLicense.instructorId || loginId,
          instructorPassword: instLicense.instructorPassword || pwd,
          studentId: instLicense.studentId || '',
          studentPassword: instLicense.studentPassword || '',
          code,
          status: 'waiting',
          currentRound: 0,
          totalRounds: 10,
          settings: { roundDuration: 120, difficulty: 'medium', totalRounds: 10, capacity: instLicense.maxSeats || 40 },
          createdAt: new Date().toISOString(),
          maxSeats: instLicense.maxSeats || 40,
          licensedCustomer: instLicense.customerName || 'License Holder',
          licenseCode: instLicense.id,
          startDate: '',
          endDate: instLicense.expiresAt || ''
        };

        try { await setDoc(doc(db, 'sessions', code), newSession); } catch (e) { console.warn("Session provision failed:", e); }
        localStorage.setItem(`mock_session_${code}`, JSON.stringify(newSession));

        const mockUser = {
          uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
          isMock: true, mockRole: 'instructor', mockSessionCode: code,
        };
        sessionStorage.setItem('active_mock_user', JSON.stringify({
          uid: loginId, email: loginId, role: 'instructor', sessionCode: code
        }));
        setUser(mockUser as any);
        setSession({ id: code, ...newSession } as Session);
        return;
      }

      // ═══ 4. STUDENT MATCH IN LICENSES ═══
      const studLicense = allLicenses.find(l => {
        if (Array.isArray(l.studentAccounts) && l.studentAccounts.some((a: any) => a.studentId === loginId && a.studentPassword === pwd)) return true;
        if (l.studentId === loginId && l.studentPassword === pwd) return true;
        return false;
      });

      if (studLicense) {
        if (studLicense.expiresAt && new Date() > new Date(studLicense.expiresAt)) {
          throw new Error("This SaaS License Key has expired.");
        }

        // Find the active session for this license
        const licSession = allSessions.find(s => s.licenseCode === studLicense.id && s.status !== 'ended' && s.status !== 'deleted');
        if (!licSession) {
          throw new Error("Your instructor has not initialized the classroom session yet. Please wait for your instructor to launch the session, then try again.");
        }

        // Auto-create student team
        try {
          const teamRef = doc(db, `sessions/${licSession.id}/teams`, loginId);
          const teamSnap = await getDoc(teamRef);
          if (!teamSnap.exists() || teamSnap.data()?.status === 'deleted') {
            await setDoc(teamRef, {
              sessionId: licSession.id, name: loginId.toUpperCase(),
              balance: INITIAL_VALUES.BALANCE, inventory: { standard: 0 },
              rawMaterials: INITIAL_VALUES.RAW_MATERIALS, satisfaction: 100,
              ready: false, joinedAt: new Date().toISOString(),
              orderQuantity: 2000, reorderPoint: 500,
              stations: JSON.parse(JSON.stringify(DEFAULT_STATIONS)),
              deliveries: [], contracts: getInitialContracts()
            });
          }
        } catch (e) { console.warn("Student team creation failed:", e); }

        const mockUser = {
          uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
          isMock: true, mockRole: 'student', mockSessionCode: licSession.id,
        };
        sessionStorage.setItem('active_mock_user', JSON.stringify({
          uid: loginId, email: loginId, role: 'student', sessionCode: licSession.id
        }));
        setUser(mockUser as any);
        setSession({ ...licSession } as Session);
        return;
      }

    } catch (err: any) {
      if (err.message && (err.message.includes('expired') || err.message.includes('initialized') || err.message.includes('scheduled'))) {
        sessionStorage.removeItem('active_mock_user');
        throw err;
      }
      console.error("Firestore credential check failed:", err);
    }

    // ═══ LOCAL STORAGE FALLBACK (offline mode) ═══
    const credsStr = localStorage.getItem('mock_credentials');
    if (credsStr) {
      try {
        const creds = JSON.parse(credsStr);
        if (loginId === creds.instId && pwd === creds.instPass) {
          const localSessStr = localStorage.getItem(`mock_session_${creds.code}`);
          const localSess = localSessStr ? JSON.parse(localSessStr) : null;
          const mockUser = {
            uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
            isMock: true, mockRole: 'instructor', mockSessionCode: creds.code,
          };
          sessionStorage.setItem('active_mock_user', JSON.stringify({
            uid: loginId, email: loginId, role: 'instructor', sessionCode: creds.code
          }));
          setSession(localSess ? { id: creds.code, ...localSess } : {
            id: creds.code, instructorId: loginId, code: creds.code,
            status: 'waiting', currentRound: 0, totalRounds: 10,
            settings: { roundDuration: 120, difficulty: 'medium', totalRounds: 10, capacity: 40 },
            createdAt: new Date().toISOString()
          } as any);
          setUser(mockUser as any);
          return;
        }
        if (loginId === creds.studId && pwd === creds.studPass) {
          const localSessStr = localStorage.getItem(`mock_session_${creds.code}`);
          const localSess = localSessStr ? JSON.parse(localSessStr) : null;
          const mockUser = {
            uid: loginId, email: loginId, emailVerified: true, isAnonymous: false,
            isMock: true, mockRole: 'student', mockSessionCode: creds.code,
          };
          sessionStorage.setItem('active_mock_user', JSON.stringify({
            uid: loginId, email: loginId, role: 'student', sessionCode: creds.code
          }));
          setSession(localSess ? { id: creds.code, ...localSess } : {
            id: creds.code, instructorId: creds.instId, code: creds.code,
            status: 'waiting', currentRound: 0, totalRounds: 10,
            settings: { roundDuration: 120, difficulty: 'medium', totalRounds: 10, capacity: 40 },
            createdAt: new Date().toISOString()
          } as any);
          setUser(mockUser as any);
          return;
        }
      } catch (e) { console.error("Local credential parse failed:", e); }
    }

    // Login failed — clean up sentinel
    sessionStorage.removeItem('active_mock_user');
    throw new Error('Invalid Login ID or Password. Please use the exact Instructor ID or Student ID generated in the Admin Panel.');
  };

  // Automatic session expiration check and active logout trigger
  useEffect(() => {
    if (!session || !session.endDate || !user) return;
    
    const checkExpiry = () => {
      const now = new Date();
      const expiry = new Date(session.endDate!);
      if (now > expiry) {
        console.warn("This simulation room has reached its expiration date-time. Auto logging out...");
        alert(`This simulation room expired on ${expiry.toLocaleString()}. You have been automatically signed out.`);
        logout();
      }
    };

    checkExpiry();
    const expiryTimer = setInterval(checkExpiry, 5000); // Check every 5 seconds
    return () => clearInterval(expiryTimer);
  }, [session?.endDate, user?.uid]);

  // Automatic session round advancement (Continuous time simulation)
  useEffect(() => {
    const activeSession = isDirectPlay ? directSession : session;
    if (!activeSession || activeSession.status !== 'active') return;

    // In multiplayer, only the instructor/admin should drive the auto-advance timer
    if (!isDirectPlay && !isAdmin && user?.uid !== activeSession.instructorId) {
      return;
    }

    // Default duration is 120s if not specified
    const duration = activeSession.settings?.roundDuration || 120;
    if (duration > 3600) {
      // If round duration is very large, do not auto-advance.
      return;
    }

    const checkAndAdvance = async () => {
      // If roundStartedAt is not set, initialize it to the current time to start ticking.
      if (!activeSession.roundStartedAt) {
        const nowStr = new Date().toISOString();
        if (isDirectPlay) {
          setDirectSession(s => ({ ...s, roundStartedAt: nowStr }));
        } else {
          try {
            await updateDoc(doc(db, 'sessions', activeSession.id), { roundStartedAt: nowStr });
          } catch (e) {
            console.error("Failed to initialize roundStartedAt:", e);
          }
        }
        return;
      }

      const start = new Date(activeSession.roundStartedAt).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - start) / 1000);

      if (elapsed >= duration) {
        try {
          await advanceRound();
        } catch (err) {
          console.error("Auto-advancement of round failed:", err);
        }
      }
    };

    checkAndAdvance();
    const timer = setInterval(checkAndAdvance, 1000);
    return () => clearInterval(timer);
  }, [session?.status, session?.roundStartedAt, session?.settings?.roundDuration, session?.instructorId, isDirectPlay, directSession?.status, directSession?.roundStartedAt, directSession?.settings?.roundDuration, isAdmin, user?.uid]);

  const logout = async () => {
    sessionStorage.removeItem('active_mock_user');
    localStorage.removeItem('admin_session');
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setSession(null);
    setCurrentTeam(null);
    setAllTeams([]);
    setResults([]);
    localStorage.removeItem('is_guest_instructor');
  };

  const createSession = async (licenseCode?: string) => {
    if (!user) throw new Error('Not logged in');
    
    let maxSeats = 40; // Default capacity limit
    let licensedCustomer = "Academic Free Trial";
    const cleanedLicenseCode = licenseCode?.trim().toUpperCase() || '';



    try {
      if (cleanedLicenseCode) {
        const licenseRef = doc(db, 'licenses', cleanedLicenseCode);
        const licenseSnap = await withTimeout(getDoc(licenseRef), 8000, 'License check');
        if (licenseSnap.exists()) {
          const lic = licenseSnap.data();
          if (lic.status !== 'active') {
            throw new Error(`The SaaS License Key "${cleanedLicenseCode}" is currently suspended, inactive, or expired.`);
          }
          maxSeats = Number(lic.maxSeats) || 40;
          licensedCustomer = lic.customerName || 'Standard Seat Holder';
        } else {
          throw new Error(`The SaaS License Key "${cleanedLicenseCode}" is invalid. Please apply a valid key or leave blank for Standard entry.`);
        }
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sessionId = code; // Using code as ID for simplicity in joining
      
      const newSession: any = {
        instructorId: user.uid,
        code,
        status: 'waiting',
        currentRound: 0,
        totalRounds: 10,
        settings: {
          roundDuration: 120,
          difficulty: 'medium',
          totalRounds: 10,
          capacity: INITIAL_VALUES.CAPACITY,
        },
        createdAt: new Date().toISOString(),
        maxSeats,
        licensedCustomer,
        licenseCode: cleanedLicenseCode
      };

      await withTimeout(setDoc(doc(db, 'sessions', sessionId), newSession), 8000, 'Session creation');
      setSession({ id: sessionId, ...newSession });
      return code;
    } catch (err: any) {
      logSystemError(err.message || 'Error creating session', 'GameContext.createSession', 'error');
      throw err;
    }
  };

  const provisionSession = async (
    maxSeats: number, 
    totalRounds: number, 
    instId: string, 
    instPass: string, 
    studId: string, 
    studPass: string,
    startDate?: string,
    endDate?: string
  ) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Save provisioned session into Firestore so it works seamlessly in multiplayer across windows/browsers!
    const newSession: any = {
      instructorId: user.uid, // SaaS Admin's Google UID - guarantees write approval!
      customInstructorId: instId,
      customInstructorPassword: instPass,
      customStudentId: studId,
      customStudentPassword: studPass,
      instructorIdMock: instId,
      instructorPassword: instPass,
      studentId: studId,
      studentPassword: studPass,
      code,
      status: 'waiting',
      currentRound: 0,
      totalRounds,
      settings: {
        roundDuration: 120,
        difficulty: 'medium',
        totalRounds,
        capacity: INITIAL_VALUES.CAPACITY,
      },
      createdAt: new Date().toISOString(),
      maxSeats,
      licensedCustomer: "Provisioned Session",
      licenseCode: "PROVISIONED",
      startDate: startDate || '',
      endDate: endDate || ''
    };

    try {
      await withTimeout(setDoc(doc(db, 'sessions', code), newSession), 2000, 'Session provisioning');
    } catch (err: any) {
      console.warn("Firestore session provisioning timed out/failed. Operating in high-fidelity local fallback mode:", err);
    }

    // Save a local mock session so that it works perfectly offline/without database
    localStorage.setItem(`mock_session_${code}`, JSON.stringify(newSession));

    // Save to the global array of local sessions so it merges in the Admin list!
    try {
      const localSessListStr = localStorage.getItem('local_sessions') || '[]';
      const localSessList = JSON.parse(localSessListStr);
      const filtered = localSessList.filter((s: any) => s.id !== code);
      filtered.push({ id: code, ...newSession });
      localStorage.setItem('local_sessions', JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to update local_sessions list:", e);
    }

    // Also store custom credentials for mock login in local storage of SaaS Admin for reference
    localStorage.setItem('mock_credentials', JSON.stringify({
      instId, instPass, studId, studPass, code
    }));
    
    console.log("Mock provisioned session configured:", { code, maxSeats, totalRounds, instId, studId });
    
    // Simulate a tiny network delay for realism
    await new Promise(r => setTimeout(r, 200)); 
    
    return code;
  };

  const joinSession = async (code: string, teamName: string) => {
    if (!user) throw new Error('Not logged in');
    const sessionRef = doc(db, 'sessions', code);
    try {
      // Force server check with timeout to fail fast
      const snap = await Promise.race([
        getDocFromServer(sessionRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Please ensure Firestore Database is created in Firebase Console and check your internet.')), 8000)
        )
      ]);
      if (!snap.exists()) throw new Error('Session not found. Please check the code.');

      const sessionData = snap.data();
      const maxSeatsLimit = sessionData.maxSeats || 40; // Enforce seats rule

      // Query existing teams in the session first to enforce seat limitations
      const teamsCollRef = collection(db, `sessions/${code}/teams`);
      const teamsSnap = await getDocs(teamsCollRef);
      
      const baseUid = user.uid.split(/[-_]/)[0];

      // If the team is already inside, they can re-join/refresh
      const existsAlready = teamsSnap.docs.some(doc => doc.id === user.uid || doc.id === baseUid);
      if (!existsAlready && teamsSnap.size >= maxSeatsLimit) {
        throw new Error(`This simulation room has reached its active capacity limit of ${maxSeatsLimit} student seats (License Cap). Please contact your administrator.`);
      }

      const team: Omit<Team, 'id'> = {
        sessionId: code,
        name: teamName,
        balance: INITIAL_VALUES.BALANCE,
        inventory: { standard: 0 },
        rawMaterials: INITIAL_VALUES.RAW_MATERIALS,
        flourStock: Math.round(0.35 * INITIAL_VALUES.RAW_MATERIALS),
        sugarStock: Math.round(0.25 * INITIAL_VALUES.RAW_MATERIALS),
        eggsStock: Math.round(0.20 * INITIAL_VALUES.RAW_MATERIALS),
        cocoaStock: Math.round(0.20 * INITIAL_VALUES.RAW_MATERIALS),
        flourOrderQty: 2000,
        flourROP: 500,
        sugarOrderQty: 1500,
        sugarROP: 400,
        eggsOrderQty: 1200,
        eggsROP: 300,
        cocoaOrderQty: 800,
        cocoaROP: 200,
        satisfaction: 100,
        ready: false,
        joinedAt: new Date().toISOString(),
        orderQuantity: 2000,
        reorderPoint: 500,
        stations: JSON.parse(JSON.stringify(DEFAULT_STATIONS)),
        deliveries: [],
        contracts: getInitialContracts()
      };

      await setDoc(doc(db, `sessions/${code}/teams`, baseUid), team);
      
      // If this is a mock student user, save their teamId in sessionStorage so it persists correctly on load
      const activeMockStr = sessionStorage.getItem('active_mock_user');
      if (activeMockStr) {
        try {
          const mockUser = JSON.parse(activeMockStr);
          if (mockUser.role === 'student') {
            mockUser.teamId = baseUid;
            sessionStorage.setItem('active_mock_user', JSON.stringify(mockUser));
          }
        } catch (e) {
          console.error("Failed to parse mock user in joinSession:", e);
        }
      }

      setSession({ id: snap.id, ...sessionData } as Session);
    } catch (err: any) {
      if (err.message?.includes('offline')) {
        throw new Error('Database connection failed. Please check your internet or try refreshing.');
      }
      logSystemError(err.message || 'Error joining session', 'GameContext.joinSession', 'warning', code);
      throw err;
    }
  };

  const resumeSession = async (code: string) => {
    if (!user) throw new Error('Not logged in');
    const sessionRef = doc(db, 'sessions', code);
    try {
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) throw new Error('Session not found.');
      const sessionData = snap.data() as Session;
      setSession({ id: snap.id, ...sessionData });
    } catch (err: any) {
      logSystemError(err.message || 'Error resuming session', 'GameContext.resumeSession', 'warning', code);
      throw err;
    }
  };

  const startSession = async () => {
    if (!session) return;
    await updateDoc(doc(db, 'sessions', session.id), { 
      status: 'active', 
      currentRound: 1,
      roundStartedAt: new Date().toISOString()
    });
  };

  const togglePauseSession = async (isPaused: boolean) => {
    if (!session) return;
    if (!isAdmin) throw new Error('Unauthorized');
    await updateDoc(doc(db, 'sessions', session.id), { 
      status: isPaused ? 'paused' : 'active',
      ...(isPaused ? {} : { roundStartedAt: new Date().toISOString() })
    });
  };

  const submitDecision = async (production: Record<string, number>, rawMaterials: number, marketing: number) => {
    if (isDirectPlay) {
      const nextTeam = {
        ...directTeam,
        ready: true,
        currentDecision: {
          productionQty: production,
          rawMaterialOrder: rawMaterials,
          marketingSpend: marketing,
          submittedAt: new Date().toISOString()
        }
      };
      setDirectTeam(nextTeam);
      return;
    }

    if (!session || !currentTeam || !user) return;
    
    const decision: Omit<Decision, 'id'> = {
      sessionId: session.id,
      teamId: currentTeam.id,
      round: session.currentRound,
      productionQty: production,
      rawMaterialOrder: rawMaterials,
      marketingSpend: marketing,
      submittedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, `sessions/${session.id}/teams/${currentTeam.id}/decisions`, `r${session.currentRound}`), decision);
    await updateDoc(doc(db, `sessions/${session.id}/teams/${currentTeam.id}`), { 
      ready: true,
      currentDecision: {
        productionQty: production,
        rawMaterialOrder: rawMaterials,
        marketingSpend: marketing,
        submittedAt: decision.submittedAt
      }
    });
  };

  const advanceRound = async () => {
    if (isDirectPlay) {
      // Resolve the solo round immediately
      const currentDecision = directTeam.currentDecision || {
        productionQty: { standard: 0, diet: 0, premium: 0 },
        rawMaterialOrder: 0,
        marketingSpend: 0,
        submittedAt: new Date().toISOString()
      };

      const decision: Decision = {
        id: `r${directSession.currentRound}`,
        sessionId: 'direct-play',
        teamId: 'solo-chef',
        round: directSession.currentRound,
        productionQty: currentDecision.productionQty,
        rawMaterialOrder: currentDecision.rawMaterialOrder,
        marketingSpend: currentDecision.marketingSpend,
        submittedAt: currentDecision.submittedAt
      };

      const { updatedTeam, result } = processDecision(
        directTeam,
        decision,
        directSession.currentRound,
        directResults,
        directSession.settings.capacity,
        directSession.activeEvent,
        directParams
      );

      const nextRound = directSession.currentRound + 1;
      const nextStatus: GameStatus = nextRound > directSession.totalRounds ? 'ended' : 'active';

      setDirectTeam({
        ...updatedTeam,
        ready: false,
        currentDecision: undefined // reset for next round
      });

      setDirectResults([...directResults, result]);

      setDirectSession({
        ...directSession,
        currentRound: nextRound,
        status: nextStatus,
        roundStartedAt: new Date().toISOString()
      });

      return;
    }

    if (!session) return;
    const sessionId = session.id;

    await runTransaction(db, async (transaction) => {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists()) return;
      const currentSessionData = sessionSnap.data() as Session;

      if (currentSessionData.status !== 'active') return;
      
      const currentRound = currentSessionData.currentRound;
      // If round has already been advanced by another client, abort
      if (currentRound !== session.currentRound) {
        return;
      }

      const nextRound = currentRound + 1;
      const isEnded = nextRound > currentSessionData.totalRounds;

      // 1. PERFORM ALL READS FIRST (Firestore requires all reads before any writes in a transaction)
      const decisionsMap: Record<string, any> = {};
      const teamsDataMap: Record<string, Team> = {};

      for (const team of allTeams) {
        const teamRef = doc(db, `sessions/${sessionId}/teams/${team.id}`);
        const teamSnap = await transaction.get(teamRef);
        if (teamSnap.exists()) {
          teamsDataMap[team.id] = teamSnap.data() as Team;
        }

        const decRef = doc(db, `sessions/${sessionId}/teams/${team.id}/decisions`, `r${currentRound}`);
        const decSnap = await transaction.get(decRef);
        decisionsMap[team.id] = decSnap.exists() ? decSnap.data() : null;
      }

      // 2. PERFORM ALL WRITES SECOND
      for (const team of allTeams) {
        const liveTeamData = teamsDataMap[team.id];
        if (!liveTeamData) continue;

        const decisionData = decisionsMap[team.id] || {
          productionQty: {},
          rawMaterialOrder: 0,
          marketingSpend: 0,
        };

        const { updatedTeam, result } = processDecision(
          liveTeamData, 
          decisionData as Decision, 
          currentRound, 
          [], // We should ideally pass prev results but logic is mostly round-independent for now
          currentSessionData.settings.capacity || INITIAL_VALUES.CAPACITY,
          currentSessionData.activeEvent,
          currentSessionData.settings.parameters
        );

        const teamRef = doc(db, `sessions/${sessionId}/teams/${team.id}`);
        const resRef = doc(db, `sessions/${sessionId}/teams/${team.id}/results`, `r${currentRound}`);
        
        transaction.update(teamRef, updatedTeam as any);
        transaction.set(resRef, result);
      }

      transaction.update(sessionRef, { 
        currentRound: nextRound,
        status: isEnded ? 'ended' : 'active',
        activeEvent: null, // Clear event after round resolution
        roundStartedAt: new Date().toISOString()
      });
    });
  };

  const updateSettings = async (newSettings: Partial<GameSettings>) => {
    if (isDirectPlay) {
      setDirectSession(s => ({
        ...s,
        totalRounds: newSettings.totalRounds ?? s.totalRounds,
        settings: { ...s.settings, ...newSettings }
      }));
      return;
    }

    if (!session) return;
    const settings = { ...session.settings, ...newSettings };
    await updateDoc(doc(db, 'sessions', session.id), { 
      settings,
      totalRounds: settings.totalRounds ?? session.totalRounds
    });
  };

  const triggerEvent = async (event: GameEvent | null) => {
    if (isDirectPlay) {
      setDirectSession(s => ({ ...s, activeEvent: event }));
      return;
    }

    if (!session) return;
    await updateDoc(doc(db, 'sessions', session.id), { activeEvent: event });
  };

  const updateDirectParameters = (newParams: Partial<SimulationParameters>) => {
    const updated = { ...directParams, ...newParams };
    setDirectParams(updated);

    // If starting on Round 1, propagate parameters directly to the active session parameters
    if (directSession.currentRound === 1) {
      setDirectTeam(t => ({
        ...t,
        balance: updated.initialBalance ?? t.balance,
        rawMaterials: updated.initialRawMaterials ?? t.rawMaterials,
      }));
      setDirectSession(s => ({
        ...s,
        settings: {
          ...s.settings,
          capacity: updated.initialCapacity ?? s.settings.capacity,
        }
      }));
    }
  };

  const resetDirectSession = () => {
    setDirectSession({
      id: 'direct-play',
      instructorId: 'direct',
      code: 'DIRECT',
      status: 'active',
      currentRound: 1,
      totalRounds: directSession.totalRounds || 10,
      settings: {
        roundDuration: 15,
        difficulty: 'medium',
        totalRounds: directSession.totalRounds || 10,
        capacity: directParams.initialCapacity,
      },
      createdAt: new Date().toISOString(),
      roundStartedAt: new Date().toISOString(),
    });

    setDirectTeam({
      id: 'solo-chef',
      sessionId: 'direct-play',
      name: 'Solo Chef',
      balance: directParams.initialBalance,
      inventory: { standard: 0 },
      rawMaterials: directParams.initialRawMaterials,
      satisfaction: 100,
      ready: false,
      joinedAt: new Date().toISOString(),
      orderQuantity: 2000,
      reorderPoint: 500,
      stations: JSON.parse(JSON.stringify(DEFAULT_STATIONS)),
      deliveries: [],
      contracts: getInitialContracts()
    });

    setDirectResults([]);
  };

  const acceptContract = async (contractId: string) => {
    if (isDirectPlay) {
      setDirectTeam(t => {
        const nextContracts = (t.contracts || []).map(c => 
          c.id === contractId ? { ...c, status: 'accepted' as const } : c
        );
        return { ...t, contracts: nextContracts };
      });
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    const updatedContracts = (currentTeam.contracts || []).map(c => 
      c.id === contractId ? { ...c, status: 'accepted' as const } : c
    );
    await updateDoc(teamRef, { contracts: updatedContracts });
  };

  const abortContract = async (contractId: string) => {
    if (isDirectPlay) {
      setDirectTeam(t => {
        const target = (t.contracts || []).find(c => c.id === contractId);
        const penalty = target ? target.exitPenalty : 0;
        const nextContracts = (t.contracts || []).map(c => 
          c.id === contractId ? { ...c, status: 'aborted' as const } : c
        );
        return { ...t, balance: Math.max(0, t.balance - penalty), contracts: nextContracts };
      });
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    const target = (currentTeam.contracts || []).find(c => c.id === contractId);
    const penalty = target ? target.exitPenalty : 0;
    const updatedContracts = (currentTeam.contracts || []).map(c => 
      c.id === contractId ? { ...c, status: 'aborted' as const } : c
    );
    await updateDoc(teamRef, { 
      balance: Math.max(0, currentTeam.balance - penalty), 
      contracts: updatedContracts 
    });
  };

  const buyMachine = async (stationId: 'mixing' | 'bottling' | 'packaging' | 'icing') => {
    if (isDirectPlay) {
      setDirectTeam(t => {
        const stations = t.stations || JSON.parse(JSON.stringify(DEFAULT_STATIONS));
        if (!stations.icing) {
          stations.icing = { ...DEFAULT_STATIONS.icing };
        }
        const st = stations[stationId];
        const actualPrice = DEFAULT_STATIONS[stationId].purchasePrice;
        if (t.balance < actualPrice) {
          alert(`Insufficient funds! Total Cash is too low. Machine costs ₹${actualPrice.toLocaleString()}.`);
          return t;
        }
        const updatedStations = {
          ...stations,
          [stationId]: {
            ...st,
            owned: st.owned + 1,
            active: st.active + 1,
            purchasePrice: actualPrice // Auto-heal stale data
          }
        };
        return {
          ...t,
          balance: t.balance - actualPrice,
          stations: updatedStations
        };
      });
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    const stations = currentTeam.stations || JSON.parse(JSON.stringify(DEFAULT_STATIONS));
    if (!stations.icing) {
      stations.icing = { ...DEFAULT_STATIONS.icing };
    }
    const st = stations[stationId];
    const actualPrice = DEFAULT_STATIONS[stationId].purchasePrice;
    if (currentTeam.balance < actualPrice) {
      alert(`Insufficient funds! Total Cash is too low. Machine costs ₹${actualPrice.toLocaleString()}.`);
      return;
    }
    const updatedStations = {
      ...stations,
      [stationId]: {
        ...st,
        owned: st.owned + 1,
        active: st.active + 1,
        purchasePrice: actualPrice // Auto-heal stale data
      }
    };
    await updateDoc(teamRef, {
      balance: currentTeam.balance - actualPrice,
      stations: updatedStations
    });
  };

  const updateActiveMachines = async (stationId: 'mixing' | 'bottling' | 'packaging' | 'icing', count: number) => {
    if (isDirectPlay) {
      setDirectTeam(t => {
        const stations = t.stations || JSON.parse(JSON.stringify(DEFAULT_STATIONS));
        if (!stations.icing) {
          stations.icing = { ...DEFAULT_STATIONS.icing };
        }
        const st = stations[stationId];
        const validActive = Math.max(0, Math.min(st.owned, count));
        const updatedStations = {
          ...stations,
          [stationId]: {
            ...st,
            active: validActive
          }
        };
        return { ...t, stations: updatedStations };
      });
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    const stations = currentTeam.stations || JSON.parse(JSON.stringify(DEFAULT_STATIONS));
    if (!stations.icing) {
      stations.icing = { ...DEFAULT_STATIONS.icing };
    }
    const st = stations[stationId];
    const validActive = Math.max(0, Math.min(st.owned, count));
    const updatedStations = {
      ...stations,
      [stationId]: {
        ...st,
        active: validActive
      }
    };
    await updateDoc(teamRef, { stations: updatedStations });
  };

  const updateProcurementSettings = async (Q: number, R: number) => {
    if (isDirectPlay) {
      setDirectTeam(t => ({
        ...t,
        orderQuantity: Q,
        reorderPoint: R,
        flourOrderQty: Q,
        flourROP: R
      }));
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    await updateDoc(teamRef, {
      orderQuantity: Q,
      reorderPoint: R,
      flourOrderQty: Q,
      flourROP: R
    });
  };

  const updateProcurementSettingsEx = async (settings: {
    flourQ: number; flourR: number;
    sugarQ: number; sugarR: number;
    eggsQ: number; eggsR: number;
    cocoaQ: number; cocoaR: number;
  }) => {
    const dbSettings = {
      flourOrderQty: settings.flourQ,
      flourROP: settings.flourR,
      sugarOrderQty: settings.sugarQ,
      sugarROP: settings.sugarR,
      eggsOrderQty: settings.eggsQ,
      eggsROP: settings.eggsR,
      cocoaOrderQty: settings.cocoaQ,
      cocoaROP: settings.cocoaR,
      orderQuantity: settings.flourQ, // compatibility fallback
      reorderPoint: settings.flourR  // compatibility fallback
    };

    if (isDirectPlay) {
      setDirectTeam(t => ({
        ...t,
        ...dbSettings
      }));
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    await updateDoc(teamRef, dbSettings);
  };

  const rewardOvertimeLabor = async (bonusCash: number, bonusRawMaterials: number) => {
    if (isDirectPlay) {
      setDirectTeam(t => ({
        ...t,
        balance: t.balance + bonusCash,
        rawMaterials: t.rawMaterials + bonusRawMaterials
      }));
      return;
    }
    if (!session?.id || !currentTeam?.id) return;
    const teamRef = doc(db, `sessions/${session.id}/teams`, currentTeam.id);
    await updateDoc(teamRef, {
      balance: currentTeam.balance + bonusCash,
      rawMaterials: currentTeam.rawMaterials + bonusRawMaterials
    });
  };

  const updateSession = async (updates: Partial<Session>) => {
    if (!session) return;
    if (isDirectPlay) {
      setDirectSession(s => ({ ...s, ...updates } as Session));
      return;
    }
    await updateDoc(doc(db, 'sessions', session.id), updates);
  };

  const updateTeamState = async (teamId: string, updates: Partial<Team>) => {
    if (isDirectPlay) {
      setDirectTeam(t => ({ ...t, ...updates } as Team));
      return;
    }
    if (!session?.id) return;
    await updateDoc(doc(db, `sessions/${session.id}/teams`, teamId), updates);
  };

  const deleteTeamState = async (teamId: string) => {
    if (isDirectPlay) {
      return;
    }
    if (!session?.id) return;
    await deleteDoc(doc(db, `sessions/${session.id}/teams`, teamId));
  };

  const activeUser = isDirectPlay 
    ? (user || { uid: 'solo-chef', displayName: 'Solo Chef', email: 'solo@baking.org' } as User)
    : user;

  const currentSessionValue = isDirectPlay ? directSession : session;
  const currentTeamValue = isDirectPlay ? directTeam : currentTeam;
  const allTeamsValue = isDirectPlay ? [directTeam] : allTeams;
  const resultsValue = isDirectPlay ? directResults : results;

  return (
    <GameContext.Provider value={{ 
      user: activeUser, 
      loading, 
      session: currentSessionValue, 
      currentTeam: currentTeamValue, 
      allTeams: allTeamsValue, 
      results: resultsValue,
      isAdmin,
      isDirectPlay,
      setIsDirectPlay,
      directParams,
      updateDirectParameters,
      resetDirectSession,
      login, 
      loginAnonymously,
      loginWithEmail,
      loginWithMockCredentials,
      loginAdmin,
      createSession,  
      provisionSession,
      joinSession, 
      startSession, 
      togglePauseSession,
      submitDecision, 
      advanceRound, 
      updateSettings, 
      triggerEvent,
      acceptContract,
      abortContract,
      buyMachine,
      updateActiveMachines,
      updateProcurementSettings,
      updateProcurementSettingsEx,
      rewardOvertimeLabor,
      resumeSession,
      updateSession,
      updateTeamState,
      deleteTeamState,
      theme,
      toggleTheme,
      logout
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
