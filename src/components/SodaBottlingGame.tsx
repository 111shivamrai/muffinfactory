import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Flame, Sparkle, Trophy, Volume2, VolumeX, BookOpen, Zap, Star } from 'lucide-react';

type Quality = 'perfect' | 'good' | 'ok' | 'defect';

interface BottleItem {
  id: number;
  x: number;
  status: 'empty' | 'filled' | 'capped' | 'labeled' | 'crated';
  quality: Quality;
  isHit: boolean;
  scoreGranted: boolean;
  hitTime: number;
  pressure: number;
  crateProgress: number;
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

interface SodaBottlingGameProps {
  onReward?: (cash: number, rawMaterials: number) => void;
  onClose?: () => void;
}

const QUALITY_MULTIPLIER = {
  'perfect': 1.0,
  'good': 0.8,
  'ok': 0.4,
  'defect': 0.0
};

export function SodaBottlingGame({ onReward, onClose }: SodaBottlingGameProps = {}) {
  const { rewardOvertimeLabor, theme } = useGame();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [bottles, setBottles] = useState<BottleItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [lastJudgment, setLastJudgment] = useState<{ text: string; color: string; id: string } | null>(null);
  const [fizzActive, setFizzActive] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [totalBottled, setTotalBottled] = useState(0);
  
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  
  const [dailyBonusEarned, setDailyBonusEarned] = useState(0);
  const DAILY_MAX_CASH = 30000;
  const DAILY_MAX_RM = 3000;
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const musicTickRef = useRef<NodeJS.Timeout | null>(null);
  const bottleIdCounter = useRef(0);
  const soundCooldown = useRef(false);

  const keysHeld = useRef({ F: false, R: false });

  const FILL_TARGET = 20;
  const CAP_TARGET = 45;
  const LABEL_TARGET = 70;
  const CRATE_TARGET = 90;
  
  const TARGET_WINDOW = 8;
  const TIGHT_WINDOW = 4;

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
      ? ['#fbbf24', '#34d399', '#60a5fa'] 
      : ['#94a3b8', '#cbd5e1'];
    for (let i = 0; i < count; i++) {
      list.push({
        id: Math.random(),
        x: xPct + (Math.random() * 10 - 5),
        y: 35 + (Math.random() * 30 - 15),
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        size: Math.random() * 5 + 3,
        type: isPerfect ? 'star' : 'spark'
      });
    }
    setParticles(p => [...p.slice(-80), ...list]);
    setTimeout(() => setParticles(p => p.filter(item => !list.find(l => l.id === item.id))), 1200);
  }, []);

  const degradeQuality = (current: Quality, steps: number): Quality => {
    const chain: Quality[] = ['perfect', 'good', 'ok', 'defect'];
    const idx = chain.indexOf(current);
    const newIdx = Math.min(idx + steps, chain.length - 1);
    return chain[newIdx];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const key = e.key.toUpperCase();
      if (key === 'F') keysHeld.current.F = true;
      if (key === 'R') keysHeld.current.R = true;
      if (key === 'C') triggerCap();
      if (key === 'L') triggerLabel();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'F') {
        keysHeld.current.F = false;
        triggerFillRelease();
      }
      if (key === 'R') {
        keysHeld.current.R = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, bottles, streak, fizzActive]);

  useEffect(() => {
    if (isPlaying && soundEnabled) {
      musicTickRef.current = setInterval(() => {
        playFreq(150.00, 'triangle', 0.06, 0.012);
      }, 900);
    } else {
      if (musicTickRef.current) clearInterval(musicTickRef.current);
    }
    return () => { if (musicTickRef.current) clearInterval(musicTickRef.current); };
  }, [isPlaying, soundEnabled]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setBottles(prev => {
          let updated = [...prev];
          
          // Pressure Mechanics for F (Fill)
          if (keysHeld.current.F) {
            updated = updated.map(b => {
              if (Math.abs(b.x - FILL_TARGET) <= TARGET_WINDOW && b.status === 'empty') {
                return { ...b, pressure: b.pressure + (fizzActive ? 6 : 4) };
              }
              return b;
            });
          }

          // Hold Mechanics for R (Crate)
          if (keysHeld.current.R) {
            updated = updated.map(b => {
              if (Math.abs(b.x - CRATE_TARGET) <= TARGET_WINDOW && b.status === 'labeled') {
                const newProgress = b.crateProgress + 50;
                if (newProgress >= 300) {
                  // Crated!
                  handleSuccess(b.x, 'Crate', 0, b.quality);
                  return { ...b, status: 'crated', crateProgress: newProgress, isHit: true, hitTime: Date.now() };
                }
                return { ...b, crateProgress: newProgress };
              }
              return b;
            });
          }
          
          updated = updated.map(b => ({
            ...b,
            x: b.x + (fizzActive ? 1.7 : 1.3),
            isHit: Date.now() - b.hitTime < 300 ? b.isHit : false
          }));

          const exited = updated.filter(m => m.x >= 95);
          exited.forEach(b => {
            if (b.status === 'crated' && b.quality !== 'defect') {
              const mult = QUALITY_MULTIPLIER[b.quality];
              const addedCash = 1200 * mult;
              const addedRM = 120 * mult;
              setTotalBottled(t => t + 1);
              
              if (dailyBonusEarned < DAILY_MAX_CASH) {
                setDailyBonusEarned(prev => Math.min(DAILY_MAX_CASH, prev + addedCash));
                rewardOvertimeLabor(addedCash, addedRM);
                if (onReward) onReward(addedCash, addedRM);
                triggerJudgment(`+₹${addedCash.toLocaleString()} 💰`, 'text-emerald-400');
                addFloatingScore(90, `+₹${addedCash.toLocaleString()}`, '#34d399');
              }
            } else if (b.quality === 'defect') {
               // Penalty for defect
               triggerJudgment("DEFECT SCRAPPED", "text-red-500");
            }
          });

          return updated.filter(m => m.x < 95);
        });

        // Spawn new items
        if (Math.random() < (fizzActive ? 0.05 : 0.035)) {
          setBottles(prev => {
            if (prev.some(m => m.x < 12)) return prev;
            bottleIdCounter.current += 1;
            return [...prev, {
              id: bottleIdCounter.current,
              x: 0,
              status: 'empty',
              quality: 'perfect',
              isHit: false,
              scoreGranted: false,
              hitTime: 0,
              pressure: 0,
              crateProgress: 0
            }];
          });
        }
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, dailyBonusEarned, fizzActive]);

  useEffect(() => {
    if (streak >= 8) {
      if (!fizzActive) {
        setFizzActive(true);
        setComboMultiplier(2);
        triggerJudgment("💦 FIZZ MODE! 2X SCORE! 💦", "text-cyan-400");
        triggerFlash('cyan');
      }
    } else {
      if (fizzActive) {
        setFizzActive(false);
        setComboMultiplier(1);
      }
    }
  }, [streak]);

  const triggerFillRelease = () => {
    setBottles(prev => {
      let matched = false;
      return prev.map(b => {
        if (!matched && Math.abs(b.x - FILL_TARGET) <= TARGET_WINDOW && b.status === 'empty') {
          matched = true;
          let newQuality: Quality = 'perfect';
          if (b.pressure > 70) newQuality = 'defect';
          else if (b.pressure < 40) newQuality = 'ok';
          
          handleSuccess(b.x, 'Fill', 0, newQuality);
          return { ...b, status: 'filled', quality: newQuality, isHit: true, hitTime: Date.now() };
        }
        return b;
      });
    });
  };

  const triggerCap = () => {
    setBottles(prev => {
      let matched = false;
      let success = false;
      const next = prev.map(b => {
        const dist = Math.abs(b.x - CAP_TARGET);
        if (!matched && dist <= TARGET_WINDOW && b.status === 'filled') {
          matched = true;
          success = true;
          let degradation = 0;
          if (dist > 2 && dist <= 4.5) degradation = 1;
          else if (dist > 4.5) degradation = 2;
          
          const newQuality = degradeQuality(b.quality, degradation);
          handleSuccess(b.x, 'Cap', dist, newQuality);
          return { ...b, status: 'capped', quality: newQuality, isHit: true, hitTime: Date.now() };
        }
        return b;
      });
      if (!matched) handleMiss();
      return next;
    });
  };

  const triggerLabel = () => {
    setBottles(prev => {
      let matched = false;
      let success = false;
      const next = prev.map(b => {
        const dist = Math.abs(b.x - LABEL_TARGET);
        if (!matched && dist <= TIGHT_WINDOW && b.status === 'capped') {
          matched = true;
          success = true;
          let degradation = 0;
          if (dist > 1 && dist <= 3) degradation = 1;
          else if (dist > 3) degradation = 2;
          
          const newQuality = degradeQuality(b.quality, degradation);
          handleSuccess(b.x, 'Label', dist, newQuality);
          return { ...b, status: 'labeled', quality: newQuality, isHit: true, hitTime: Date.now() };
        }
        return b;
      });
      if (!matched) handleMiss();
      return next;
    });
  };

  const handleSuccess = (x: number, actionLabel: string, dist: number, quality: Quality) => {
    if (quality === 'defect') {
      setStreak(0);
      triggerJudgment("💥 BURST / DEFECT!", "text-red-500");
      triggerFlash('red');
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 200);
      return;
    }
    
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    if (nextStreak > highestStreak) setHighestStreak(nextStreak);
    
    let baseScore = 0;
    if (quality === 'perfect') {
      baseScore = 30;
      triggerJudgment(`🎯 PERFECT ${actionLabel}!`, 'text-cyan-400');
      triggerFlash('cyan');
      spawnParticles(x, 24, true);
    } else if (quality === 'good') {
      baseScore = 15;
      triggerJudgment(`✨ GREAT ${actionLabel}!`, 'text-blue-400');
    } else {
      baseScore = 5;
      triggerJudgment(`👍 OK ${actionLabel}`, 'text-slate-300');
    }
    
    const points = baseScore * comboMultiplier;
    setScore(s => s + points);
    addFloatingScore(x, `+${points}`, quality === 'perfect' ? '#22d3ee' : '#94a3b8');
  };

  const handleMiss = () => {
    setStreak(0);
    playFreq(180, 'sawtooth', 0.25, 0.05);
    triggerJudgment('❌ MISS!', 'text-red-500');
    triggerFlash('red');
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 200);
  };

  const getStatusEmoji = (s: BottleItem['status'], q: Quality) => {
    if (q === 'defect') return '💥';
    switch(s) {
      case 'empty': return '🫙';
      case 'filled': return '🍾';
      case 'capped': return '🧴';
      case 'labeled': return '🥫';
      case 'crated': return '📦';
    }
  };

  const resetGame = () => {
    setScore(0); setStreak(0); setBottles([]); setParticles([]);
    setFizzActive(false); setIsPlaying(false); setTotalBottled(0);
    setComboMultiplier(1); setFloatingScores([]);
  };

  const stations = [
    { key: 'fill', label: 'FILL', hotkey: 'HOLD F', target: FILL_TARGET, color: '#0ea5e9' },
    { key: 'cap', label: 'CAP', hotkey: 'TAP C', target: CAP_TARGET, color: '#f59e0b' },
    { key: 'label', label: 'LABEL', hotkey: 'TAP L', target: LABEL_TARGET, color: '#10b981' },
    { key: 'crate', label: 'CRATE', hotkey: 'HOLD R', target: CRATE_TARGET, color: '#8b5cf6' }
  ];

  return (
    <div className={`rounded-2xl text-white relative overflow-hidden transition-all duration-500 shadow-2xl ${
      fizzActive ? 'shadow-cyan-500/30' : ''
    }`}>
      <div className={`absolute inset-0 transition-all duration-1000 ${
        fizzActive ? 'bg-gradient-to-br from-cyan-950/90 via-[#0a1520] to-blue-950/60' : 'bg-gradient-to-br from-[#0a0e1a] via-[#0c1220] to-[#0a0e1a]'
      }`} />
      
      <div className={`relative z-10 p-5 space-y-4 border rounded-2xl transition-all duration-500 ${
        fizzActive ? 'border-cyan-500/60' : 'border-blue-500/20'
      } ${screenShake ? 'animate-shake' : ''}`}>

        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-cyan-300">
              Soda Bottling Simulator
            </h3>
          </div>
          <div className="flex gap-1.5">
             <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
               {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-red-500" />}
             </button>
             <button onClick={resetGame} className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
               <RotateCcw className="w-4 h-4 text-orange-400" />
             </button>
             {!isPlaying && <button onClick={() => setIsPlaying(true)} className="px-4 py-1.5 bg-cyan-600 rounded-lg text-xs font-bold">START</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          {/* STATS */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-3xl font-black text-cyan-400">{score.toLocaleString()}</div>
            <div className="text-sm font-bold text-orange-400">Combo: {streak}</div>
            <div className="mt-4 text-xs font-bold text-emerald-400">Cash: ₹{dailyBonusEarned.toLocaleString()}</div>
          </div>

          {/* PLAYFIELD */}
          <div className="relative min-h-[350px] bg-black/40 rounded-xl border border-white/10 overflow-hidden">
            {/* Belt */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-6 h-12 border-y border-white/20 bg-white/5" />

            {/* Stations */}
            {stations.map(st => (
              <div key={st.key} className="absolute z-10" style={{ left: `${st.target}%`, top: '50%', transform: 'translate(-50%, -72px)' }}>
                <div className="w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm" style={{ borderColor: st.color }}>
                  <span className="text-[10px] font-black" style={{ color: st.color }}>{st.label}</span>
                  <span className="text-[8px] opacity-70">{st.hotkey}</span>
                </div>
              </div>
            ))}

            {/* Bottles */}
            {bottles.map(b => (
              <div key={b.id} className="absolute -translate-y-[46px] -translate-x-1/2 flex flex-col items-center" style={{ left: `${b.x}%`, top: '50%' }}>
                {b.pressure > 0 && b.status === 'empty' && (
                  <div className="w-8 h-1.5 bg-white/20 rounded-full mb-1">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, b.pressure)}%` }} />
                  </div>
                )}
                {b.crateProgress > 0 && b.status === 'labeled' && (
                  <div className="w-8 h-1.5 bg-white/20 rounded-full mb-1">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(b.crateProgress / 300) * 100}%` }} />
                  </div>
                )}
                <span className="text-4xl filter drop-shadow-md">{getStatusEmoji(b.status, b.quality)}</span>
              </div>
            ))}

            {/* Judgments */}
            <AnimatePresence>
              {lastJudgment && (
                <motion.div
                  key={lastJudgment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -20 }}
                  exit={{ opacity: 0 }}
                  className={`absolute left-1/2 top-10 -translate-x-1/2 text-xl font-black uppercase ${lastJudgment.color}`}
                >
                  {lastJudgment.text}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {flashColor && <motion.div initial={{ opacity: 0.3 }} animate={{ opacity: 0 }} className="absolute inset-0" style={{ backgroundColor: flashColor === 'cyan' ? '#06b6d4' : '#ef4444' }} />}
            </AnimatePresence>
          </div>
        </div>

        {/* Buttons (Visual hints) */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
           {stations.map(st => (
             <div key={st.key} className="p-2 bg-white/5 rounded-lg border border-white/10" style={{ color: st.color }}>
               {st.hotkey}
             </div>
           ))}
        </div>

      </div>
    </div>
  );
}
