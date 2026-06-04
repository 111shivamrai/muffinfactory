import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'motion/react';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function JoinSession() {
  const { user, joinSession, resumeSession, logout, isAdmin } = useGame();
  const [status, setStatus] = useState('Scanning for assigned classrooms...');
  const [error, setError] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [foundSession, setFoundSession] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const findAssignedSession = async () => {
      try {
        // Handle mock credential login first!
        if ((user as any).isMock) {
          const mockUser = user as any;
          const sessionCode = mockUser.mockSessionCode;

          // If the mock user is the sentinel from loginWithMockCredentials,
          // the login is still in progress — just wait, don't query Firestore
          if (!sessionCode || mockUser.uid === 'pending-login') {
            return;
          }
          
          setStatus('Checking classroom code...');
          
          // Import/Check session from Firestore
          const sessionSnap = await getDocs(query(collection(db, 'sessions'), where('code', '==', sessionCode)));
          
          let resolvedSessionDoc = null;
          if (!sessionSnap.empty) {
            resolvedSessionDoc = sessionSnap.docs[0];
          } else {
            // Try by ID directly as a fallback
            const directSnap = await getDocs(query(collection(db, 'sessions')));
            resolvedSessionDoc = directSnap.docs.find(d => d.id === sessionCode || d.data().code === sessionCode);
          }

          if (!resolvedSessionDoc) {
            if (mockUser.mockRole === 'student') {
              setError(`The instructor hasn't opened classroom "${sessionCode}" yet. Please wait for them to start the session, then refresh.`);
            } else {
              setError(`Assigned classroom "${sessionCode}" could not be found.`);
            }
            return;
          }

          const sessionData = resolvedSessionDoc.data();
          setFoundSession({ id: resolvedSessionDoc.id, ...sessionData });

          if (mockUser.mockRole === 'instructor') {
            setStatus('Instructor ID validated! Opening dashboard...');
            await resumeSession(resolvedSessionDoc.id);
          } else {
            // Student flow
            // Check if they already joined (team exists with baseUid)
            const baseUid = user.uid.split(/[-_]/)[0];
            const teamsSnap = await getDocs(collection(db, `sessions/${resolvedSessionDoc.id}/teams`));
            const teamExists = teamsSnap.docs.some(doc => doc.id === baseUid);
            
            if (teamExists) {
              setStatus('Reconnecting to your student dashboard...');
              await resumeSession(resolvedSessionDoc.id);
            } else {
              setStatus('Classroom found! Enter a team name to begin.');
              setNeedsName(true);
              setTeamName(baseUid.toUpperCase()); // default to student ID
            }
          }
          return;
        }

        if (!user.email) return;
        const userEmail = user.email.toLowerCase();
        
        // 1. Check if they are an assigned instructor
        const instQ = query(collection(db, 'sessions'), where('allowedInstructors', 'array-contains', userEmail));
        const instSnap = await getDocs(instQ);
        
        if (!instSnap.empty) {
          const session = instSnap.docs[0];
          setStatus('Instructor assignment found! Resuming session...');
          await resumeSession(session.id);
          return;
        }

        // 2. Check if they are an assigned student
        const stuQ = query(collection(db, 'sessions'), where('allowedStudents', 'array-contains', userEmail));
        const stuSnap = await getDocs(stuQ);
        
        if (!stuSnap.empty) {
          const session = stuSnap.docs[0];
          setFoundSession(session);
          
          // Check if they already joined (team exists)
          const teamsSnap = await getDocs(query(collection(db, `sessions/${session.id}/teams`), where('id', '==', user.uid)));
          if (!teamsSnap.empty) {
            setStatus('Reconnecting to your classroom...');
            await resumeSession(session.id);
          } else {
            // Need a team name for first join
            setStatus('Classroom found! Please enter a team name to join.');
            setNeedsName(true);
            setTeamName(userEmail.split('@')[0]); // Default to email prefix
          }
          return;
        }

        // 3. Admin fallback (admins don't need a session to access the dashboard, but if they land here, give a hint)
        if (isAdmin) {
          setStatus('No active session. Please use the Admin Panel to provision one.');
          setError('admin_no_session');
          return;
        }

        setError('No active classroom assigned to your email address.');
      } catch (err: any) {
        console.error(err);
        setError('Failed to scan for assignments. Please check connection.');
      }
    };

    findAssignedSession();
  }, [user, isAdmin]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !foundSession) return;
    setStatus('Joining classroom...');
    setNeedsName(false);
    try {
      await joinSession(foundSession.id, teamName.trim());
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#111112] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-[#222222] text-zinc-300 hover:bg-zinc-800 font-mono text-[9px] font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-all flex items-center gap-2"
        >
          <LogOut className="w-3 h-3" /> Sign Out
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-8 shadow-2xl text-center">
          
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <span className="text-3xl">🧁</span>
          </div>

          <h1 className="text-xl font-black uppercase tracking-wider text-white mb-2">Central Authorization</h1>
          
          {error ? (
            <div className="mt-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-center gap-3 text-red-400">
                <ShieldAlert className="w-5 h-5" />
                <span className="text-xs font-bold">{error === 'admin_no_session' ? 'You are an admin with no active session.' : error}</span>
              </div>
              {error === 'admin_no_session' && (
                <p className="text-[10px] text-zinc-400">Open the Admin Center to provision a new classroom.</p>
              )}
            </div>
          ) : needsName ? (
            <form onSubmit={handleJoin} className="mt-6 space-y-4">
              <div className="text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full bg-[#222] border border-zinc-700 mt-1 p-3 rounded-xl text-sm font-mono focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Enter Classroom
              </button>
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">{status}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
