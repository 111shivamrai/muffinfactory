/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { useGame } from '../context/GameContext';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDocs,
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { License, SystemLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, KeyRound, Server, Plus, Trash2, Users, RefreshCw, AlertTriangle, CheckCircle, 
  Activity, Database, Lock, LogOut, Terminal, Layers, ShieldAlert, Eye, Sliders,
  Megaphone, LayoutDashboard, Radio, Settings, Shield, TrendingUp, Zap, 
  Clock, Globe, ChevronRight, Search, Bell, UserCog, BarChart3, Wifi, 
  WifiOff, Hash, Calendar, Mail, Building2, Crown, Star, Flame, EyeOff, Clipboard, Check,
  User
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   SOVEREIGN ADMIN CONTROL CENTER — PREMIUM EDITION
   ═══════════════════════════════════════════════════ */

const SUPERVISORS = [
  { id: 'SUP-001', name: 'Shivam Rai', role: 'System Administrator', username: '111shivamrai', avatar: '🛡️' },
  { id: 'SUP-002', name: 'Arya Jain', role: 'System Administrator', username: 'aryajain1906', avatar: '🛡️' }
];

type NavTab = 'overview' | 'sessions' | 'licenses' | 'broadcast' | 'logs' | 'settings';

export function SaasAdminDashboard() {
  const { theme, toggleTheme, user, isAdmin, loginAdmin, logout } = useGame();
  
  // Admin Login Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const currentSupervisor = useMemo(() => {
    if (!user || !user.email) return null;
    const username = user.email.split('@')[0].toLowerCase();
    const supervisor = SUPERVISORS.find(s => s.username.toLowerCase() === username);
    if (supervisor) return supervisor;
    return {
      id: 'SUP-GEN',
      name: username.charAt(0).toUpperCase() + username.slice(1),
      role: 'System Administrator',
      username: username,
      avatar: '🛡️'
    };
  }, [user]);

  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data
  const [licenses, setLicenses] = useState<License[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Password visibility maps
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Edit Session Modal Form State
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editMaxSeats, setEditMaxSeats] = useState(40);
  const [editTotalRounds, setEditTotalRounds] = useState(10);
  const [editInstructorId, setEditInstructorId] = useState('');
  const [editInstructorPassword, setEditInstructorPassword] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');

  // License Form
  const [newLicCode, setNewLicCode] = useState('');
  const [newLicCustomer, setNewLicCustomer] = useState('');
  const [newLicEmail, setNewLicEmail] = useState('');
  const [newLicSeats, setNewLicSeats] = useState(40);
  const [newLicType, setNewLicType] = useState<'academic' | 'corporate'>('academic');
  const [newLicDuration, setNewLicDuration] = useState('30');
  const [newLicNotes, setNewLicNotes] = useState('');
  const [newLicInstructorId, setNewLicInstructorId] = useState('');
  const [newLicInstructorPassword, setNewLicInstructorPassword] = useState('');
  
  // Custom student ID credentials list states
  const [newLicStudentAccounts, setNewLicStudentAccounts] = useState<{ studentId: string; studentPassword: string; }[]>([]);
  const [showStudentCredsModal, setShowStudentCredsModal] = useState(false);
  const [newStudentIdInput, setNewStudentIdInput] = useState('');
  const [newStudentPasswordInput, setNewStudentPasswordInput] = useState('');
  const [credsSearchQuery, setCredsSearchQuery] = useState('');
  
  // Viewing existing license credentials states
  const [viewingLicCreds, setViewingLicCreds] = useState<License | null>(null);
  const [showViewCredsModal, setShowViewCredsModal] = useState(false);
  const [credsViewSearchQuery, setCredsViewSearchQuery] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    const clean = newLicCode.trim().toUpperCase();
    if (clean) {
      setNewLicInstructorId(prev => prev || (clean + '-INST'));
      setNewLicInstructorPassword(prev => prev || Math.random().toString(36).substring(2, 8).toUpperCase());
      setNewLicStudentAccounts(prev => {
        if (prev.length > 0) return prev;
        return [
          { studentId: `${clean}-STUD-A`, studentPassword: Math.random().toString(36).substring(2, 8).toUpperCase() },
          { studentId: `${clean}-STUD-B`, studentPassword: Math.random().toString(36).substring(2, 8).toUpperCase() },
          { studentId: `${clean}-STUD-C`, studentPassword: Math.random().toString(36).substring(2, 8).toUpperCase() }
        ];
      });
    } else {
      setNewLicInstructorId('');
      setNewLicInstructorPassword('');
      setNewLicStudentAccounts([]);
    }
  }, [newLicCode]);

  const togglePasswordReveal = (label: string) => {
    setRevealedPasswords(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleAddStudentAccount = () => {
    const cleanId = newStudentIdInput.trim();
    const cleanPass = newStudentPasswordInput.trim();
    if (!cleanId || !cleanPass) {
      alert("Both Student ID and Password are required.");
      return;
    }
    if (newLicSeats !== 999 && newLicStudentAccounts.length >= newLicSeats) {
      alert(`Cannot add more accounts. Maximum seat limit (${newLicSeats}) reached.`);
      return;
    }
    if (newLicStudentAccounts.some(acc => acc.studentId.toUpperCase() === cleanId.toUpperCase())) {
      alert("This Student ID is already configured.");
      return;
    }
    
    const newAccounts = [...newLicStudentAccounts, { studentId: cleanId, studentPassword: cleanPass }];
    setNewLicStudentAccounts(newAccounts);
    
    // Suggest the next logic credentials
    const clean = newLicCode.trim().toUpperCase() || 'LICENSE';
    setNewStudentIdInput(`${clean}-STUD-${newAccounts.length + 1}`);
    setNewStudentPasswordInput(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleRemoveStudentAccount = (index: number) => {
    const updated = [...newLicStudentAccounts];
    updated.splice(index, 1);
    setNewLicStudentAccounts(updated);
  };


  // Broadcast
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState('');

  // Logs
  const [selectedLogsSeverity, setSelectedLogsSeverity] = useState<'all' | 'warning' | 'error' | 'fatal'>('all');

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ══════════════════════════════════════════
  // REALTIME DATA LISTENERS
  // ══════════════════════════════════════════
  useEffect(() => {
    if (!user || !isAdmin) return;
    setLoading(true);

    // Restore from localStorage immediately while Firestore connects
    try {
      const cachedLicenses = localStorage.getItem('cached_licenses');
      if (cachedLicenses) {
        const parsed = JSON.parse(cachedLicenses);
        if (Array.isArray(parsed) && parsed.length > 0) setLicenses(parsed);
      }
    } catch {}
    try {
      const cachedSessions = localStorage.getItem('cached_sessions');
      if (cachedSessions) {
        const parsed = JSON.parse(cachedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) setActiveSessions(parsed);
      }
    } catch {}

    const unsubLicenses = onSnapshot(collection(db, 'licenses'), (snap) => {
      const dbData = snap.docs.map(d => ({ id: d.id, ...d.data() } as License));
      
      // Deep merge with localStorage to prevent data loss on tab switches 
      // when using mock/anonymous auth that might lose cloud sync
      try {
        const localStr = localStorage.getItem('cached_licenses');
        const localData = localStr ? JSON.parse(localStr) : [];
        
        // Use a Map to merge, keeping local data if it exists and prioritizing Firestore updates
        const mergedMap = new Map();
        localData.forEach((l: any) => mergedMap.set(l.id, l));
        dbData.forEach((l: any) => mergedMap.set(l.id, l));
        
        const merged = Array.from(mergedMap.values());
        setLicenses(merged);
        localStorage.setItem('cached_licenses', JSON.stringify(merged));
      } catch {
        setLicenses(dbData);
        localStorage.setItem('cached_licenses', JSON.stringify(dbData));
      }
    }, (err) => {
      console.warn("Licenses listener error:", err);
      // Keep existing state from localStorage
    });

    const unsubLogs = onSnapshot(collection(db, 'system_logs'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemLog))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSystemLogs(list);
    }, (err) => {
      console.warn("System logs listener error:", err);
    });

    const unsubSessions = onSnapshot(collection(db, 'sessions'), async (snap) => {
      const sessionsRaw = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(s => s.status !== 'deleted');
      const enriched = await Promise.all(
        sessionsRaw.map(async (sess) => {
          try {
            const teamsSnap = await getDocs(collection(db, `sessions/${sess.id}/teams`));
            return { ...sess, activeTeamsCount: teamsSnap.size, teams: teamsSnap.docs.map(d => d.data()) };
          } catch { return { ...sess, activeTeamsCount: 0, teams: [] }; }
        })
      );
      setActiveSessions(enriched);
      setLoading(false);
      // Cache sessions to localStorage
      try { localStorage.setItem('cached_sessions', JSON.stringify(enriched)); } catch {}
    }, (err) => {
      console.warn("Sessions listener error:", err);
      setLoading(false);
    });

    const unsubBroadcast = onSnapshot(doc(db, 'system_notifications', 'broadcast'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBroadcastMessage(data.message || '');
        setBroadcastType(data.type || 'info');
        setBroadcastActive(!!data.active);
      }
    }, (err) => {
      console.warn("Broadcast listener error:", err);
    });

    return () => { unsubLicenses(); unsubLogs(); unsubSessions(); unsubBroadcast(); };
  }, [user, isAdmin]);

  // ══════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════
  const handleUpdateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastLoading(true);
    setBroadcastStatus('');
    try {
      await setDoc(doc(db, 'system_notifications', 'broadcast'), {
        message: broadcastMessage.trim(), type: broadcastType, active: broadcastActive,
        updatedAt: new Date().toISOString(), updatedBy: currentSupervisor?.name || 'Admin'
      });
      setBroadcastStatus('✔ Broadcast updated successfully!');
      setTimeout(() => setBroadcastStatus(''), 4000);
    } catch (err: any) { setBroadcastStatus(`⛔ Failed: ${err.message}`); }
    finally { setBroadcastLoading(false); }
  };

  const handleDeactivateBroadcast = async () => {
    setBroadcastLoading(true);
    try {
      await setDoc(doc(db, 'system_notifications', 'broadcast'), {
        message: broadcastMessage, type: broadcastType, active: false,
        updatedAt: new Date().toISOString(), updatedBy: currentSupervisor?.name || 'Admin'
      });
      setBroadcastActive(false);
      setBroadcastStatus('✔ Broadcast deactivated');
      setTimeout(() => setBroadcastStatus(''), 4000);
    } catch (err: any) { setBroadcastStatus(`⛔ Failed: ${err.message}`); }
    finally { setBroadcastLoading(false); }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    const cleanCode = newLicCode.trim().toUpperCase();
    if (!cleanCode || !newLicCustomer || !newLicEmail) { setFormError('All required fields must be filled.'); return; }
    if (licenses.some(l => l.id === cleanCode)) { setFormError(`License "${cleanCode}" already exists.`); return; }
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + parseInt(newLicDuration, 10));
    try {
      const newLicense = {
        id: cleanCode,
        customerName: newLicCustomer.trim(),
        email: newLicEmail.trim(),
        maxSeats: Number(newLicSeats),
        type: newLicType,
        status: 'active',
        expiresAt: expireDate.toISOString(),
        createdAt: new Date().toISOString(),
        notes: newLicNotes.trim(),
        instructorId: newLicInstructorId.trim(),
        instructorPassword: newLicInstructorPassword.trim(),
        studentId: newLicStudentAccounts[0]?.studentId || `${cleanCode}-STUD`,
        studentPassword: newLicStudentAccounts[0]?.studentPassword || 'PASS',
        studentAccounts: newLicStudentAccounts
      };

      // Optimistic local save to deeply guarantee persistence across tabs
      try {
        const localStr = localStorage.getItem('cached_licenses');
        const localData = localStr ? JSON.parse(localStr) : [];
        const map = new Map();
        localData.forEach((l: any) => map.set(l.id, l));
        map.set(cleanCode, newLicense);
        const merged = Array.from(map.values());
        localStorage.setItem('cached_licenses', JSON.stringify(merged));
        setLicenses(merged);
      } catch {}

      await setDoc(doc(db, 'licenses', cleanCode), newLicense);

      // Auto-provision a session room for this license so the Instructor can log in immediately
      const newSession = {
        instructorId: newLicInstructorId.trim(),
        customInstructorId: newLicInstructorId.trim(),
        customInstructorPassword: newLicInstructorPassword.trim(),
        customStudentId: newLicStudentAccounts[0]?.studentId || `${cleanCode}-STUD`,
        customStudentPassword: newLicStudentAccounts[0]?.studentPassword || 'PASS',
        instructorIdMock: newLicInstructorId.trim(),
        instructorPassword: newLicInstructorPassword.trim(),
        studentId: newLicStudentAccounts[0]?.studentId || `${cleanCode}-STUD`,
        studentPassword: newLicStudentAccounts[0]?.studentPassword || 'PASS',
        studentAccounts: newLicStudentAccounts,
        code: cleanCode,
        status: 'waiting',
        currentRound: 0,
        totalRounds: 10,
        settings: {
          roundDuration: 120,
          difficulty: 'medium',
          totalRounds: 10,
          capacity: Number(newLicSeats),
        },
        createdAt: new Date().toISOString(),
        maxSeats: Number(newLicSeats),
        licensedCustomer: newLicCustomer.trim(),
        licenseCode: cleanCode,
        startDate: '',
        endDate: ''
      };

      try {
        await setDoc(doc(db, 'sessions', cleanCode), newSession);
        // Save to local storage cache for sessions
        const localSessStr = localStorage.getItem('local_sessions') || '[]';
        const localSessList = JSON.parse(localSessStr);
        const filtered = localSessList.filter((s: any) => s.id !== cleanCode);
        filtered.push({ id: cleanCode, ...newSession });
        localStorage.setItem('local_sessions', JSON.stringify(filtered));
      } catch (sessErr) {
        console.warn('Failed to auto-provision session:', sessErr);
      }

      setFormSuccess(`License "${cleanCode}" created successfully!`);
      setNewLicCode(''); setNewLicCustomer(''); setNewLicEmail(''); setNewLicNotes('');
      setNewLicInstructorId(''); setNewLicInstructorPassword('');
      setNewLicStudentAccounts([]);
    } catch (err: any) { setFormError(`Failed: ${err.message}`); }
  };

  const handleToggleLicenseStatus = async (id: string, status: string) => {
    try { await updateDoc(doc(db, 'licenses', id), { status: status === 'active' ? 'suspended' : 'active' }); }
    catch (err: any) { alert(`Failed: ${err.message}`); }
  };

  const handleDeleteLicense = async (id: string) => {
    if (!confirm(`Delete license ${id}? This will lock out all users on this key.`)) return;
    try { 
      // Deeply remove from local cache immediately
      try {
        const localStr = localStorage.getItem('cached_licenses');
        if (localStr) {
          const localData = JSON.parse(localStr).filter((l: any) => l.id !== id);
          localStorage.setItem('cached_licenses', JSON.stringify(localData));
          setLicenses(localData);
        }
      } catch {}
      await deleteDoc(doc(db, 'licenses', id)); 
    } catch (err: any) { alert(`Failed: ${err.message}`); }
  };

  const handleRemoveSession = async (id: string) => {
    if (!confirm(`Are you sure you want to remove session ${id}? This deletes the lobby entirely.`)) return;
    try { 
      await updateDoc(doc(db, 'sessions', id), { status: 'deleted' }); 
      try {
        const localSessStr = localStorage.getItem('local_sessions') || '[]';
        const localSessList = JSON.parse(localSessStr);
        const filtered = localSessList.filter((ls: any) => ls.id !== id);
        localStorage.setItem('local_sessions', JSON.stringify(filtered));
      } catch {}
    } catch (err: any) { alert(`Failed to remove session: ${err.message}`); }
  };

  const handleOpenSettings = (sess: any) => {
    setEditingSession(sess);
    setEditMaxSeats(sess.maxSeats || 40);
    setEditTotalRounds(sess.totalRounds || 10);
    setEditInstructorId(sess.instructorId || '');
    setEditInstructorPassword(sess.instructorPassword || '');
    setEditStudentId(sess.studentId || '');
    setEditStudentPassword(sess.studentPassword || '');
    setEditStartDate(sess.startDate || '');
    setEditEndDate(sess.endDate || '');
    setEditSuccess('');
    setEditError('');
  };

  const handleSaveSessionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      const sessRef = doc(db, 'sessions', editingSession.id);
      const updateData = {
        maxSeats: editMaxSeats,
        totalRounds: editTotalRounds,
        instructorId: editInstructorId,
        instructorPassword: editInstructorPassword,
        studentId: editStudentId,
        studentPassword: editStudentPassword,
        startDate: editStartDate,
        endDate: editEndDate,
      };
      await updateDoc(sessRef, updateData);
      setEditSuccess('Session settings updated successfully!');
      
      try {
        const localSessStr = localStorage.getItem('local_sessions') || '[]';
        const localSessList = JSON.parse(localSessStr);
        const idx = localSessList.findIndex((ls: any) => ls.id === editingSession.id);
        if (idx !== -1) {
          localSessList[idx] = { ...localSessList[idx], ...updateData };
          localStorage.setItem('local_sessions', JSON.stringify(localSessList));
        }
      } catch (e) {
        console.error("Local storage sync error:", e);
      }

      setTimeout(() => {
        setEditingSession(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update session settings');
    } finally {
      setEditLoading(false);
    }
  };

  const handleForceAdvance = async (id: string, round: number) => {
    try { await updateDoc(doc(db, 'sessions', id), { currentRound: round + 1, roundStartedAt: new Date().toISOString() }); }
    catch (err: any) { alert(`Failed: ${err.message}`); }
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all system logs? This is irreversible.')) return;
    try { const q = await getDocs(collection(db, 'system_logs')); await Promise.all(q.docs.map(d => deleteDoc(d.ref))); }
    catch (err: any) { alert(`Failed: ${err.message}`); }
  };

  const handleExit = () => { window.location.hash = ''; window.location.reload(); };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setLoginError('Please enter both Admin ID and Password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      await loginAdmin(adminUsername.trim(), adminPassword);
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Invalid admin credentials or connection failure.';
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        errMsg = 'Incorrect Admin ID or Password.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setLoginError(errMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates(prev => ({ ...prev, [label]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [label]: false }));
      }, 2000);
    });
  };

  const filteredLogs = systemLogs.filter(l => selectedLogsSeverity === 'all' ? true : l.severity === selectedLogsSeverity);

  // Search filter
  const searchFilteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeSessions;
    return activeSessions.filter(s => 
      s.code.toLowerCase().includes(q) || 
      (s.licensedCustomer && s.licensedCustomer.toLowerCase().includes(q))
    );
  }, [activeSessions, searchQuery]);

  const searchFilteredLicenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return licenses;
    return licenses.filter(l => 
      l.id.toLowerCase().includes(q) || 
      l.customerName.toLowerCase().includes(q) || 
      l.email.toLowerCase().includes(q)
    );
  }, [licenses, searchQuery]);

  // Stats
  const totalPlayers = activeSessions.reduce((a, s) => a + (s.activeTeamsCount || 0), 0);
  const totalSeats = licenses.reduce((a, l) => a + l.maxSeats, 0);
  const activeLicenses = licenses.filter(l => l.status === 'active').length;
  const errorCount = systemLogs.filter(l => l.severity === 'error' || l.severity === 'fatal').length;

  // Nav items
  const navItems: { key: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'sessions', label: 'Sessions', icon: <Server className="w-4 h-4" />, badge: activeSessions.length },
    { key: 'licenses', label: 'Licenses', icon: <Key className="w-4 h-4" />, badge: licenses.length },
    { key: 'broadcast', label: 'Broadcast', icon: <Radio className="w-4 h-4" /> },
    { key: 'logs', label: 'System Logs', icon: <Terminal className="w-4 h-4" />, badge: errorCount > 0 ? errorCount : undefined },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  // ══════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0a1628_0%,#07080f_70%)]" />
          {[...Array(30)].map((_, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 3 + Math.random() * 4, delay: Math.random() * 5 }}
              className="absolute w-[2px] h-[2px] bg-indigo-400 rounded-full"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            />
          ))}
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-indigo-500/5 rounded-full" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md">
          
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-indigo-500/15 rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
            
            <div className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    Admin Control Center
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">System Authentication Required</p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-950/30 border border-red-500/20 text-red-200 text-[11px] rounded-xl flex items-start gap-2 font-mono"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </motion.div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 pl-1">Admin ID</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="Enter administrator ID..."
                        className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/40 text-white rounded-xl py-3 pl-10 pr-4 text-xs font-mono outline-none transition-all placeholder:text-zinc-650"
                        disabled={loginLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 pl-1">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/40 text-white rounded-xl py-3 pl-10 pr-12 text-xs font-mono outline-none transition-all placeholder:text-zinc-650"
                        disabled={loginLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        disabled={loginLoading}
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <motion.button 
                  type="submit"
                  disabled={loginLoading}
                  whileHover={{ scale: 1.01 }} 
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-2 border border-indigo-400/20 disabled:border-zinc-850 transition-all mt-6"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      Secure Login
                    </>
                  )}
                </motion.button>
              </form>
              <button onClick={handleExit} className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-400 font-mono uppercase tracking-wider cursor-pointer py-1 mt-4">
                ← Return to Simulator
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-red-500/15 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2 tracking-tight">Access Denied</h1>
          <p className="text-zinc-400 mb-6 font-medium text-sm">You are not recognized as a system administrator.</p>
          <button onClick={logout} className="px-6 py-3 bg-white/5 text-white border border-zinc-800 rounded-xl hover:bg-white/10 transition-colors cursor-pointer font-medium text-sm shadow-sm">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // MAIN DASHBOARD (LIGHT & DARK STYLES)
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-800 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* ═══ SIDEBAR ═══ */}
      <motion.aside 
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between sticky top-0 h-screen overflow-hidden z-30 transition-colors duration-300"
      >
        {/* Top: Logo */}
        <div>
          <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
                <h1 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-indigo-400 leading-none">Admin Center</h1>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-mono uppercase mt-0.5">Control Panel</p>
              </motion.div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer group ${
                  activeTab === item.key 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-transparent'
                }`}>
                <span className={activeTab === item.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-350'}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold uppercase tracking-wider flex-1">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge !== undefined && (
                  <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-full ${
                    item.key === 'logs' ? 'bg-red-100 dark:bg-red-500/20 text-red-650 dark:text-red-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400'
                  }`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom: User + Collapse */}
        <div className="p-3 border-t border-slate-150 dark:border-slate-800 space-y-2">
          {!sidebarCollapsed && currentSupervisor && (
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-xl shrink-0">{currentSupervisor.avatar}</span>
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-slate-800 dark:text-white block leading-none truncate">{currentSupervisor.name}</span>
                <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-mono uppercase truncate block mt-0.5">{currentSupervisor.role}</span>
              </div>
            </div>
          )}
          <div className="flex gap-1.5">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex-1 h-9 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <button onClick={handleExit}
              className="h-9 px-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* ─── TOP BAR ─── */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
              {navItems.find(n => n.key === activeTab)?.icon}
              {navItems.find(n => n.key === activeTab)?.label}
            </h2>
            <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" />
              <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">Live</span>
            </motion.span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder={activeTab === 'licenses' ? "Search customer, email..." : "Search lobby code..."}
                className="bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 pl-8 pr-4 py-1.5 rounded-lg text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-300 w-52 placeholder:text-slate-400 dark:placeholder:text-white/15 transition-all" 
              />
            </div>
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleTimeString()}
            </div>
            <button 
              onClick={toggleTheme} 
              className="h-8 px-3 bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850 cursor-pointer uppercase transition-colors flex items-center gap-1"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {/* ═══════════════ OVERVIEW ═══════════════ */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Welcome */}
                  <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent border border-indigo-500/10 dark:border-indigo-500/10 rounded-2xl p-6 flex items-center justify-between shadow-xs">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white">Welcome back, {currentSupervisor?.name} {currentSupervisor?.avatar}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Platform overview, license registry activity and system metrics.</p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-500">
                      <div>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      <div className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">Role: {currentSupervisor?.role}</div>
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Active Lobbies', value: activeSessions.length, suffix: 'Rooms online', icon: <Server className="w-5 h-5" />, color: 'indigo', trend: '+' + activeSessions.length + ' rooms active' },
                      { label: 'Connected Teams', value: totalPlayers, suffix: 'Teams in arena', icon: <Users className="w-5 h-5" />, color: 'violet', trend: totalSeats > 0 ? `${Math.round(totalPlayers/totalSeats*100)}% seats occupied` : '—' },
                      { label: 'Active Licenses', value: activeLicenses, suffix: `/ ${licenses.length} Registered`, icon: <Key className="w-5 h-5" />, color: 'emerald', trend: `${totalSeats} total seats` },
                      { label: 'System Issues', value: errorCount, suffix: 'Errors in buffer', icon: <AlertTriangle className="w-5 h-5" />, color: errorCount > 0 ? 'red' : 'emerald', trend: errorCount === 0 ? 'Diagnostic healthy' : 'Action required' },
                    ].map((stat, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.05 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-350"
                      >
                        <div className="flex items-start justify-between relative z-10">
                          <div>
                            <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">{stat.label}</span>
                            <motion.div key={stat.value} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                              className="text-3xl font-black mt-1 text-slate-850 dark:text-white">
                              {stat.value}
                            </motion.div>
                            <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">{stat.suffix}</span>
                          </div>
                          <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800 flex items-center justify-center text-indigo-500 dark:text-indigo-400`}>
                            {stat.icon}
                          </div>
                        </div>
                        <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/50 text-[9px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> {stat.trend}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick Actions + System Health + Visual Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SVG Sparkline Activity Chart */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-500" /> Platform Transaction Volume
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Last 30 Days</span>
                      </div>
                      <div className="h-28 w-full flex items-end">
                        <svg className="w-full h-full text-indigo-500 dark:text-indigo-400" viewBox="0 0 500 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.2"/>
                              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M 0 80 Q 25 70 50 85 T 100 50 T 150 60 T 200 40 T 250 55 T 300 20 T 350 45 T 400 35 T 450 65 T 500 10 L 500 100 L 0 100 Z" fill="url(#chartGrad)"/>
                          <path d="M 0 80 Q 25 70 50 85 T 100 50 T 150 60 T 200 40 T 250 55 T 300 20 T 350 45 T 400 35 T 450 65 T 500 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2">
                        <span>Min: 12.4k txn</span>
                        <span>Avg: 34.8k txn</span>
                        <span>Max: 98.2k txn</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'New License', icon: <Plus className="w-4 h-4" />, action: () => setActiveTab('licenses'), color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border-indigo-100 dark:border-indigo-950/50' },
                          { label: 'Broadcast Alert', icon: <Radio className="w-4 h-4" />, action: () => setActiveTab('broadcast'), color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border-emerald-100 dark:border-emerald-950/50' },
                          { label: 'View Lobbies', icon: <Eye className="w-4 h-4" />, action: () => setActiveTab('sessions'), color: 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 border-violet-100 dark:border-violet-950/50' },
                          { label: 'Audit Logs', icon: <Terminal className="w-4 h-4" />, action: () => setActiveTab('logs'), color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 border-amber-100 dark:border-amber-950/50' },
                        ].map((qa, i) => (
                          <button key={i} onClick={qa.action}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between items-start gap-2.5 text-left h-24 ${qa.color}`}>
                            <span className="p-1 rounded-lg bg-white/40 dark:bg-black/20">{qa.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider">{qa.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> System Health</h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Firebase Database', status: 'healthy', icon: <Database className="w-4 h-4 text-slate-400" /> },
                          { label: 'Security & Auth', status: 'healthy', icon: <Shield className="w-4 h-4 text-slate-400" /> },
                          { label: 'Lobby Realtime Sync', status: 'healthy', icon: <Wifi className="w-4 h-4 text-slate-400" /> },
                          { label: 'Broadcast Channels', status: broadcastActive ? 'active' : 'idle', icon: <Radio className="w-4 h-4 text-slate-400" /> },
                        ].map((h, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                            <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">{h.icon} {h.label}</span>
                            <span className={`text-[8px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              h.status === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' :
                              h.status === 'active' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' :
                              'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}>{h.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════ SESSIONS ═══════════════ */}
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{searchFilteredSessions.length} active simulation lobbies matching filter</p>
                  </div>
                  
                  {searchFilteredSessions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs">
                      <Server className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 dark:text-slate-450 font-bold">No active sessions found</p>
                      <p className="text-[10px] text-slate-400 mt-1">Lobbies will appear here when instructors create simulation instances.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {searchFilteredSessions.map((sess, i) => (
                        <motion.div key={sess.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-indigo-500/25 hover:shadow-md transition-all duration-350">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 dark:text-slate-500 font-mono font-bold">Lobby Code</span>
                              <div className="text-2xl font-mono font-black text-slate-800 dark:text-white tracking-widest">{sess.code}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase font-black font-mono border ${
                              sess.status === 'active' 
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' 
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                            }`}>
                              {sess.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 border-t border-b border-slate-100 dark:border-slate-800 py-3 text-slate-650 dark:text-slate-350">
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 dark:text-slate-500 font-bold block">Connected Players</span>
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{sess.activeTeamsCount || 0}<span className="text-slate-400 dark:text-slate-500 text-xs"> / {sess.maxSeats || 40}</span></span>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 dark:text-slate-500 font-bold block">Simulated Round</span>
                              <span className="text-sm font-black text-amber-650 dark:text-amber-500">Day {sess.currentRound || 0}<span className="text-slate-400 dark:text-slate-500 text-xs"> / {sess.totalRounds || 10}</span></span>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 dark:text-slate-500 font-bold block">Institution License</span>
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate block mt-0.5">{sess.licensedCustomer || 'Default Trial'}</span>
                            </div>
                          </div>

                          {/* Credentials summary */}
                          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/40 p-2.5 rounded-lg text-[9px] font-mono space-y-1">
                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-450">
                              <span>Inst ID: <strong className="text-slate-700 dark:text-slate-300">{sess.instructorId || '—'}</strong></span>
                              <div className="flex items-center gap-1.5">
                                <span>Pass: <strong className="text-slate-700 dark:text-slate-300">{revealedPasswords[sess.id + '-inst'] ? (sess.instructorPassword || '—') : '••••••'}</strong></span>
                                <button onClick={() => togglePasswordReveal(sess.id + '-inst')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer">
                                  {revealedPasswords[sess.id + '-inst'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-450">
                              <span>Stud ID: <strong className="text-slate-700 dark:text-slate-300">{sess.studentId || '—'}</strong></span>
                              <div className="flex items-center gap-1.5">
                                <span>Pass: <strong className="text-slate-700 dark:text-slate-300">{revealedPasswords[sess.id + '-stud'] ? (sess.studentPassword || '—') : '••••••'}</strong></span>
                                <button onClick={() => togglePasswordReveal(sess.id + '-stud')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer">
                                  {revealedPasswords[sess.id + '-stud'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {sess.teams && sess.teams.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase text-slate-400 dark:text-slate-500 font-bold block">Connected Teams Lobby</span>
                              <div className="flex flex-wrap gap-1">
                                {sess.teams.map((t: any, idx: number) => (
                                  <span key={idx} className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400">{t.name}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                            <button onClick={() => handleForceAdvance(sess.id, sess.currentRound || 0)}
                              className="h-9 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/15 rounded-lg text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/15 flex items-center justify-center gap-1.5 transition-all">
                              <RefreshCw className="w-3.5 h-3.5" /> Advance Day
                            </button>
                            <button onClick={() => handleOpenSettings(sess)}
                              className="h-9 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/15 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/15 flex items-center justify-center gap-1.5 transition-all">
                              <Settings className="w-3.5 h-3.5" /> Modify Config
                            </button>
                            <button onClick={() => handleRemoveSession(sess.id)}
                              className="h-9 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/15 rounded-lg text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider cursor-pointer hover:bg-red-100 dark:hover:bg-red-500/15 flex items-center justify-center gap-1.5 col-span-2 transition-all">
                              <Trash2 className="w-3.5 h-3.5" /> Terminate Lobby
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════ LICENSES ═══════════════ */}
              {activeTab === 'licenses' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Create Form */}
                  <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
                      <Plus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Generate License Key</h3>
                    </div>
                    <form onSubmit={handleCreateLicense} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">License Code *</label>
                          <input type="text" required placeholder="NYU-STERN-2026" value={newLicCode} onChange={e => setNewLicCode(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 font-mono text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white uppercase transition-all focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Customer / University *</label>
                          <input type="text" required placeholder="NYU Stern" value={newLicCustomer} onChange={e => setNewLicCustomer(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white transition-all focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Billing Email *</label>
                          <input type="email" required placeholder="admin@nyu.edu" value={newLicEmail} onChange={e => setNewLicEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white font-mono transition-all focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Maximum Seats</label>
                          <select value={newLicSeats} onChange={e => setNewLicSeats(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-850 dark:text-white font-mono focus:border-indigo-500 outline-none">
                            <option value={10}>10 Seats</option>
                            <option value={20}>20 Seats</option>
                            <option value={40}>40 Seats</option>
                            <option value={100}>100 Seats</option>
                            <option value={999}>Unlimited</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Duration Plan</label>
                          <select value={newLicDuration} onChange={e => setNewLicDuration(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-850 dark:text-white font-mono focus:border-indigo-500 outline-none">
                            <option value="1">1 Day</option>
                            <option value="7">7 Days</option>
                            <option value="30">30 Days</option>
                            <option value="120">120 Days</option>
                            <option value="180">180 Days (Semester)</option>
                            <option value="365">1 Year</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">License Sector</label>
                          <select value={newLicType} onChange={e => setNewLicType(e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-850 dark:text-white font-mono focus:border-indigo-500 outline-none">
                            <option value="academic">Academic</option>
                            <option value="corporate">Corporate</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Custom Credentials Section */}
                      <div className="border-t border-b border-slate-100 dark:border-slate-800 py-4 my-2 grid grid-cols-2 gap-3">
                        <div className="col-span-2 text-[9px] font-black uppercase text-slate-400 tracking-wider pb-1">
                          License Login Credentials
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-slate-450 dark:text-slate-550 ml-1">Instructor ID</label>
                          <input type="text" placeholder="NYU-INST" value={newLicInstructorId} onChange={e => setNewLicInstructorId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 font-mono text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-slate-450 dark:text-slate-550 ml-1">Instructor Password</label>
                          <input type="text" placeholder="Pass" value={newLicInstructorPassword} onChange={e => setNewLicInstructorPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 font-mono text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[8px] font-bold uppercase text-slate-450 dark:text-slate-550 ml-1">Student Accounts</label>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = newLicCode.trim().toUpperCase() || 'LICENSE';
                              setNewStudentIdInput(`${clean}-STUD-${newLicStudentAccounts.length + 1}`);
                              setNewStudentPasswordInput(Math.random().toString(36).substring(2, 8).toUpperCase());
                              setShowStudentCredsModal(true);
                            }}
                            className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 p-2.5 text-xs rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                          >
                            🔑 student-id password (Click to configure individually - {newLicStudentAccounts.length} / {newLicSeats === 999 ? '∞' : newLicSeats})
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Operational Notes</label>
                        <textarea rows={2} placeholder="Add private notes..." value={newLicNotes} onChange={e => setNewLicNotes(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white font-mono" />
                      </div>
                      {formError && <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/15 text-red-500 dark:text-red-400 text-xs font-bold p-2.5 rounded-lg text-center">⛔ {formError}</div>}
                      {formSuccess && <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold p-2.5 rounded-lg text-center">✔ {formSuccess}</div>}
                      <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-indigo-400/20 shadow-sm active:translate-y-0.5 transition-all">
                        <Plus className="w-4 h-4" /> Provision License Key
                      </button>
                    </form>
                  </div>

                  {/* License List */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-2"><Layers className="w-4 h-4 text-amber-500" /> Active Registry</h3>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{searchFilteredLicenses.length} keys</span>
                    </div>
                    {searchFilteredLicenses.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 dark:text-slate-550 text-sm">No licenses found matching search query.</div>
                    ) : (
                      <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                        {searchFilteredLicenses.map((lic, i) => (
                          <motion.div key={lic.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                            className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-500/15 hover:shadow-xs transition-all">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${lic.type === 'corporate' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20'}`}>
                                {lic.type === 'corporate' ? <Building2 className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-slate-800 dark:text-white">{lic.id}</span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                                    lic.type === 'corporate' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900/50' : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-450 dark:border-indigo-900/50'
                                  }`}>{lic.type}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5">
                                  <span className="font-bold">{lic.customerName}</span>
                                  <span>•</span>
                                  <span className="font-mono">{lic.email}</span>
                                </div>
                                
                                {/* Credentials summary in Card */}
                                <div className="mt-2.5 flex flex-wrap gap-2 text-[9px] font-mono">
                                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded-lg flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <span>Inst: <strong className="text-slate-700 dark:text-slate-350">{lic.instructorId || '—'}</strong> / <strong className="text-slate-750 dark:text-slate-300">{revealedPasswords[lic.id + '-inst'] ? (lic.instructorPassword || '—') : '••••••'}</strong></span>
                                    <button type="button" onClick={() => togglePasswordReveal(lic.id + '-inst')} className="text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 p-0.5 cursor-pointer">
                                      {revealedPasswords[lic.id + '-inst'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                    <button type="button" onClick={() => handleCopyToClipboard(`${lic.instructorId || '—'} / ${lic.instructorPassword || '—'}`, lic.id + '-inst')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer" title="Copy Credentials">
                                      {copiedStates[lic.id + '-inst'] ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3" />}
                                    </button>
                                  </div>
                                  {lic.studentAccounts && lic.studentAccounts.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => { setViewingLicCreds(lic); setShowViewCredsModal(true); }}
                                      className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-850 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold transition-all cursor-pointer text-[9px] font-sans"
                                    >
                                      <span>🔑 View Student IDs ({lic.studentAccounts.length})</span>
                                    </button>
                                  ) : (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded-lg flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                      <span>Stud: <strong className="text-slate-700 dark:text-slate-350">{lic.studentId || '—'}</strong> / <strong className="text-slate-750 dark:text-slate-300">{revealedPasswords[lic.id + '-stud'] ? (lic.studentPassword || '—') : '••••••'}</strong></span>
                                      <button type="button" onClick={() => togglePasswordReveal(lic.id + '-stud')} className="text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 p-0.5 cursor-pointer">
                                        {revealedPasswords[lic.id + '-stud'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </button>
                                      <button type="button" onClick={() => handleCopyToClipboard(`${lic.studentId || '—'} / ${lic.studentPassword || '—'}`, lic.id + '-stud')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer" title="Copy Credentials">
                                        {copiedStates[lic.id + '-stud'] ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{lic.maxSeats} seats</span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(lic.expiresAt).toLocaleDateString()}</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleToggleLicenseStatus(lic.id, lic.status)}
                                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase cursor-pointer border ${
                                    lic.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/15' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/15'
                                  }`}>{lic.status}</button>
                                <button onClick={() => handleDeleteLicense(lic.id)}
                                  className="text-red-400/50 hover:text-red-500 cursor-pointer p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════ BROADCAST ═══════════════ */}
              {activeTab === 'broadcast' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                        <Radio className="w-4 h-4 text-emerald-500" />
                      </motion.div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">Broadcast System Announcement</h3>
                      {broadcastActive && <span className="text-[8px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-250 dark:border-emerald-500/15 animate-pulse ml-2">ON AIR</span>}
                    </div>
                    <form onSubmit={handleUpdateBroadcast} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Alert Priority</label>
                          <select value={broadcastType} onChange={e => setBroadcastType(e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-800 dark:text-white font-mono focus:border-indigo-500 outline-none">
                            <option value="info">🔵 Info / Bulletin</option>
                            <option value="success">🟢 System Success</option>
                            <option value="warning">🟡 Operational Warning</option>
                            <option value="alert">🔴 Critical Alert</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Live Status</label>
                          <label className="flex items-center gap-2.5 h-[42px] cursor-pointer">
                            <input type="checkbox" checked={broadcastActive} onChange={e => setBroadcastActive(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded border-slate-200" />
                            <span className={`text-xs font-bold ${broadcastActive ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`}>{broadcastActive ? '● Transmitting Active Banner' : '○ Sleeping Banner'}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Banner Announcement Text</label>
                        <input type="text" required maxLength={200} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Type system maintenance notice, version release notes or alerts..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-sm rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white transition-all focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      
                      {/* Preview Board Announcement */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                        <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Live Preview in Lobbies</span>
                        {broadcastActive ? (
                          <div className={`p-3 rounded-lg text-xs font-bold border flex items-center gap-2 ${
                            broadcastType === 'alert' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' :
                            broadcastType === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-455' :
                            broadcastType === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                            'bg-indigo-50 border-indigo-150 text-indigo-750 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                          }`}>
                            <span className="animate-ping w-2 h-2 rounded-full shrink-0 bg-current" />
                            <span>{broadcastMessage || "No banner message written..."}</span>
                          </div>
                        ) : (
                          <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400 font-mono">
                            Announcement banner deactivated (Hidden in games)
                          </div>
                        )}
                      </div>

                      {broadcastStatus && <div className="text-[11px] text-indigo-600 dark:text-emerald-400 font-bold text-center font-mono">{broadcastStatus}</div>}
                      <div className="flex gap-3 pt-2">
                        {broadcastActive && (
                          <button type="button" onClick={handleDeactivateBroadcast} disabled={broadcastLoading}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider rounded-xl cursor-pointer transition-colors">
                            🛑 Deactivate Alert
                          </button>
                        )}
                        <button type="submit" disabled={broadcastLoading}
                          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl cursor-pointer border border-indigo-400/20 shadow-sm active:translate-y-0.5 transition-all flex items-center justify-center gap-2">
                          <Radio className="w-4 h-4" /> {broadcastLoading ? 'Updating Hub...' : 'Transmit Broadcast'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ═══════════════ LOGS ═══════════════ */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(['all', 'warning', 'error', 'fatal'] as const).map(sev => (
                        <button key={sev} onClick={() => setSelectedLogsSeverity(sev)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase cursor-pointer border transition-all ${
                            selectedLogsSeverity === sev
                              ? sev === 'all' ? 'bg-slate-800 dark:bg-white/10 text-white border-transparent' :
                                sev === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                sev === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20'
                              : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                          }`}>{sev}</button>
                      ))}
                    </div>
                    <button onClick={handleClearLogs} disabled={systemLogs.length === 0}
                      className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/10 rounded-xl text-[10px] font-bold text-red-500 dark:text-red-400 uppercase cursor-pointer hover:bg-red-100 dark:hover:bg-red-500/15 flex items-center gap-1.5 disabled:opacity-30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Clear All Buffer
                    </button>
                  </div>
                  
                  {filteredLogs.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
                      <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">Diagnostic Clean</p>
                      <p className="text-[10px] text-slate-400 mt-1">No system errors detected in index.</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="max-h-[550px] overflow-y-auto">
                        <table className="w-full text-left font-mono text-[10px] border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 uppercase text-[8px] font-black sticky top-0">
                            <tr>
                              <th className="p-3.5">Time Logged</th>
                              <th className="p-3.5">Severity</th>
                              <th className="p-3.5">Component Module</th>
                              <th className="p-3.5">Admin Mail</th>
                              <th className="p-3.5">Exception Message</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {filteredLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-350 transition-colors">
                                <td className="p-3.5 text-slate-400 dark:text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                    log.severity === 'fatal' ? 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-550/20' :
                                    log.severity === 'error' ? 'bg-red-50 border-red-150 text-red-650 dark:bg-red-500/10 dark:text-red-400 dark:border-red-550/20' : 
                                    'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-550/20'
                                  }`}>{log.severity}</span>
                                </td>
                                <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">{log.component}</td>
                                <td className="p-3.5 text-slate-500 dark:text-slate-450 font-sans">{log.userEmail || 'system'}</td>
                                <td className="p-3.5 text-slate-800 dark:text-slate-300 font-sans">{log.errorMessage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════ SETTINGS ═══════════════ */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Profile */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white pb-3 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2"><UserCog className="w-4 h-4 text-indigo-500" /> Supervisor Registry</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20 border border-indigo-400/20">{currentSupervisor?.avatar}</div>
                      <div>
                        <h4 className="text-lg font-black text-slate-850 dark:text-white">{currentSupervisor?.name}</h4>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono uppercase font-bold">{currentSupervisor?.role}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">UUID: {currentSupervisor?.id} • Username: {currentSupervisor?.username}</p>
                      </div>
                    </div>
                  </div>

                  {/* All Supervisors */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white pb-3 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-violet-500" /> Administrative Access Registry</h3>
                    <div className="space-y-2">
                      {SUPERVISORS.map(s => (
                        <div key={s.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          s.id === currentSupervisor?.id 
                            ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 shadow-xs' 
                            : 'bg-transparent border-slate-150 dark:border-slate-800'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl shrink-0">{s.avatar}</span>
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-white">{s.name}</span>
                              <span className="text-[9px] text-slate-450 dark:text-slate-500 block">{s.role}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                            <span>user: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{s.username}</span></span>
                            <span>pass: <span className="text-slate-400 dark:text-slate-650">••••••</span></span>
                            {s.id === currentSupervisor?.id && <span className="bg-indigo-55 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[7px] font-bold border border-indigo-100 dark:border-indigo-500/20">CURRENT</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white pb-3 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2"><Sliders className="w-4 h-4 text-amber-500" /> Preferences</h3>
                    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/40">
                      <span className="text-xs text-slate-650 dark:text-slate-350 font-medium">Theme Setting</span>
                      <button onClick={toggleTheme} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-colors">
                        {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-xs text-slate-650 dark:text-slate-350 font-medium">Platform Session</span>
                      <button onClick={handleExit} className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 border border-red-100 dark:border-red-500/10 rounded-xl text-xs font-bold text-red-650 dark:text-red-400 cursor-pointer transition-colors">
                        Exit Administrative Console
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ═══ EDIT SESSION MODAL OVERLAY ═══ */}
      <AnimatePresence>
        {editingSession && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 font-sans select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-850 dark:text-white"
            >
              <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
              <div className="p-6 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-white">Modify Session Settings ({editingSession.code})</h3>
                </div>
                <button
                  onClick={() => setEditingSession(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSessionSettings} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Maximum Seat Capacity</label>
                    <input 
                      type="number" 
                      required 
                      value={editMaxSeats} 
                      onChange={e => setEditMaxSeats(Number(e.target.value))} 
                      min={1} 
                      max={1000}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Total Simulation Rounds</label>
                    <input 
                      type="number" 
                      required 
                      value={editTotalRounds} 
                      onChange={e => setEditTotalRounds(Number(e.target.value))} 
                      min={1} 
                      max={50}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Instructor Login ID</label>
                    <input 
                      type="text" 
                      required 
                      value={editInstructorId} 
                      onChange={e => setEditInstructorId(e.target.value)} 
                      placeholder="instructor123"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Instructor Login Password</label>
                    <input 
                      type="text" 
                      required 
                      value={editInstructorPassword} 
                      onChange={e => setEditInstructorPassword(e.target.value)} 
                      placeholder="password123"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white transition-all font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Student Login ID</label>
                    <input 
                      type="text" 
                      required 
                      value={editStudentId} 
                      onChange={e => setEditStudentId(e.target.value)} 
                      placeholder="student123"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Student Login Password</label>
                    <input 
                      type="text" 
                      required 
                      value={editStudentPassword} 
                      onChange={e => setEditStudentPassword(e.target.value)} 
                      placeholder="password123"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white transition-all font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Session Schedule Start</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={editStartDate} 
                      onChange={e => setEditStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 ml-1">Session Schedule End</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={editEndDate} 
                      onChange={e => setEditEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white transition-all font-mono" 
                    />
                  </div>
                </div>

                {editError && <div className="text-xs text-red-500 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> {editError}</div>}
                {editSuccess && <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-150 p-3 rounded-xl flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> {editSuccess}</div>}

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setEditingSession(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={editLoading}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer disabled:opacity-50 border border-indigo-400/20"
                  >
                    {editLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONFIGURE STUDENT CREDENTIALS MODAL OVERLAY ═══ */}
      <AnimatePresence>
        {showStudentCredsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 font-sans select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-850 dark:text-white"
            >
              <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
              <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-white">Configure Student IDs & Passwords</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Manage individual team login credentials for license <span className="font-mono font-bold text-slate-600 dark:text-slate-350">{newLicCode.toUpperCase() || 'TEMP'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudentCredsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Form to Add Account */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 space-y-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Add New Student Credentials
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase text-slate-450 dark:text-slate-555 ml-1">Student Login ID</label>
                      <input 
                        type="text" 
                        placeholder="ID (e.g., TEAM-1)" 
                        value={newStudentIdInput} 
                        onChange={e => setNewStudentIdInput(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-2.5 font-mono text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase text-slate-450 dark:text-slate-555 ml-1">Student Login Password</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Password" 
                          value={newStudentPasswordInput} 
                          onChange={e => setNewStudentPasswordInput(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-2.5 font-mono text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white" 
                        />
                        <button
                          type="button"
                          onClick={() => setNewStudentPasswordInput(Math.random().toString(36).substring(2, 8).toUpperCase())}
                          className="px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          title="Generate Random Password"
                        >
                          🔄
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-mono text-slate-450 dark:text-slate-500">
                      Total Allocated: <strong className="text-slate-750 dark:text-slate-300">{newLicStudentAccounts.length}</strong> / {newLicSeats === 999 ? '∞' : newLicSeats} Seats
                    </span>
                    <button
                      type="button"
                      onClick={handleAddStudentAccount}
                      disabled={newLicSeats !== 999 && newLicStudentAccounts.length >= newLicSeats}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 dark:disabled:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Student
                    </button>
                  </div>
                </div>

                {/* List of Configured Accounts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Configured Login Credentials
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search credentials..." 
                      value={credsSearchQuery}
                      onChange={e => setCredsSearchQuery(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2.5 py-1 text-[11px] rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white"
                    />
                  </div>

                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                    {newLicStudentAccounts.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-450 dark:text-slate-500">
                        No student credentials added yet. Default logic credentials will be used if empty.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="p-2.5 font-bold">#</th>
                            <th className="p-2.5 font-bold">Student ID</th>
                            <th className="p-2.5 font-bold">Password</th>
                            <th className="p-2.5 font-bold text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                          {newLicStudentAccounts
                            .filter(acc => 
                              !credsSearchQuery.trim() || 
                              acc.studentId.toLowerCase().includes(credsSearchQuery.toLowerCase())
                            )
                            .map((acc, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/3">
                                <td className="p-2.5 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                                <td className="p-2.5 font-bold">{acc.studentId}</td>
                                <td className="p-2.5">{acc.studentPassword}</td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStudentAccount(idx)}
                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md cursor-pointer transition-colors"
                                    title="Remove Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStudentCredsModal(false)}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-750 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer transition-all shadow-xs"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ VIEW STUDENT CREDENTIALS MODAL OVERLAY ═══ */}
      <AnimatePresence>
        {showViewCredsModal && viewingLicCreds && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 font-sans select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-850 dark:text-white"
            >
              <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
              <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-white">Active Student Credentials</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      View login details for license <span className="font-mono font-bold text-slate-600 dark:text-slate-350">{viewingLicCreds.id}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowViewCredsModal(false); setViewingLicCreds(null); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Total Configured: {viewingLicCreds.studentAccounts?.length || 0} Accounts
                  </span>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Search accounts..." 
                      value={credsViewSearchQuery}
                      onChange={e => setCredsViewSearchQuery(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 px-2.5 py-1 text-[11px] rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = (viewingLicCreds.studentAccounts || [])
                          .map(acc => `${acc.studentId},${acc.studentPassword}`)
                          .join('\n');
                        handleCopyToClipboard(`Student ID,Password\n${formatted}`, 'all-view');
                      }}
                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-850 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      title="Copy all credentials as CSV"
                    >
                      {copiedStates['all-view'] ? '✓ Copied CSV' : '📋 Copy CSV'}
                    </button>
                  </div>
                </div>

                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                  {(!viewingLicCreds.studentAccounts || viewingLicCreds.studentAccounts.length === 0) ? (
                    <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500">
                      No custom credentials configured for this license.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="p-2.5 font-bold">#</th>
                          <th className="p-2.5 font-bold">Student ID</th>
                          <th className="p-2.5 font-bold">Password</th>
                          <th className="p-2.5 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                        {viewingLicCreds.studentAccounts
                          .filter(acc => 
                            !credsViewSearchQuery.trim() || 
                            acc.studentId.toLowerCase().includes(credsViewSearchQuery.toLowerCase())
                          )
                          .map((acc, idx) => {
                            const mapKey = `${viewingLicCreds.id}-${idx}`;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/3">
                                <td className="p-2.5 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                                <td className="p-2.5 font-bold">{acc.studentId}</td>
                                <td className="p-2.5 font-bold">
                                  {revealedPasswords[mapKey] ? acc.studentPassword : '••••••'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex justify-center items-center gap-1.5">
                                    <button 
                                      type="button" 
                                      onClick={() => togglePasswordReveal(mapKey)} 
                                      className="p-1 text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                      title={revealedPasswords[mapKey] ? "Hide Password" : "Show Password"}
                                    >
                                      {revealedPasswords[mapKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => handleCopyToClipboard(`${acc.studentId} / ${acc.studentPassword}`, mapKey)} 
                                      className="p-1 text-slate-450 hover:text-slate-650 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                      title="Copy Credentials"
                                    >
                                      {copiedStates[mapKey] ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowViewCredsModal(false); setViewingLicCreds(null); }}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-extrabold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
