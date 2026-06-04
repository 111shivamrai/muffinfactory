/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameProvider, useGame } from './context/GameContext';
import { InstructorDashboard } from './components/InstructorDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { JoinSession } from './components/JoinSession';
import { MarketingLandingPage } from './components/MarketingLandingPage';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Loader2 } from 'lucide-react';

import { useState, useEffect } from 'react';
import { SaasAdminDashboard } from './components/SaasAdminDashboard';

function AppContent() {
  const { user, loading, session, currentTeam, login, isDirectPlay, setIsDirectPlay } = useGame();
  const [isAdminPanel, setIsAdminPanel] = useState(window.location.hash === '#saas-admin');
  const [isSupervisorPanel, setIsSupervisorPanel] = useState(
    window.location.hash === '#supervisor' || 
    window.location.hash === '#instructor' || 
    window.location.hash === '#host'
  );

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      setIsAdminPanel(hash === '#saas-admin');
      
      const isSup = hash === '#supervisor' || hash === '#instructor' || hash === '#host';
      setIsSupervisorPanel(isSup);

      // Fast one-page bypass: auto-enable Sandbox mode for these routes
      if (hash === '#student' || isSup) {
        setIsDirectPlay(true);
      } else {
        setIsDirectPlay(false);
      }
    };

    // Run on initial load
    handleHash();

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [setIsDirectPlay]);

  if (isAdminPanel) {
    return <SaasAdminDashboard />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0c]">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  // If Sandbox is active, instantly show the simulation workspace
  if (isDirectPlay) {
    if (isSupervisorPanel) {
      return <InstructorDashboard />;
    }
    return <StudentDashboard />;
  }

  // If user is not authenticated yet, render our high-fidelity, conversion-ready marketing landing page 
  if (!user) {
    return <MarketingLandingPage login={login} setIsDirectPlay={setIsDirectPlay} />;
  }

  if (!session) {
    // If they are an instructor (from license login), skip JoinSession and go directly to setup
    if ((user as any)?.isMock && (user as any)?.mockRole === 'instructor') {
      return <InstructorDashboard />;
    }
    return <JoinSession isHostMode={isSupervisorPanel} />;
  }

  // If instructor
  if (session.instructorId === user.uid || (user as any)?.isMock && (user as any)?.mockRole === 'instructor') {
    return <InstructorDashboard />;
  }

  // If student
  return <StudentDashboard />;
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
