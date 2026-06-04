import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, CheckCircle, Flame, Sparkles, Volume2, VolumeX, HelpCircle, BookOpen, Sparkle, Zap, Trophy, Star } from 'lucide-react';

/* ═══════════════════════════════════════════════════
   OVERTIME BAKING DASH — PREMIUM ARCADE EDITION
   ═══════════════════════════════════════════════════ */

interface MuffinItem {
  id: number;
  x: number;
  status: 'empty' | 'mixed' | 'bottled' | 'packaged';
  isHit: boolean;
  scoreGranted: boolean;
  hitTime: number; // timestamp of last hit for trail animation
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  type: 'spark' | 'star' | 'ring' | 'note';
}

interface FloatingScore {
  id: number;
  x: number;
  text: string;
  color: string;
}

export function SodaBottlingGame() {
  const { rewardOvertimeLabor, session, theme } = useGame();
  const isDark = theme === 'dark';
  
  // Core game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [muffins, setMuffins] = useState<MuffinItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Visual effects state
  const [lastJudgment, setLastJudgment] = useState<{ text: string; color: string; id: string } | null>(null);
  const [feverActive, setFeverActive] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [totalBaked, setTotalBaked] = useState(0);
  
  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  
  // Daily cap
  const [dailyBonusEarned, setDailyBonusEarned] = useState(0);
  const DAILY_MAX_CASH = 25000;
  const DAILY_MAX_RM = 2500;
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const musicTickRef = useRef<NodeJS.Timeout | null>(null);
  const muffinIdCounter = useRef(0);
  const soundCooldown = useRef(false);
  const gameTimeRef = useRef(0);

  // Conveyor targets
  const MIX_TARGET = 25;
  const BAKE_TARGET = 50;
  const PACK_TARGET = 75;
  const TARGET_WINDOW = 7;

  // ══════════════════════════════════════════
  // AUDIO ENGINE
  // ══════════════════════════════════════════
  const playFreq = useCallback((freq: number, type: OscillatorType = 'sine', duration = 0.12, volume = 0.04) => {
    if (!soundEnabled || soundCooldown.current) return;
    try {
      soundCooldown.current = true;
      setTimeout(() => { soundCooldown.current = false; }, 25);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  }, [soundEnabled]);

  const playPerfectChord = useCallback(() => {
    if (!soundEnabled) return;
    playFreq(523.25, 'sine', 0.15, 0.06);
    setTimeout(() => playFreq(659.25, 'sine', 0.15, 0.06), 30);
    setTimeout(() => playFreq(783.99, 'sine', 0.15, 0.06), 60);
    setTimeout(() => playFreq(1046.50, 'triangle', 0.3, 0.07), 90);
    setTimeout(() => playFreq(1318.51, 'sine', 0.2, 0.04), 120);
  }, [soundEnabled, playFreq]);

  const playGreatChord = useCallback(() => {
    if (!soundEnabled) return;
    playFreq(523.25, 'sine', 0.12, 0.05);
    setTimeout(() => playFreq(659.25, 'sine', 0.12, 0.05), 35);
    setTimeout(() => playFreq(783.99, 'sine', 0.18, 0.06), 70);
  }, [soundEnabled, playFreq]);

  const playFeverActivate = useCallback(() => {
    if (!soundEnabled) return;
    playFreq(440, 'triangle', 0.08, 0.03);
    setTimeout(() => playFreq(554, 'triangle', 0.08, 0.03), 50);
    setTimeout(() => playFreq(659, 'triangle', 0.08, 0.03), 100);
    setTimeout(() => playFreq(880, 'triangle', 0.15, 0.04), 150);
    setTimeout(() => playFreq(1108, 'sine', 0.2, 0.05), 200);
  }, [soundEnabled, playFreq]);

  // ══════════════════════════════════════════
  // VISUAL EFFECTS
  // ══════════════════════════════════════════
  const triggerJudgment = useCallback((text: string, color: string) => {
    const id = Math.random().toString();
    setLastJudgment({ text, color, id });
    setTimeout(() => setLastJudgment(prev => (prev?.id === id ? null : prev)), 900);
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 150);
  }, []);

  const addFloatingScore = useCallback((x: number, text: string, color: string) => {
    const id = Math.random();
    setFloatingScores(prev => [...prev.slice(-8), { id, x, text, color }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== id)), 1200);
  }, []);

  const spawnParticles = useCallback((xPct: number, count = 16, isPerfect = false) => {
    const list: Particle[] = [];
    const sparkColors = isPerfect 
      ? ['#fbbf24', '#f59e0b', '#ffffff', '#fb7185', '#a78bfa', '#34d399', '#fde68a', '#f472b6'] 
      : ['#e2943b', '#cbd5e1', '#d97706', '#94a3b8', '#fbbf24'];
    const types: Particle['type'][] = ['spark', 'star', 'ring', 'note'];

    for (let i = 0; i < count; i++) {
      list.push({
        id: Math.random(),
        x: xPct + (Math.random() * 10 - 5),
        y: 35 + (Math.random() * 30 - 15),
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        size: isPerfect ? Math.random() * 8 + 4 : Math.random() * 5 + 2,
        type: isPerfect ? types[Math.floor(Math.random() * types.length)] : 'spark'
      });
    }
    setParticles(p => [...p.slice(-80), ...list]);
    setTimeout(() => setParticles(p => p.filter(item => !list.find(l => l.id === item.id))), 1200);
  }, []);

  // ══════════════════════════════════════════
  // KEYBOARD CONTROLS
  // ══════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const key = e.key.toUpperCase();
      if (key === 'M') triggerAction('mixing');
      else if (key === 'B') triggerAction('bottling');
      else if (key === 'P') triggerAction('packaging');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, muffins, streak, score, dailyBonusEarned, feverActive]);

  // Rhythm tick
  useEffect(() => {
    if (isPlaying && soundEnabled) {
      musicTickRef.current = setInterval(() => {
        playFreq(110.00, 'triangle', 0.06, 0.012);
      }, 900);
    } else {
      if (musicTickRef.current) clearInterval(musicTickRef.current);
    }
    return () => { if (musicTickRef.current) clearInterval(musicTickRef.current); };
  }, [isPlaying, soundEnabled]);

  // ══════════════════════════════════════════
  // MAIN GAME LOOP
  // ══════════════════════════════════════════
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        gameTimeRef.current += 1;
        
        setMuffins(prev => {
          let updated = prev.map(m => ({
            ...m,
            x: m.x + (feverActive ? 1.6 : 1.3),
            isHit: Date.now() - m.hitTime < 300 ? m.isHit : false
          }));

          const exited = updated.filter(m => m.x >= 95);
          const completedCount = exited.filter(m => m.status === 'packaged').length;

          if (completedCount > 0) {
            const addedCash = completedCount * 1200;
            const addedRM = completedCount * 120;
            setTotalBaked(t => t + completedCount);
            
            if (dailyBonusEarned < DAILY_MAX_CASH) {
              setDailyBonusEarned(prevCap => Math.min(DAILY_MAX_CASH, prevCap + addedCash));
              rewardOvertimeLabor(addedCash, addedRM);
              playFreq(1320, 'sine', 0.25, 0.05);
              triggerJudgment(`+₹${addedCash.toLocaleString()} 💰`, 'text-emerald-400');
              triggerFlash('emerald');
              addFloatingScore(88, `+₹${addedCash.toLocaleString()}`, '#34d399');
            }
          }

          return updated.filter(m => m.x < 95);
        });

        // Spawn new items
        if (Math.random() < (feverActive ? 0.06 : 0.045)) {
          setMuffins(prev => {
            if (prev.some(m => m.x < 12)) return prev;
            muffinIdCounter.current += 1;
            return [...prev, {
              id: muffinIdCounter.current,
              x: 0,
              status: 'empty',
              isHit: false,
              scoreGranted: false,
              hitTime: 0
            }];
          });
        }
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, dailyBonusEarned, feverActive]);

  // Fever Mode
  useEffect(() => {
    if (streak >= 8) {
      if (!feverActive) {
        setFeverActive(true);
        setComboMultiplier(2);
        playFeverActivate();
        triggerJudgment("🔥 FEVER MODE! 2X SCORE! 🔥", "text-amber-400");
        triggerFlash('amber');
      }
    } else {
      if (feverActive) {
        setFeverActive(false);
        setComboMultiplier(1);
      }
    }
  }, [streak]);

  // ══════════════════════════════════════════
  // GAME ACTIONS
  // ══════════════════════════════════════════
  const triggerAction = (station: 'mixing' | 'bottling' | 'packaging') => {
    let success = false;
    let targetX = station === 'mixing' ? MIX_TARGET : station === 'bottling' ? BAKE_TARGET : PACK_TARGET;
    let expectedPre: MuffinItem['status'] = station === 'mixing' ? 'empty' : station === 'bottling' ? 'mixed' : 'bottled';
    let targetPost: MuffinItem['status'] = station === 'mixing' ? 'mixed' : station === 'bottling' ? 'bottled' : 'packaged';
    let label = station === 'mixing' ? 'Mix' : station === 'bottling' ? 'Bake' : 'Pack';
    let distance = 999;

    setMuffins(prev => {
      let matched = false;
      return prev.map(muffin => {
        const inWindow = Math.abs(muffin.x - targetX) <= TARGET_WINDOW;
        if (inWindow && muffin.status === expectedPre && !matched) {
          matched = true;
          success = true;
          distance = Math.abs(muffin.x - targetX);
          spawnParticles(muffin.x, distance <= 2 ? 24 : 14, distance <= 2);
          return { ...muffin, status: targetPost, isHit: true, hitTime: Date.now() };
        }
        return muffin;
      });
    });

    if (success) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > highestStreak) setHighestStreak(nextStreak);
      
      let scoreAwarded = 0;
      if (distance <= 2) {
        scoreAwarded = 30 * comboMultiplier;
        triggerJudgment(`🎯 PERFECT ${label}!`, 'text-amber-400');
        playPerfectChord();
        setScreenShake(true);
        triggerFlash('gold');
        setTimeout(() => setScreenShake(false), 250);
        addFloatingScore(targetX, `+${scoreAwarded}`, '#fbbf24');
      } else if (distance <= 4.5) {
        scoreAwarded = 15 * comboMultiplier;
        triggerJudgment(`✨ GREAT ${label}!`, 'text-cyan-400');
        playGreatChord();
        addFloatingScore(targetX, `+${scoreAwarded}`, '#22d3ee');
      } else {
        scoreAwarded = 5 * comboMultiplier;
        triggerJudgment(`👍 GOOD ${label}`, 'text-slate-300');
        playFreq(600, 'sine', 0.08, 0.03);
        addFloatingScore(targetX, `+${scoreAwarded}`, '#94a3b8');
      }
      setScore(s => s + scoreAwarded);
    } else {
      setStreak(0);
      playFreq(180, 'sawtooth', 0.25, 0.05);
      triggerJudgment('❌ MISS!', 'text-red-500');
      triggerFlash('red');
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 200);
    }
  };

  const getStatusEmoji = (s: MuffinItem['status']) => {
    switch(s) {
      case 'empty': return '🫙';
      case 'mixed': return '🥣';
      case 'bottled': return '🧁';
      case 'packaged': return '📦';
    }
  };

  const getStatusGlow = (s: MuffinItem['status']) => {
    switch(s) {
      case 'empty': return '#94a3b8';
      case 'mixed': return '#ef4444';
      case 'bottled': return '#f59e0b';
      case 'packaged': return '#10b981';
    }
  };

  const resetGame = () => {
    setScore(0); setStreak(0); setMuffins([]); setParticles([]);
    setFeverActive(false); setIsPlaying(false); setTotalBaked(0);
    setComboMultiplier(1); setFloatingScores([]);
  };

  // ══════════════════════════════════════════
  // STATION ZONE CONFIG
  // ══════════════════════════════════════════
  const stations = [
    { key: 'mix', label: '1. MIX', hotkey: 'M', target: MIX_TARGET, color: '#ef4444', darkColor: '#991b1b', emoji: '🥣', action: () => isPlaying && triggerAction('mixing'), tutStep: 2 },
    { key: 'bake', label: '2. BAKE', hotkey: 'B', target: BAKE_TARGET, color: '#f59e0b', darkColor: '#92400e', emoji: '🔥', action: () => isPlaying && triggerAction('bottling'), tutStep: 3 },
    { key: 'pack', label: '3. PACK', hotkey: 'P', target: PACK_TARGET, color: '#10b981', darkColor: '#065f46', emoji: '📦', action: () => isPlaying && triggerAction('packaging'), tutStep: 4 },
  ];

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  return (
    <div className={`rounded-2xl text-white relative overflow-hidden transition-all duration-500 shadow-2xl ${
      feverActive ? 'shadow-amber-500/30' : ''
    }`}>

      {/* ═══ OUTER BORDER GLOW ═══ */}
      <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
        feverActive ? 'shadow-[inset_0_0_30px_rgba(245,158,11,0.15)]' : ''
      }`} />

      {/* ═══ ANIMATED BACKGROUND ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep space gradient */}
        <div className={`absolute inset-0 transition-all duration-1000 ${
          feverActive 
            ? 'bg-gradient-to-br from-amber-950/90 via-[#0c0c1a] to-orange-950/60' 
            : 'bg-gradient-to-br from-[#0a0e1a] via-[#0c1220] to-[#0a0e1a]'
        }`} />
        
        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] [background-size:32px_32px]" />
        
        {/* Floating orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`bg-orb-${i}`}
            animate={{
              x: [0, 30 * Math.sin(i * 1.2), 0],
              y: [0, -25 * Math.cos(i * 0.8), 0],
              opacity: feverActive ? [0.08, 0.2, 0.08] : [0.02, 0.06, 0.02]
            }}
            transition={{ repeat: Infinity, duration: 5 + i * 1.2, ease: "easeInOut", delay: i * 0.7 }}
            className="absolute rounded-full blur-3xl"
            style={{
              width: `${80 + i * 25}px`, height: `${80 + i * 25}px`,
              left: `${8 + i * 12}%`, top: `${15 + (i % 3) * 20}%`,
              backgroundColor: feverActive ? '#f59e0b' : i % 2 === 0 ? '#6366f1' : '#8b5cf6'
            }}
          />
        ))}

        {/* Scanning laser line */}
        {isPlaying && (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: feverActive ? 3 : 6, ease: "linear" }}
            className={`absolute top-0 h-full w-24 ${
              feverActive 
                ? 'bg-gradient-to-r from-transparent via-amber-500/[0.06] to-transparent' 
                : 'bg-gradient-to-r from-transparent via-indigo-500/[0.04] to-transparent'
            }`}
          />
        )}

        {/* Star field */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.8, 1.2, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 3, delay: Math.random() * 3 }}
            className="absolute w-[2px] h-[2px] bg-white rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          />
        ))}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className={`relative z-10 p-5 space-y-4 border rounded-2xl transition-all duration-500 ${
        feverActive 
          ? 'border-amber-500/60' 
          : 'border-indigo-500/20'
      } ${screenShake ? 'animate-shake' : ''}`}>

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={feverActive ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : { rotate: [0, 360] }}
              transition={feverActive ? { repeat: Infinity, duration: 0.5 } : { repeat: Infinity, duration: 4, ease: "linear" }}
              className={`p-2.5 rounded-xl border ${feverActive ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}
            >
              <Sparkle className="w-5 h-5" />
            </motion.div>
            <div className="text-left">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider leading-none flex items-center gap-2">
                <span className={feverActive ? 'text-amber-400' : 'text-indigo-300'}>Overtime Baking Dash</span>
                {feverActive && <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.4 }}><Flame className="w-4 h-4 text-orange-500" /></motion.span>}
              </h3>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mt-0.5">
                {isPlaying ? (feverActive ? '🔥 FEVER MODE ACTIVE — 2X MULTIPLIER' : '⚡ ASSEMBLY LINE RUNNING') : 'RHYTHM ARCADE • MINI-GAME'}
              </span>
            </div>
          </div>

          <div className="flex gap-1.5">
            <button onClick={() => { playFreq(523, 'sine', 0.1); setTutorialStep(1); setIsPlaying(false); }}
              className={`px-2.5 py-1.5 border text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                tutorialStep !== null ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
              }`}>
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-sans font-black uppercase text-[9px] tracking-wider hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-red-500" />}
            </button>
            <button onClick={resetGame} className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10">
              <RotateCcw className="w-4 h-4 text-orange-400" />
            </button>
          </div>
        </div>

        {/* ═══ STATS + PLAYFIELD GRID ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          
          {/* ─── STATS PANEL ─── */}
          <div className={`rounded-xl p-4 flex flex-col justify-between space-y-3 border transition-all duration-500 ${
            feverActive 
              ? 'bg-amber-950/30 border-amber-500/30' 
              : 'bg-white/[0.03] border-white/10'
          }`}>
            {/* Score */}
            <div className="space-y-1 text-left">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold block">Score</span>
              <motion.div 
                key={score} 
                initial={{ scale: 1.4, color: '#fbbf24' }} 
                animate={{ scale: 1, color: feverActive ? '#fbbf24' : '#818cf8' }}
                className="text-3xl font-black font-sans tracking-tight"
              >
                {score.toLocaleString()}
              </motion.div>
            </div>

            {/* Combo */}
            <div className="border-t border-white/10 pt-2 space-y-1 text-left">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold block">Combo</span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-black font-sans ${feverActive ? 'text-amber-400' : 'text-orange-400'}`}>{streak}</span>
                {streak > 0 && (
                  <div className="flex gap-[2px]">
                    {[...Array(Math.min(streak, 8))].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-1.5 rounded-full ${i < 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ height: `${8 + i * 2}px` }}
                      />
                    ))}
                  </div>
                )}
                {feverActive && <Flame className="w-4 h-4 text-orange-500 animate-pulse" />}
              </div>
              {comboMultiplier > 1 && <span className="text-[9px] text-amber-400 font-black">{comboMultiplier}X MULTIPLIER</span>}
            </div>

            {/* Rewards */}
            <div className={`border-t border-white/10 pt-2 p-2 rounded-lg border transition-all ${
              feverActive ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/15'
            }`}>
              <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-black block mb-1">🎁 Rewards</span>
              <div className="font-sans font-black text-emerald-400 text-sm">
                ₹{dailyBonusEarned.toLocaleString()}
                <span className="text-[8px] text-white/30 font-normal"> / ₹{DAILY_MAX_CASH.toLocaleString()}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                <motion.div 
                  animate={{ width: `${(dailyBonusEarned / DAILY_MAX_CASH) * 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full shadow-[0_0_8px_#10b981]"
                />
              </div>
            </div>

            {/* Baked count */}
            <div className="border-t border-white/10 pt-2 flex items-center gap-2 text-left">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[9px] text-white/50 uppercase font-black">{totalBaked} Baked</span>
              {highestStreak > 0 && <span className="text-[9px] text-white/30 font-mono">Best: {highestStreak}x</span>}
            </div>
          </div>

          {/* ─── CONVEYOR PLAYFIELD ─── */}
          <div className={`rounded-2xl relative min-h-[350px] flex flex-col justify-between overflow-hidden p-3 transition-all duration-500 border-2 ${
            feverActive 
              ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-[#080810]' 
              : 'border-indigo-500/20 bg-[#080810]'
          }`}>
            
            {/* Playfield inner glow */}
            {feverActive && (
              <motion.div 
                animate={{ opacity: [0.05, 0.15, 0.05] }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-amber-500/5 pointer-events-none" 
              />
            )}

            {/* ─── CONVEYOR BELT ─── */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-6 h-12 pointer-events-none">
              {/* Belt base */}
              <div className={`absolute inset-0 border-y transition-colors ${feverActive ? 'border-amber-500/30 bg-amber-950/20' : 'border-indigo-500/15 bg-indigo-950/20'}`} />
              
              {/* Moving belt ridges */}
              {isPlaying && [...Array(30)].map((_, i) => (
                <motion.div
                  key={`belt-${i}`}
                  animate={{ x: [-60, 1200] }}
                  transition={{ repeat: Infinity, duration: feverActive ? 2.5 : 5, ease: "linear", delay: i * (feverActive ? 0.083 : 0.166) }}
                  className={`absolute top-0 h-full w-[1px] ${feverActive ? 'bg-amber-500/20' : 'bg-indigo-500/10'}`}
                />
              ))}
              
              {/* Metal rails */}
              <div className={`absolute -top-[1px] inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${feverActive ? 'via-amber-400/30' : 'via-indigo-400/20'} to-transparent`} />
              <div className={`absolute -bottom-[1px] inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${feverActive ? 'via-amber-400/30' : 'via-indigo-400/20'} to-transparent`} />
            </div>

            {/* ─── DISPENSER ─── */}
            <div className="absolute left-[1%] top-1/2 -translate-y-[72px] flex flex-col items-center z-20 pointer-events-none select-none">
              <motion.div 
                animate={isPlaying ? { y: [0, -3, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex flex-col items-center"
              >
                <div className="bg-gradient-to-b from-zinc-700 to-zinc-800 border border-zinc-600/50 w-8 h-12 rounded-lg flex flex-col items-center justify-between p-1 shadow-lg">
                  <span className="text-[5px] font-mono font-black text-indigo-400 uppercase">IN</span>
                  <motion.span animate={isPlaying ? { rotate: [0, 15, -15, 0] } : {}} transition={{ repeat: Infinity, duration: 1.2 }} className="text-sm">🌾</motion.span>
                  <div className="w-4 h-[2px] bg-zinc-600 rounded-full" />
                </div>
                <motion.div animate={isPlaying ? { y: [0, 6, 0], scale: [0.9, 1.1, 0.9] } : {}} transition={{ repeat: Infinity, duration: 2 }} className="text-lg mt-0.5">🫙</motion.div>
              </motion.div>
            </div>

            {/* ─── DOCK / TRUCK ─── */}
            <div className="absolute right-[1%] top-1/2 -translate-y-[55px] flex flex-col items-center z-20 pointer-events-none select-none">
              <div className="text-[6px] font-mono font-black text-emerald-400 uppercase bg-emerald-950/80 px-1.5 rounded border border-emerald-500/20 mb-1 shadow-[0_0_6px_#10b98140]">
                DOCK
              </div>
              <motion.div
                animate={muffins.some(m => m.x > 85 && m.status === 'packaged') 
                  ? { y: [0, -3, 0], scale: [1, 1.05, 1] } 
                  : { y: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: muffins.some(m => m.x > 85) ? 0.3 : 3 }}
                className="relative"
              >
                <span className="text-3xl filter drop-shadow-[0_0_10px_#10b981] transform scale-x-[-1] inline-block">🚛</span>
                {/* Exhaust when receiving */}
                {muffins.some(m => m.x > 85 && m.status === 'packaged') && (
                  <div className="absolute -left-3 top-3">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={`exhaust-${i}`}
                        animate={{ x: [-2, -15], opacity: [0.4, 0], scale: [0.5, 1.5] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                        className="absolute w-2 h-2 bg-zinc-500/30 rounded-full"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
              <div className="w-12 h-[3px] bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-full mt-1 border border-zinc-600/40" />
            </div>

            {/* ─── STATION ZONES ─── */}
            {stations.map((st) => (
              <div key={st.key} className="absolute z-10 pointer-events-none" style={{ left: `${st.target}%`, top: '50%', transform: 'translate(-50%, -72px)' }}>
                {/* Pulse ring when playing */}
                {isPlaying && (
                  <motion.div
                    animate={{ scale: [1, 1.8, 2.2], opacity: [0.3, 0.1, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0 }}
                    className="absolute inset-0 rounded-xl border-2"
                    style={{ borderColor: st.color + '40', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }}
                  />
                )}
                
                <div className={`w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 transition-all backdrop-blur-sm ${
                  tutorialStep === st.tutStep 
                    ? `ring-4 scale-125 shadow-lg z-50 bg-opacity-60` 
                    : 'bg-opacity-20'
                }`}
                style={{ 
                  borderColor: st.color + (tutorialStep === st.tutStep ? 'ff' : '40'),
                  backgroundColor: st.darkColor + '30',
                  boxShadow: `0 0 15px ${st.color}15, inset 0 0 10px ${st.color}08`
                }}>
                  <span className="text-[7px] font-black uppercase font-mono tracking-wider" style={{ color: st.color }}>{st.label}</span>
                  <motion.span 
                    animate={isPlaying ? { 
                      scale: [1, 1.2, 1], 
                      rotate: st.key === 'mix' ? [0, 360] : st.key === 'bake' ? [0, 8, -8, 0] : [0, 5, -5, 0],
                      filter: [`drop-shadow(0 0 4px ${st.color})`, `drop-shadow(0 0 12px ${st.color})`, `drop-shadow(0 0 4px ${st.color})`]
                    } : {}}
                    transition={{ 
                      scale: { repeat: Infinity, duration: 1 },
                      rotate: { repeat: Infinity, duration: st.key === 'mix' ? 2 : 1.2, ease: st.key === 'mix' ? "linear" : "easeInOut" },
                      filter: { repeat: Infinity, duration: 1.5 }
                    }}
                    className="text-2xl"
                  >
                    {st.emoji}
                  </motion.span>
                  <span className="text-[6px] font-mono font-bold leading-none" style={{ color: st.color + '80' }}>[{st.hotkey}]</span>
                </div>
                
                {/* Vertical guide line */}
                <div className="absolute top-16 left-1/2 -translate-x-[0.5px] w-[1px] h-20 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${st.color}30, transparent)` }} />
              </div>
            ))}

            {/* ─── JUDGMENT POPUP ─── */}
            <AnimatePresence>
              {lastJudgment && (
                <motion.div
                  key={lastJudgment.id}
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1.1, y: -15 }}
                  exit={{ opacity: 0, scale: 0.7, y: -40 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className={`absolute left-1/2 top-3 -translate-x-1/2 text-sm select-none tracking-wider pointer-events-none px-5 py-2.5 rounded-xl border shadow-2xl text-center z-30 font-sans font-black uppercase ${lastJudgment.color}`}
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(15,15,25,0.95), rgba(20,20,35,0.95))',
                    borderColor: 'rgba(255,255,255,0.1)',
                    textShadow: '0 0 20px currentColor'
                  }}
                >
                  {lastJudgment.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── SCREEN FLASH ─── */}
            <AnimatePresence>
              {flashColor && (
                <motion.div
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 pointer-events-none z-20 rounded-2xl"
                  style={{ backgroundColor: flashColor === 'gold' ? '#fbbf24' : flashColor === 'red' ? '#ef4444' : flashColor === 'emerald' ? '#10b981' : '#f59e0b' }}
                />
              )}
            </AnimatePresence>

            {/* ─── MUFFINS ON BELT ─── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {muffins.map(muffin => (
                <motion.div
                  key={muffin.id}
                  style={{ left: `${muffin.x}%`, top: '50%' }}
                  className="absolute -translate-y-[46px] -translate-x-1/2 flex flex-col items-center"
                >
                  {/* Status LEDs */}
                  <div className="flex gap-[3px] mb-1 px-1.5 py-[2px] rounded-full bg-black/70 border border-white/5">
                    <span className={`w-[5px] h-[5px] rounded-full transition-all ${muffin.status !== 'empty' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-zinc-800'}`} />
                    <span className={`w-[5px] h-[5px] rounded-full transition-all ${(muffin.status === 'bottled' || muffin.status === 'packaged') ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]' : 'bg-zinc-800'}`} />
                    <span className={`w-[5px] h-[5px] rounded-full transition-all ${muffin.status === 'packaged' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-zinc-800'}`} />
                  </div>

                  <motion.span 
                    animate={muffin.isHit 
                      ? { scale: [1, 1.5, 1.1], rotate: [0, 15, -15, 0] } 
                      : { y: [0, -1.5, 0] }}
                    transition={muffin.isHit 
                      ? { duration: 0.3, type: "spring", stiffness: 500 } 
                      : { repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="text-4xl select-none relative"
                    style={{ filter: `drop-shadow(0 0 ${muffin.isHit ? 20 : 8}px ${getStatusGlow(muffin.status)})` }}
                  >
                    {getStatusEmoji(muffin.status)}
                    {/* Hit burst ring */}
                    {muffin.isHit && (
                      <motion.div
                        initial={{ scale: 0.2, opacity: 0.8 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: getStatusGlow(muffin.status) }}
                      />
                    )}
                  </motion.span>
                </motion.div>
              ))}

              {/* ─── FLOATING SCORE POPUPS ─── */}
              <AnimatePresence>
                {floatingScores.map(fs => (
                  <motion.div
                    key={fs.id}
                    initial={{ opacity: 1, y: '40%', scale: 0.8 }}
                    animate={{ opacity: 0, y: '-20%', scale: 1.3 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute text-sm font-black font-sans pointer-events-none z-20"
                    style={{ left: `${fs.x}%`, color: fs.color, textShadow: `0 0 12px ${fs.color}` }}
                  >
                    {fs.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ─── PARTICLES ─── */}
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, y: '50%', scale: 1 }}
                  animate={{ 
                    opacity: 0, 
                    y: `${30 - Math.random() * 80}%`,
                    x: `${(Math.random() - 0.5) * 100}px`,
                    scale: 0,
                    rotate: p.type === 'star' ? 360 : Math.random() * 180
                  }}
                  transition={{ duration: 0.8 + Math.random() * 0.4, ease: "easeOut" }}
                  style={{ 
                    left: `${p.x}%`,
                    width: p.size, height: p.size,
                  }}
                  className="absolute pointer-events-none"
                >
                  {p.type === 'star' ? (
                    <Star className="w-full h-full" style={{ color: p.color, filter: `drop-shadow(0 0 4px ${p.color})` }} />
                  ) : p.type === 'note' ? (
                    <span style={{ color: p.color, fontSize: p.size, filter: `drop-shadow(0 0 4px ${p.color})` }}>♪</span>
                  ) : (
                    <div className="w-full h-full rounded-full" style={{ 
                      backgroundColor: p.color,
                      boxShadow: `0 0 ${p.size * 3}px ${p.color}`
                    }} />
                  )}
                </motion.div>
              ))}
            </div>

            {/* ─── START SCREEN ─── */}
            {!isPlaying && !tutorialStep && (
              <div className="absolute inset-0 bg-[#060610]/95 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-2xl">
                {/* Animated rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={`ring-${i}`}
                      animate={{ scale: [1, 1.5 + i * 0.3, 1], opacity: [0.1, 0.02, 0.1], rotate: [0, 360] }}
                      transition={{ repeat: Infinity, duration: 6 + i * 2, ease: "linear" }}
                      className="absolute w-40 h-40 rounded-full border border-indigo-500/20"
                    />
                  ))}
                </div>
                
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="relative z-10 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </motion.span>
                    <h4 className="text-base font-sans font-black text-indigo-300 uppercase tracking-widest">Baking Dash</h4>
                    <motion.span animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </motion.span>
                  </div>
                  
                  <p className="text-[10px] text-white/50 max-w-xs mb-5 uppercase font-semibold leading-relaxed">
                    Hit items at the right moment to bake & earn rewards!<br/>
                    <span className="text-red-400">Mix [M]</span> → <span className="text-amber-400">Bake [B]</span> → <span className="text-emerald-400">Pack [P]</span>
                  </p>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { playFreq(660, 'sine', 0.15, 0.06); setIsPlaying(true); }}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer border border-indigo-400/30"
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Deploy Shift
                  </motion.button>
                </motion.div>
              </div>
            )}

            {/* Playfield HUD */}
            <div className="mt-auto w-full flex items-end justify-between text-[8px] font-mono tracking-wider text-white/25 pt-2">
              <span>BELT: {muffins.length} items</span>
              {isPlaying && (
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="flex items-center gap-1 text-indigo-400 font-extrabold">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_4px_#818cf8]" />
                  LIVE
                </motion.span>
              )}
              <span>v2.0</span>
            </div>
          </div>
        </div>

        {/* ═══ ACTION BUTTONS ═══ */}
        <div className="grid grid-cols-3 gap-2">
          {stations.map(st => (
            <motion.button
              key={st.key}
              whileTap={{ scale: 0.92 }}
              onClick={st.action}
              disabled={!isPlaying && tutorialStep !== st.tutStep}
              className={`py-3.5 rounded-xl font-sans font-black uppercase text-[10px] tracking-wider transition-all border-2 cursor-pointer select-none relative overflow-hidden ${
                tutorialStep === st.tutStep 
                  ? 'ring-4 scale-102 text-white shadow-lg animate-pulse z-50' 
                  : 'text-white/70 hover:text-white active:text-white'
              }`}
              style={{ 
                borderColor: st.color + (tutorialStep === st.tutStep ? 'cc' : '40'),
                backgroundColor: st.darkColor + '25',
                boxShadow: isPlaying ? `0 0 15px ${st.color}10` : 'none',
                ...(tutorialStep === st.tutStep ? { ringColor: st.color } : {})
              }}
            >
              {/* Button glow pulse */}
              {isPlaying && (
                <motion.div
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: st.color }}
                />
              )}
              <span className="relative z-10">
                {st.emoji} {st.label}
                <span className="block font-mono text-[8px] mt-0.5 opacity-60">[{st.hotkey}]</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ═══ TUTORIAL OVERLAY ═══ */}
      <AnimatePresence>
        {tutorialStep !== null && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#060610]/95 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 15 }}
              className="border p-6 rounded-2xl max-w-sm w-full shadow-2xl relative space-y-4 text-left bg-[#0c0c1a] border-indigo-500/30"
            >
              <div className="absolute top-0 right-0 p-2 text-[8px] text-indigo-400/30 font-bold uppercase font-mono">Guide</div>
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                <span className="text-2xl">🧁</span>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-indigo-300">
                    {tutorialStep === 1 && "🧁 Baking Dash Overview"}
                    {tutorialStep === 2 && "🫙 Phase 1: Mixer Zone"}
                    {tutorialStep === 3 && "🧁 Phase 2: Baking Zone"}
                    {tutorialStep === 4 && "📦 Phase 3: Packing Zone"}
                    {tutorialStep === 5 && "🎁 Earning Rewards"}
                  </h4>
                  <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest mt-0.5">Step {tutorialStep}/5</div>
                </div>
              </div>
              <div className="text-[10px]/relaxed text-white/70 space-y-2 uppercase font-bold">
                {tutorialStep === 1 && <p>Welcome! Baking muffins injects resources into your corporate balance. Hit items at the right moment as they cross each station zone!</p>}
                {tutorialStep === 2 && <p>Empty cups (🫙) slide from the left. When they reach the red <span className="text-red-400">MIX</span> zone, press <span className="bg-red-950/50 px-1.5 py-0.5 rounded text-red-400 border border-red-500/50 font-mono">M</span> to fill them!</p>}
                {tutorialStep === 3 && <p>Mixed batter (🥣) moves to the yellow <span className="text-amber-400">BAKE</span> zone. Press <span className="bg-amber-950/50 px-1.5 py-0.5 rounded text-amber-400 border border-amber-500/50 font-mono">B</span> to bake!</p>}
                {tutorialStep === 4 && <p>Baked muffins (🧁) reach the green <span className="text-emerald-400">PACK</span> zone. Press <span className="bg-emerald-950/50 px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-500/50 font-mono">P</span> to pack into boxes!</p>}
                {tutorialStep === 5 && <p>Each packed box (📦) exits and adds <span className="text-emerald-400 font-black">₹1,200 Cash</span> + <span className="text-emerald-400 font-black">120 raw materials</span>! Combos of 8+ activate <span className="text-amber-400">2X FEVER MODE</span>!</p>}
              </div>
              <div className="p-2 rounded-lg border border-white/10 bg-white/[0.02] text-[8px] font-mono flex items-center justify-around">
                <span className={tutorialStep === 2 ? 'text-red-400 font-bold animate-bounce' : 'text-white/30'}>🫙 Mix</span>
                <span className="text-white/20">→</span>
                <span className={tutorialStep === 3 ? 'text-amber-400 font-bold animate-bounce' : 'text-white/30'}>🥣 Bake</span>
                <span className="text-white/20">→</span>
                <span className={tutorialStep === 4 ? 'text-emerald-400 font-bold animate-bounce' : 'text-white/30'}>🧁 Pack</span>
                <span className="text-white/20">→</span>
                <span className={tutorialStep === 5 ? 'text-emerald-400 font-bold animate-bounce' : 'text-white/30'}>📦 ₹₹₹</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button onClick={() => { playFreq(250, 'sine', 0.08); tutorialStep > 1 ? setTutorialStep(s => s ? s - 1 : 1) : setTutorialStep(null); }}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-[9px] font-sans font-black uppercase cursor-pointer bg-white/5 hover:bg-white/10 text-white/60">
                  {tutorialStep === 1 ? 'Cancel' : '← Back'}
                </button>
                <div className="flex gap-1">{[1,2,3,4,5].map(s => <span key={s} className={`h-1 rounded-full transition-all ${tutorialStep === s ? 'w-4 bg-indigo-400' : 'w-1 bg-white/15'}`} />)}</div>
                <button onClick={() => {
                  if (tutorialStep < 5) { playFreq(440 + (tutorialStep * 85), 'sine', 0.1); setTutorialStep(s => s ? s + 1 : 1); }
                  else { playFreq(885, 'triangle', 0.25, 0.05); setTutorialStep(null); setIsPlaying(true); triggerJudgment("🚀 GO!", "text-indigo-400"); }
                }}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-sans font-black uppercase text-[9px] rounded-lg cursor-pointer shadow-md active:scale-97">
                  {tutorialStep === 5 ? 'Start! 🚀' : 'Next →'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
