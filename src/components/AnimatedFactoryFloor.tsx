import React, { useState, useEffect, useRef } from 'react';

type Stage = "mixer" | "baker" | "icer" | "packer";
const STAGES: Stage[] = ["mixer", "baker", "icer", "packer"];
const STAGE_X: Record<Stage, number> = { mixer: 14, baker: 30, icer: 50, packer: 66 };
const STAGE_TIME = 1500;

type Batch = { id: number; stage: Stage; progress: number; moving: boolean; beltX: number };

function CupcakeSVG({ stage }: { stage: Stage }) {
  const isRaw = stage === "mixer";
  const isBaked = stage === "baker";
  const isIced = stage === "icer";

  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.4))", display: 'block' }}>
      {/* Wrapper liner */}
      <path d="M10 22 L30 22 L27 38 L13 38 Z" fill="#c98a4b" stroke="#7a4a1f" strokeWidth="1.2" />
      <path d="M12 24 L14 38 M16 24 L17 38 M20 24 L20 38 M24 24 L23 38 M28 24 L26 38" stroke="#7a4a1f" strokeWidth="0.8" />
      
      {/* Top muffin part */}
      {isRaw ? (
        // Raw dough - lower profile, pale batter pink/cream
        <path d="M10 22 C10 15, 30 15, 30 22 Z" fill="#f4ebd9" stroke="#bda688" strokeWidth="1" />
      ) : (
        // Baked muffin - golden brown, higher profile
        <path d="M8 22 C8 10, 32 10, 32 22 Z" fill="#e3b97b" stroke="#7a4a1f" strokeWidth="1.2" />
      )}

      {/* Chocolate chips - only if baked or iced */}
      {!isRaw && (
        <>
          <circle cx="14" cy="18" r="1.4" fill="#4a2618" />
          <circle cx="20" cy="15" r="1.4" fill="#4a2618" />
          <circle cx="26" cy="19" r="1.4" fill="#4a2618" />
        </>
      )}

      {/* Icing swirl - only if iced */}
      {isIced && (
        <>
          {/* Swirl base */}
          <path d="M11 18 C13 10, 27 10, 29 18 C26 14, 14 14, 11 18 Z" fill="#ff5fa2" stroke="#d81b60" strokeWidth="0.5" />
          {/* Swirl top */}
          <circle cx="20" cy="11" r="2.5" fill="#ff8ec0" stroke="#d81b60" strokeWidth="0.5" />
        </>
      )}
    </svg>
  );
}

function BoxSVG() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.4))", display: 'block' }}>
      <rect x="8" y="14" width="24" height="20" fill="#c98a4b" stroke="#7a4a1f" strokeWidth="1.2" rx="1.5" />
      <rect x="8" y="14" width="24" height="4" fill="#a8702e" stroke="#7a4a1f" strokeWidth="1.2" />
      <line x1="20" y1="14" x2="20" y2="34" stroke="#7a4a1f" strokeWidth="1" />
    </svg>
  );
}

function Box({ delay, paused }: { delay: string; paused: boolean }) {
  return (
    <div className="absolute" style={{
      top: "30%",
      left: 0,
      width: "16%",
      aspectRatio: "1/1",
      animation: "shipOut 3s linear infinite",
      animationDelay: delay,
      animationPlayState: paused ? 'paused' : 'running',
    }}>
      <BoxSVG />
    </div>
  );
}

function nextStage(s: Stage): Stage | null {
  const i = STAGES.indexOf(s);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

interface Props {
  mixingRunning: number;
  bakingRunning: number;
  icingRunning: number;
  packingRunning: number;
}

export const AnimatedFactoryFloor: React.FC<Props> = ({ 
  mixingRunning, 
  bakingRunning, 
  icingRunning, 
  packingRunning 
}) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [produced, setProduced] = useState(0);
  const idRef = useRef(1);
  const lastSpawn = useRef(0);
  const lastTick = useRef(performance.now());

  // Determine if conveyor is halted (any station offline)
  const isAnyStationOffline = mixingRunning === 0 || bakingRunning === 0 || icingRunning === 0 || packingRunning === 0;

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(100, now - lastTick.current);
      lastTick.current = now;

      // If the conveyor is halted, dt for belt movement is 0
      const beltDt = isAnyStationOffline ? 0 : dt;

      setBatches((prev) => {
        const next: Batch[] = [];
        let producedDelta = 0;
        const occupied: Record<Stage, boolean> = { mixer: false, baker: false, icer: false, packer: false };
        
        // Find which stages are occupied by non-moving batches
        for (const b of prev) {
          if (!b.moving) {
            occupied[b.stage] = true;
          }
        }

        for (const b of prev) {
          if (b.moving) {
            const target = nextStage(b.stage);
            const targetX = target ? STAGE_X[target] : 95;
            const nx = b.beltX + (18 * beltDt) / 1000;
            if (nx >= targetX) {
              if (!target) {
                producedDelta += 1;
                continue; 
              }
              if (!occupied[target]) {
                occupied[target] = true;
                next.push({ ...b, stage: target, moving: false, progress: 0, beltX: targetX });
              } else {
                next.push({ ...b, beltX: targetX });
              }
            } else {
              next.push({ ...b, beltX: nx });
            }
          } else {
            // Processing at a station
            // Only progresses if the respective machine count is > 0
            const runningCount = {
              mixer: mixingRunning,
              baker: bakingRunning,
              icer: icingRunning,
              packer: packingRunning
            }[b.stage];

            const speedMultiplier = runningCount > 0 ? 1 : 0;
            const p = b.progress + (dt * speedMultiplier) / STAGE_TIME;

            if (p >= 1) {
              next.push({ ...b, progress: 1, moving: true, beltX: STAGE_X[b.stage] });
              occupied[b.stage] = false;
            } else {
              next.push({ ...b, progress: p });
            }
          }
        }

        if (producedDelta > 0) {
          setProduced((v) => v + producedDelta);
        }

        // Spawn a new batch only if Mixer is running and the conveyor isn't halted
        lastSpawn.current += dt;
        if (lastSpawn.current >= 1200) {
          lastSpawn.current = 0;
          if (mixingRunning > 0 && !occupied.mixer && !isAnyStationOffline) {
            next.push({ id: idRef.current++, stage: "mixer", progress: 0, moving: false, beltX: STAGE_X.mixer });
          }
        }

        return next;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mixingRunning, bakingRunning, icingRunning, packingRunning, isAnyStationOffline]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: '#fffdfa',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes shipOut {
          0% { transform: translateX(0); opacity: 0 }
          10% { opacity: 1 }
          90% { opacity: 1 }
          100% { transform: translateX(420%); opacity: 0 }
        }
        @keyframes ovenPulse { 0%,100% { opacity:.3 } 50% { opacity:.9 } }
        @keyframes press {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(12px) }
        }
        .steam {
          position: absolute; left: 50%; bottom: 0;
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255,255,255,0.7); filter: blur(1.5px);
          animation: steamRise 1.8s ease-out infinite;
        }
        @keyframes steamRise {
          0%   { transform: translate(-50%, 0); scale(0.6); opacity: 0 }
          25%  { opacity: 0.8 }
          100% { transform: translate(-10px, -45px) scale(1.8); opacity: 0 }
        }
        .drip {
          position: absolute; left: 50%; top: 0;
          width: 6px; height: 6px; border-radius: 50%;
          background: #ff5fa2; box-shadow: 0 0 5px rgba(255,95,162,0.7);
          animation: drip 1.2s ease-in infinite;
        }
        @keyframes drip {
          0%   { transform: translate(-50%, 0) scale(0.6); opacity: 0 }
          20%  { opacity: 1 }
          100% { transform: translate(-50%, 25px) scale(1); opacity: 0 }
        }
      `}</style>

      {/* 1. Background Image */}
      <img 
        src="/factory_floor_v2.jpg" 
        alt="Factory Floor" 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block', 
          objectFit: 'fill',
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: 0,
          userSelect: 'none'
        }} 
        draggable={false}
      />

      {/* 2. Interactive Status Pill */}
      <div className="absolute flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[8px] sm:text-[10px] font-black text-white"
           style={{ right: "2%", top: "2.5%", border: '1.5px solid #4a2c11', zIndex: 20 }}>
        {isAnyStationOffline ? (
          <>
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]" />
            SYSTEM BOTTLENECK
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.7)]" />
            ALL SYSTEMS NORMAL
          </>
        )}
      </div>

      {/* 3. Production counter */}
      <div className="absolute rounded-md bg-[#1b4322]/85 border-2 border-[#4a2c11] px-2 py-0.5 text-right font-mono text-white shadow"
           style={{ right: "2%", top: "9%", minWidth: "75px", zIndex: 20 }}>
        <div style={{ fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', color: '#a5d6a7', lineHeight: 1.1 }}>Today's Production</div>
        <div style={{ fontSize: '13px', sm: '15px', fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1.1 }}>{produced.toString().padStart(5, "0")}</div>
      </div>

      {/* 4. Baker Overlay - flickering oven glow & chimney steam */}
      {bakingRunning > 0 && !isAnyStationOffline && (
        <>
          <div className="pointer-events-none absolute rounded-md"
               style={{
                 left: `${STAGE_X.baker - 5.5}%`, top: "42%", width: "11%", height: "15%",
                 background: "radial-gradient(ellipse, rgba(255,170,80,0.65), rgba(255,120,40,0) 70%)",
                 mixBlendMode: "screen", animation: "ovenPulse 0.9s ease-in-out infinite",
                 zIndex: 1
               }} />
          <div className="pointer-events-none absolute" style={{ left: `${STAGE_X.baker + 1}%`, top: "14%", width: "2%", height: "20%", zIndex: 1 }}>
            <span className="steam" style={{ animationDelay: "0s" }} />
            <span className="steam" style={{ animationDelay: "0.7s" }} />
            <span className="steam" style={{ animationDelay: "1.4s" }} />
          </div>
        </>
      )}

      {/* 5. Icer Overlay - pink icing drip */}
      {icingRunning > 0 && !isAnyStationOffline && (
        <div className="pointer-events-none absolute" style={{ left: `${STAGE_X.icer}%`, top: "40%", width: 0, height: 0, zIndex: 1 }}>
          <span className="drip" style={{ animationDelay: "0s" }} />
          <span className="drip" style={{ animationDelay: "0.4s" }} />
          <span className="drip" style={{ animationDelay: "0.8s" }} />
        </div>
      )}

      {/* 6. Packer Overlay - pressing plunger */}
      <svg className="pointer-events-none absolute" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
           style={{ left: `${STAGE_X.packer - 6}%`, top: "38%", width: "12%", height: "20%", zIndex: 1 }}>
        <g style={{
          animation: (packingRunning > 0 && !isAnyStationOffline) ? "press 0.9s ease-in-out infinite" : "none"
        }}>
          <rect x="42" y="10" width="16" height="30" fill="#90a4ae" stroke="#546e7a" strokeWidth="1.5" rx="2" />
          <rect x="38" y="38" width="24" height="6" fill="#455a64" rx="1" />
        </g>
      </svg>

      {/* 7. Outgoing boxes drifting along right belt */}
      <div className="pointer-events-none absolute overflow-hidden" style={{ left: "72%", top: "70%", width: "26%", height: "14%", zIndex: 1 }}>
        <Box delay="0s" paused={isAnyStationOffline || packingRunning === 0} />
        <Box delay="1s" paused={isAnyStationOffline || packingRunning === 0} />
        <Box delay="2s" paused={isAnyStationOffline || packingRunning === 0} />
      </div>

      {/* 8. Moving batches on the main belt (SVG Cupcakes and boxes) */}
      {batches.filter((b) => b.moving).map((b) => (
        <div key={b.id} className="pointer-events-none absolute"
             style={{ 
               left: `${b.beltX}%`, 
               top: "76%", 
               transform: "translate(-50%, -50%)", 
               width: "5.5%", 
               aspectRatio: "1/1",
               zIndex: 10
             }}>
          {b.stage === "packer" ? <BoxSVG /> : <CupcakeSVG stage={b.stage} />}
        </div>
      ))}
    </div>
  );
};
