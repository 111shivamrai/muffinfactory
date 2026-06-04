import React, { useState, useEffect, useRef } from 'react';
import { AnimatedFactoryFloor } from './AnimatedFactoryFloor';
import { motion, AnimatePresence } from 'motion/react';

// Helper animation components for counting up values smoothly
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    
    const duration = 800; // ms
    const startTime = performance.now();
    let animationFrameId: number;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // easeOutQuad
      const current = Math.round(start + (end - start) * ease);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</>;
}

function AnimatedFloat({ value, decimals = 1, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    
    const duration = 800; // ms
    const startTime = performance.now();
    let animationFrameId: number;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // easeOutQuad
      const current = start + (end - start) * ease;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{displayValue.toFixed(decimals)}{suffix}</>;
}

export function MuffinFactoryDashboardPreview() {
  // Raw Material Inventory policies
  const [flourQty, setFlourQty] = useState(2000);
  const [flourRop, setFlourRop] = useState(500);
  const [sugarQty, setSugarQty] = useState(1500);
  const [sugarRop, setSugarRop] = useState(400);
  const [cocoaQty, setCocoaQty] = useState(800);
  const [cocoaRop, setCocoaRop] = useState(200);

  // Machine Running configurations
  const [mixingRunning, setMixingRunning] = useState(2);
  const [bakingRunning, setBakingRunning] = useState(3);
  const [icingRunning, setIcingRunning] = useState(1);
  const [packingRunning, setPackingRunning] = useState(1);

  // Live Stats
  const [cash, setCash] = useState(2803520.37);
  const [todayRevenue, setTodayRevenue] = useState(124850);
  const [demandFilled, setDemandFilled] = useState(1090);
  const [fillRate, setFillRate] = useState(91.2);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Simulation & Game End States
  const [day, setDay] = useState(2);
  const [countdown, setCountdown] = useState(15);
  const [isEnded, setIsEnded] = useState(false);
  const [dismissEndedModal, setDismissEndedModal] = useState(false);

  // Hidden Stock Levels to calculate reorders on day transitions
  const [flourStock, setFlourStock] = useState(3000);
  const [sugarStock, setSugarStock] = useState(2500);
  const [cocoaStock, setCocoaStock] = useState(1500);

  // Pending deliveries
  const flourPendingDeliveryRef = useRef<number | null>(null);
  const sugarPendingDeliveryRef = useRef<number | null>(null);
  const cocoaPendingDeliveryRef = useRef<number | null>(null);

  // Track previous cash balance for animations
  const prevCashRef = useRef<number | null>(null);
  const [balanceChange, setBalanceChange] = useState<'increase' | 'decrease' | 'none'>('none');

  useEffect(() => {
    const curr = cash;
    if (prevCashRef.current !== null) {
      const prev = prevCashRef.current;
      if (curr > prev) {
        setBalanceChange('increase');
      } else if (curr < prev) {
        setBalanceChange('decrease');
      } else {
        setBalanceChange('none');
      }
    }
    prevCashRef.current = curr;
  }, [cash]);

  // Dynamic input values refs so interval doesn't trigger/reset
  const mixingRunningRef = useRef(mixingRunning);
  const bakingRunningRef = useRef(bakingRunning);
  const icingRunningRef = useRef(icingRunning);
  const packingRunningRef = useRef(packingRunning);
  const flourQtyRef = useRef(flourQty);
  const flourRopRef = useRef(flourRop);
  const sugarQtyRef = useRef(sugarQty);
  const sugarRopRef = useRef(sugarRop);
  const cocoaQtyRef = useRef(cocoaQty);
  const cocoaRopRef = useRef(cocoaRop);

  useEffect(() => { mixingRunningRef.current = mixingRunning; }, [mixingRunning]);
  useEffect(() => { bakingRunningRef.current = bakingRunning; }, [bakingRunning]);
  useEffect(() => { icingRunningRef.current = icingRunning; }, [icingRunning]);
  useEffect(() => { packingRunningRef.current = packingRunning; }, [packingRunning]);
  useEffect(() => { flourQtyRef.current = flourQty; }, [flourQty]);
  useEffect(() => { flourRopRef.current = flourRop; }, [flourRop]);
  useEffect(() => { sugarQtyRef.current = sugarQty; }, [sugarQty]);
  useEffect(() => { sugarRopRef.current = sugarRop; }, [sugarRop]);
  useEffect(() => { cocoaQtyRef.current = cocoaQty; }, [cocoaQty]);
  useEffect(() => { cocoaRopRef.current = cocoaRop; }, [cocoaRop]);

  // Show temporary notifications inside the preview dashboard
  const showDashboardToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleApplyOrders = () => {
    showDashboardToast("Order configurations updated!");
  };

  const handleApplyOperations = () => {
    const totalActive = mixingRunning + bakingRunning + icingRunning + packingRunning;
    if (totalActive === 0) {
      showDashboardToast("Warning: No machines running!");
    } else {
      showDashboardToast("Operations applied! Floor speed updated.");
    }
  };

  const handleNextDay = () => {
    setDay(currentDay => {
      const nextDay = currentDay + 1;
      if (nextDay > 5) {
        setIsEnded(true);
        return currentDay; // Concluded
      }
      
      const mix = mixingRunningRef.current;
      const bake = bakingRunningRef.current;
      const ice = icingRunningRef.current;
      const pack = packingRunningRef.current;
      const isAnyOffline = mix === 0 || bake === 0 || ice === 0 || pack === 0;
      
      if (isAnyOffline) {
        setTodayRevenue(0);
        setDemandFilled(0);
        setFillRate(prev => Math.max(10, prev - 15));
        setCash(prev => prev - 5000);
        showDashboardToast("⚠️ Production halted: one or more machines are offline!");
      } else {
        const active = mix + bake + ice + pack;
        const capacity = active * 150 + Math.floor(Math.random() * 50);
        const filled = Math.min(1200, capacity);
        const rate = (filled / 1200) * 100;
        const rev = filled * 110;
        
        setTodayRevenue(rev);
        setDemandFilled(filled);
        setFillRate(rate);
        setCash(prev => prev + rev);
        
        // Update stock levels & check reorders
        setFlourStock(fStock => {
          let nextStock = fStock - filled * 1.5;
          if (flourPendingDeliveryRef.current !== null) {
            nextStock += flourPendingDeliveryRef.current;
            showDashboardToast(`📦 Flour delivery of ${flourPendingDeliveryRef.current}kg arrived!`);
            flourPendingDeliveryRef.current = null;
          }
          if (nextStock < flourRopRef.current && flourPendingDeliveryRef.current === null) {
            const qty = flourQtyRef.current;
            const cost = qty * 15;
            setCash(prev => prev - cost);
            flourPendingDeliveryRef.current = qty;
            showDashboardToast(`🌾 Reorder! Flour below ROP (${flourRopRef.current}kg). Placed ${qty}kg (Cost: ₹${cost.toLocaleString()})`);
          }
          return Math.max(0, nextStock);
        });

        setSugarStock(sStock => {
          let nextStock = sStock - filled * 1.0;
          if (sugarPendingDeliveryRef.current !== null) {
            nextStock += sugarPendingDeliveryRef.current;
            showDashboardToast(`📦 Sugar delivery of ${sugarPendingDeliveryRef.current}kg arrived!`);
            sugarPendingDeliveryRef.current = null;
          }
          if (nextStock < sugarRopRef.current && sugarPendingDeliveryRef.current === null) {
            const qty = sugarQtyRef.current;
            const cost = qty * 20;
            setCash(prev => prev - cost);
            sugarPendingDeliveryRef.current = qty;
            showDashboardToast(`🌾 Reorder! Sugar below ROP (${sugarRopRef.current}kg). Placed ${qty}kg (Cost: ₹${cost.toLocaleString()})`);
          }
          return Math.max(0, nextStock);
        });

        setCocoaStock(cStock => {
          let nextStock = cStock - filled * 0.5;
          if (cocoaPendingDeliveryRef.current !== null) {
            nextStock += cocoaPendingDeliveryRef.current;
            showDashboardToast(`📦 Cocoa delivery of ${cocoaPendingDeliveryRef.current}kg arrived!`);
            cocoaPendingDeliveryRef.current = null;
          }
          if (nextStock < cocoaRopRef.current && cocoaPendingDeliveryRef.current === null) {
            const qty = cocoaQtyRef.current;
            const cost = qty * 40;
            setCash(prev => prev - cost);
            cocoaPendingDeliveryRef.current = qty;
            showDashboardToast(`🌾 Reorder! Cocoa below ROP (${cocoaRopRef.current}kg). Placed ${qty}kg (Cost: ₹${cost.toLocaleString()})`);
          }
          return Math.max(0, nextStock);
        });
      }
      
      return nextDay;
    });
  };

  useEffect(() => {
    if (isEnded) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleNextDay();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isEnded]);

  // Helper limits
  const incrementFlour = () => setFlourQty(p => Math.min(9900, p + 100));
  const decrementFlour = () => setFlourQty(p => Math.max(0, p - 100));
  const incrementSugar = () => setSugarQty(p => Math.min(9900, p + 100));
  const decrementSugar = () => setSugarQty(p => Math.max(0, p - 100));
  const incrementCocoa = () => setCocoaQty(p => Math.min(9900, p + 50));
  const decrementCocoa = () => setCocoaQty(p => Math.max(0, p - 50));

  const incrementMixing = () => setMixingRunning(p => Math.min(3, p + 1));
  const decrementMixing = () => setMixingRunning(p => Math.max(0, p - 1));
  const incrementBaking = () => setBakingRunning(p => Math.min(3, p + 1));
  const decrementBaking = () => setBakingRunning(p => Math.max(0, p - 1));
  const incrementIcing = () => setIcingRunning(p => Math.min(2, p + 1));
  const decrementIcing = () => setIcingRunning(p => Math.max(0, p - 1));
  const incrementPacking = () => setPackingRunning(p => Math.min(1, p + 1));
  const decrementPacking = () => setPackingRunning(p => Math.max(0, p - 1));

  // Determine if system bottleneck alert should show
  const isAnyStationOffline = mixingRunning === 0 || bakingRunning === 0 || icingRunning === 0 || packingRunning === 0;

  // Render a moving muffin on the conveyor belt
  const MuffinConveyorItem = ({ delay, speed }: { delay: string; speed: number }) => {
    return (
      <div
        className="muffin-conveyor-item"
        style={{
          position: 'absolute',
          bottom: '24px',
          width: '32px',
          height: '36px',
          animation: `muffinMove ${speed}s linear infinite`,
          animationDelay: delay,
          animationPlayState: speed === 0 ? 'paused' : 'running',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 10,
        }}
      >
        {/* Frosting / Topping */}
        <div
          className="muffin-conveyor-top"
          style={{
            width: '24px',
            height: '16px',
            borderRadius: '50% 50% 10% 10%',
            border: '2.5px solid #4a2c11',
            position: 'relative',
            zIndex: 12,
            animation: `muffinBakeFrost ${speed}s linear infinite`,
            animationDelay: delay,
            animationPlayState: speed === 0 ? 'paused' : 'running',
          }}
        />
        {/* Cupcake Liner */}
        <div
          style={{
            width: '18px',
            height: '10px',
            backgroundColor: '#e6ccb2',
            border: '2.5px solid #4a2c11',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            backgroundImage: 'linear-gradient(90deg, #4a2c11 1.5px, transparent 1.5px)',
            backgroundSize: '4px 100%',
            zIndex: 11,
            marginTop: '-2px',
          }}
        />
      </div>
    );
  };

  // Determine Conveyor Speed based on active machinery
  const totalRunning = mixingRunning + bakingRunning + icingRunning + packingRunning;
  // If any critical station is offline, conveyor is stopped
  const conveyorSpeed = isAnyStationOffline ? 0 : Math.max(3, 8 - totalRunning);

  return (
    <div className="muffin-preview-container">
      {/* Dynamic styles injected */}
      <style>{`
        .muffin-preview-container {
          background-color: #ffeef2;
          border: 3px solid #4a2c11;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 0 #4a2c11;
          color: #4a2c11;
          font-family: 'Manrope', 'Segoe UI', sans-serif;
          width: 100%;
          box-sizing: border-box;
          font-weight: 700;
          position: relative;
        }
        .muffin-header-bar {
          background-color: #ffffff;
          border: 3px solid #4a2c11;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 16px;
          box-shadow: 0 4px 0 #4a2c11;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .muffin-brand-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .muffin-brand-logo {
          font-size: 20px;
        }
        .muffin-brand-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 18px;
          font-weight: 800;
          line-height: 1;
        }
        .muffin-brand-sub {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #8c7662;
        }
        .muffin-stat-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .header-pill {
          min-height: 44px;
          padding: 4px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 2.5px solid #4a2c11;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 3px 0 #4a2c11;
          background-color: #fff;
        }
        .header-btn {
          min-height: 44px;
          padding: 4px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 2.5px solid #4a2c11;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 3px 0 #4a2c11;
          cursor: pointer;
          transition: transform 0.08s, box-shadow 0.08s;
          text-transform: uppercase;
          background-color: #ffffff;
        }
        .header-btn:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #4a2c11;
        }
        .header-icon-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid #4a2c11;
          border-radius: 10px;
          font-size: 16px;
          box-shadow: 0 3px 0 #4a2c11;
          cursor: pointer;
          transition: transform 0.08s, box-shadow 0.08s;
          background-color: #ffffff;
        }
        .header-icon-btn:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #4a2c11;
        }
        .muffin-dashboard-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .muffin-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .muffin-card {
          background-color: #fffefb;
          border: 3px solid #4a2c11;
          border-radius: 12px;
          box-shadow: 0 4px 0 #4a2c11;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .muffin-card-header {
          padding: 12px 16px;
          font-size: 15px;
          text-transform: uppercase;
          color: #ffffff;
          border-bottom: 3px solid #4a2c11;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .muffin-card-content {
          padding: 8px;
        }
        .muffin-table {
          width: 100%;
          border-collapse: collapse;
        }
        .muffin-table th {
          text-align: left;
          font-size: 11px;
          color: #8a7360;
          text-transform: uppercase;
          padding-bottom: 4px;
          border-bottom: 2px solid #e6ccb2;
        }
        .muffin-table td {
          padding: 3px 0;
          vertical-align: middle;
          border-bottom: 1.5px dashed #e6ccb2;
          font-size: 14px;
        }
        .muffin-table tr:last-child td {
          border-bottom: none;
        }
        .qty-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qty-btn {
          width: 28px;
          height: 28px;
          background-color: #ffffff;
          border: 2px solid #4a2c11;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 0 #4a2c11;
          user-select: none;
          font-size: 15px;
          transition: transform 0.1s;
        }
        .qty-btn:active {
          transform: translateY(2px);
          box-shadow: none;
        }
        .qty-lbl {
          font-family: 'Inconsolata', monospace;
          font-size: 14px;
          min-width: 45px;
          text-align: center;
          font-weight: 750;
        }
        .rop-input {
          font-family: 'Inconsolata', monospace;
          border: 2px solid #4a2c11;
          border-radius: 6px;
          width: 55px;
          padding: 4px;
          text-align: center;
          font-size: 13px;
          background-color: #ffffff;
          outline: none;
        }
        .input-rop-large {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 900;
          border: 2px solid #4a2c11;
          border-radius: 6px;
          width: 70px;
          height: 26px;
          text-align: center;
          font-size: 13px;
          outline: none;
          color: #4a2c11;
          background-color: #ffffff;
          -moz-appearance: textfield;
        }
        .input-rop-large::-webkit-outer-spin-button,
        .input-rop-large::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .gear-spin-active {
          display: inline-block;
          animation: gear-spin 4s linear infinite;
          transform-origin: center;
        }
        .lead-lbl {
          font-size: 13px;
          color: #8c7662;
          text-align: right;
        }
        .muffin-btn {
          width: 100%;
          border: 3px solid #4a2c11;
          border-radius: 10px;
          padding: 6px;
          font-weight: 800;
          text-transform: uppercase;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 3px 0 #4a2c11;
          font-size: 12px;
          margin-top: 6px;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .muffin-btn:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #4a2c11;
        }
        .muffin-progress-bg {
          width: 50px;
          height: 10px;
          background-color: #f1ebd9;
          border: 2px solid #4a2c11;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }
        .muffin-progress-fill {
          height: 100%;
          border-radius: 4px;
        }
        .muffin-alert {
          border: 2.5px solid #4a2c11;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          text-transform: uppercase;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 800;
        }
        .blueprint-canvas {
          background-color: #d2e9f5;
          border: 3px solid #4a2c11;
          border-radius: 12px;
          height: 220px;
          aspect-ratio: 1.876;
          position: relative;
          overflow: hidden;
          margin: 0 auto;
          box-shadow: inset 0 0 16px rgba(74, 44, 17, 0.15);
        }
        .machine-status-badge {
          display: inline-flex;
          align-items: center;
          border: 2px solid #4a2c11;
          border-radius: 5px;
          overflow: hidden;
          font-family: inherit;
          font-size: 8.5px;
          font-weight: 900;
          box-shadow: 0 1.5px 0 #4a2c11;
          line-height: 1;
        }
        .machine-status-badge .lbl-name {
          background-color: #4a2c11;
          color: #ffffff;
          padding: 2px 4.5px;
          text-transform: uppercase;
        }
        .machine-status-badge .lbl-state {
          color: #ffffff;
          padding: 2px 4.5px;
          text-transform: uppercase;
          min-width: 20px;
          text-align: center;
        }
        .machine-status-badge .lbl-state.on {
          background-color: #89b873;
        }
        .machine-status-badge .lbl-state.off {
          background-color: #e07a5f;
        }
        .conveyor-belt {
          position: absolute;
          bottom: 20px;
          left: 5%;
          width: 90%;
          height: 12px;
          background-color: #78909c;
          border: 3px solid #4a2c11;
          border-radius: 6px;
          background-image: linear-gradient(90deg, #4a2c11 3px, transparent 3px);
          background-size: 12px 100%;
        }
        .conveyor-stand {
          position: absolute;
          bottom: 4px;
          width: 8px;
          height: 16px;
          background-color: #8d6e63;
          border: 2.5px solid #4a2c11;
        }
        .machine-item {
          position: absolute;
          width: 58px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .machine-lbl {
          font-size: 8.5px;
          background-color: #ffffff;
          border: 2px solid #4a2c11;
          border-radius: 4px;
          padding: 1px 4px;
          margin-top: 4px;
          font-weight: 800;
        }
        .revenue-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr) 130px;
          gap: 10px;
          margin-top: 14px;
        }
        @media (max-width: 1024px) {
          .revenue-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .revenue-card {
          background-color: #fffefb;
          border: 2.5px solid #4a2c11;
          border-radius: 10px;
          padding: 8px 10px;
          box-shadow: 0 3px 0 #4a2c11;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 100px;
        }
        .revenue-card-title {
          font-size: 9px;
          color: #8c7662;
          text-transform: uppercase;
          font-weight: 800;
        }
        .revenue-card-val {
          font-size: 15px;
          font-weight: 900;
          margin: 2px 0;
        }
        /* Conveyor animations */
        @keyframes muffinMove {
          0% { left: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { left: 95%; opacity: 0; }
        }
        @keyframes muffinBakeFrost {
          0% { background-color: #efe2d5; border-radius: 50% 50% 0 0; }
          25% { background-color: #efe2d5; border-radius: 50% 50% 0 0; }
          35% { background-color: #ffca28; border-radius: 50% 50% 10% 10%; }
          55% { background-color: #ffca28; border-radius: 50% 50% 10% 10%; }
          65% { background-color: #f06292; border-radius: 50% 50% 10% 10%; }
          100% { background-color: #f06292; border-radius: 50% 50% 10% 10%; }
        }
        @keyframes paddleSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ovenGlow {
          0%, 100% { background-color: rgba(255, 87, 34, 0.2); }
          50% { background-color: rgba(255, 87, 34, 0.8); }
        }
        @keyframes nozzleDrip {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes packerFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.7); }
        }
        .dashboard-toast {
          position: absolute;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1a1a18;
          color: #ffffff;
          border-radius: 30px;
          padding: 8px 18px;
          font-size: 12px;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 2px solid #fff;
        }
      `}</style>

      {/* Internal Notification Toast */}
      {toastMsg && <div className="dashboard-toast">🧁 {toastMsg}</div>}

      {/* ─── Header Bar ─── */}
      <div className="muffin-header-bar">
        <div className="flex items-center gap-2.5">
          <span className="text-4xl">🧁</span>
          <div className="flex flex-col justify-center leading-none">
            <div className="text-[17px] font-black uppercase text-[#4a2c11] leading-[1] font-sans tracking-tight">Muffin Factory</div>
            <div className="text-[8px] font-black tracking-widest text-[#e98fa8] uppercase mt-1 leading-[1]">Solo Chef Mode</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day / Time Pill */}
          <div className="header-pill">
            <span className="text-xl">📅</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[11px] font-extrabold text-[#4a2c11] uppercase">Day {String(day).padStart(2, '0')}</span>
              <span className="text-[9px] font-mono text-[#8c7662] mt-0.5">08:45 AM</span>
            </div>
          </div>

          {/* Balance Pill */}
          <div className="header-pill">
            <span className="text-xl">💵</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Total Cash</span>
              <span className="text-[12px] font-black text-[#4a2c11] mt-0.5">₹<AnimatedNumber value={cash} /></span>
            </div>
          </div>

          {/* Countdown Timer Pill */}
          <div className="header-pill">
            <span className="text-xl">⏱️</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Next Day In</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[11px] font-extrabold ${countdown <= 5 ? 'text-[#e53935]' : 'text-[#4db6ac]'}`}>
                  {countdown}s
                </span>
                <div style={{ width: '48px', height: '8px', backgroundColor: countdown <= 5 ? '#ffcdd2' : '#b2dfdb', border: '1px solid #4a2c11', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${(countdown / 15) * 100}%`, height: '100%', backgroundColor: countdown <= 5 ? '#e53935' : '#4db6ac' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Contracts Trigger Button */}
          <button 
            onClick={() => showDashboardToast("Showing contracts list...")}
            className="header-btn"
          >
            <span className="text-xl">📋</span>
            <span className="text-[11px] font-black tracking-wider text-[#4a2c11]">Contracts</span>
          </button>

          {/* Rank Pill */}
          <div className="header-pill">
            <span className="text-xl">🏆</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Rank</span>
              <span className="text-[12px] font-black text-[#4a2c11] mt-0.5">#12</span>
            </div>
          </div>

          {/* Team Name Pill */}
          <div className="header-pill">
            <span className="text-xl">👨‍🍳</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Team</span>
              <span className="text-[11px] font-black text-[#4a2c11] uppercase mt-0.5">Cupcake Crew</span>
            </div>
          </div>

          {/* Help button */}
          <button
            onClick={() => showDashboardToast("How to Play: Run your factory by making reorder and scheduling decisions!")}
            className="header-icon-btn"
            style={{ backgroundColor: '#f48fb1', color: 'white' }}
            title="Help"
          >
            ❓
          </button>

          {/* Sounds Toggle */}
          <button 
            onClick={() => showDashboardToast("Sound settings toggled")}
            className="header-icon-btn"
            style={{ backgroundColor: '#e8f5e9' }}
            title="Mute/Unmute Sounds"
          >
            🔊
          </button>
        </div>
      </div>

      {/* ─── Main Grid Layout ─── */}
      <div className="muffin-dashboard-grid">
        {/* Left Column Controls */}
        <div>
          {/* Raw Material Card */}
          <div className="muffin-card">
            <div className="muffin-card-header" style={{ backgroundColor: '#89b873' }}>
              <span>Raw Material Management</span>
              <span style={{ fontSize: '14px' }}>🌾</span>
            </div>
            <div className="muffin-card-content">
              <table className="muffin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Order Qty</th>
                    <th style={{ textAlign: 'center' }}>ROP</th>
                    <th style={{ textAlign: 'right' }}>Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🥖 Flour</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementFlour}>-</div>
                        <span className="qty-lbl">{flourQty.toLocaleString()}</span>
                        <div className="qty-btn" onClick={incrementFlour}>+</div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          className="input-rop-large"
                          value={flourRop}
                          onChange={e => setFlourRop(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                        <button onClick={() => setFlourRop(0)} className="text-[#c62828] text-xs font-black hover:scale-125 transition-transform" title="Clear">✕</button>
                      </div>
                    </td>
                    <td className="lead-lbl">1.2 Days</td>
                  </tr>
                  <tr>
                    <td>🥣 Sugar</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementSugar}>-</div>
                        <span className="qty-lbl">{sugarQty.toLocaleString()}</span>
                        <div className="qty-btn" onClick={incrementSugar}>+</div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          className="input-rop-large"
                          value={sugarRop}
                          onChange={e => setSugarRop(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                        <button onClick={() => setSugarRop(0)} className="text-[#c62828] text-xs font-black hover:scale-125 transition-transform" title="Clear">✕</button>
                      </div>
                    </td>
                    <td className="lead-lbl">1.0 Days</td>
                  </tr>

                  <tr>
                    <td>🫙 Cocoa</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementCocoa}>-</div>
                        <span className="qty-lbl">{cocoaQty.toLocaleString()}</span>
                        <div className="qty-btn" onClick={incrementCocoa}>+</div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          className="input-rop-large"
                          value={cocoaRop}
                          onChange={e => setCocoaRop(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                        <button onClick={() => setCocoaRop(0)} className="text-[#c62828] text-xs font-black hover:scale-125 transition-transform" title="Clear">✕</button>
                      </div>
                    </td>
                    <td className="lead-lbl">1.5 Days</td>
                  </tr>
                </tbody>
              </table>

              <button
                className="muffin-btn"
                style={{ backgroundColor: '#89b873' }}
                onClick={handleApplyOrders}
              >
                Apply Order Changes
              </button>
            </div>
          </div>

          {/* Workfloor Activity Card */}
          <div className="muffin-card" style={{ marginBottom: 0 }}>
            <div className="muffin-card-header" style={{ backgroundColor: '#9f7eb8' }}>
              <span>Workfloor Activity</span>
              <span className={mixingRunning + bakingRunning + icingRunning + packingRunning > 0 ? 'gear-spin-active' : ''} style={{ fontSize: '14px' }}>⚙️</span>
            </div>
            <div className="muffin-card-content">
              <table className="muffin-table">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th style={{ textAlign: 'center' }}>Running</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>Capacity</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🥣 Mixing</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementMixing}>-</div>
                        <span className="qty-lbl" style={{ minWidth: '24px' }}>{mixingRunning}</span>
                        <div className="qty-btn" onClick={incrementMixing}>+</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>3</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{Math.round((mixingRunning / 3) * 100)}%</span>
                        <div className="muffin-progress-bg" style={{ width: '70px', height: '6px' }}>
                          <div
                            className="muffin-progress-fill"
                            style={{
                              width: `${Math.round((mixingRunning / 3) * 100)}%`,
                              backgroundColor: '#89b873',
                              height: '100%'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={mixingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {mixingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>🔥 Baking</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementBaking}>-</div>
                        <span className="qty-lbl" style={{ minWidth: '24px' }}>{bakingRunning}</span>
                        <div className="qty-btn" onClick={incrementBaking}>+</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>3</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{Math.round((bakingRunning / 3) * 100)}%</span>
                        <div className="muffin-progress-bg" style={{ width: '70px', height: '6px' }}>
                          <div
                            className="muffin-progress-fill"
                            style={{
                              width: `${Math.round((bakingRunning / 3) * 100)}%`,
                              backgroundColor: '#ffb74d',
                              height: '100%'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={bakingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {bakingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>🧁 Icing</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementIcing}>-</div>
                        <span className="qty-lbl" style={{ minWidth: '24px' }}>{icingRunning}</span>
                        <div className="qty-btn" onClick={incrementIcing}>+</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>2</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{Math.round((icingRunning / 2) * 100)}%</span>
                        <div className="muffin-progress-bg" style={{ width: '70px', height: '6px' }}>
                          <div
                            className="muffin-progress-fill"
                            style={{
                              width: `${Math.round((icingRunning / 2) * 100)}%`,
                              backgroundColor: '#f06292',
                              height: '100%'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={icingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {icingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>📦 Packaging</td>
                    <td>
                      <div className="qty-control">
                        <div className="qty-btn" onClick={decrementPacking}>-</div>
                        <span className="qty-lbl" style={{ minWidth: '24px' }}>{packingRunning}</span>
                        <div className="qty-btn" onClick={incrementPacking}>+</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{Math.round((packingRunning / 1) * 100)}%</span>
                        <div className="muffin-progress-bg" style={{ width: '70px', height: '6px' }}>
                          <div
                            className="muffin-progress-fill"
                            style={{
                              width: `${Math.round((packingRunning / 1) * 100)}%`,
                              backgroundColor: '#4db6ac',
                              height: '100%'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={packingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {packingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <button
                className="muffin-btn"
                style={{ backgroundColor: '#9f7eb8' }}
                onClick={handleApplyOperations}
              >
                Apply Operations
              </button>
            </div>
          </div>
        </div>

        {/* Right Column Factory Visual & Revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Factory Floor Card */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
            {/* The header is now baked into the factory_floor_v2.jpg image inside AnimatedFactoryFloor */}

            <div style={{ padding: '0px' }}>
              {isAnyStationOffline && (
                <div
                  className="muffin-alert"
                  style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    border: '3px solid #4a2c11',
                    borderBottom: 'none',
                    padding: '8px',
                    fontSize: '11px',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    marginBottom: '-3px', // Pull it down to overlap the border below
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <span style={{ fontWeight: 900 }}>⚠️ Alert: Critical station offline. Production conveyor halted!</span>
                </div>
              )}

              <div style={{ border: '3px solid #4a2c11', boxShadow: '0 4px 0 #4a2c11', borderRadius: '12px', overflow: 'hidden', position: 'relative', aspectRatio: '744 / 496' }}>
                <AnimatedFactoryFloor 
                  mixingRunning={mixingRunning} 
                  bakingRunning={bakingRunning}
                  icingRunning={icingRunning} 
                  packingRunning={packingRunning} 
                />
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="muffin-card" style={{ border: '3px solid #4a2c11', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 0 #4a2c11' }}>
            {/* Bottom Card block: REVENUE Card Container */}
            <div style={{ backgroundColor: '#ffa726', borderBottom: '3px solid #4a2c11', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4a2c11', fontWeight: 900, fontSize: '13px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🪙</span> REVENUE
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace' }}>LIVE UPDATE</span>
            </div>
            
            <div style={{ padding: '12px', backgroundColor: '#fffaf5' }}>
              <div className="revenue-row">
                
                {/* Demand Card */}
                <motion.div 
                  className="revenue-card" 
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8.5px 10px', backgroundColor: '#ffffff', border: '2.5px solid #4a2c11', borderRadius: '10px', boxShadow: '0 3px 0 #4a2c11', minHeight: '140px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '9px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Current Demand</span>
                    <span className="revenue-card-val" style={{ fontSize: '16px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px' }}>
                      <AnimatedNumber value={demandFilled} /> / 1,200
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8c7662', display: 'block' }}>Muffins</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <svg viewBox="0 0 160 50" width="100%" height="45" key={`chart-${demandFilled}`}>
                      <motion.path
                        d="M 10 40 L 30 35 L 50 38 L 70 28 L 90 32 L 110 18 L 130 22 L 150 10"
                        fill="none"
                        stroke="#ffa726"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                      {[
                        { cx: 10, cy: 40 },
                        { cx: 30, cy: 35 },
                        { cx: 50, cy: 38 },
                        { cx: 70, cy: 28 },
                        { cx: 90, cy: 32 },
                        { cx: 110, cy: 18 },
                        { cx: 130, cy: 22 },
                        { cx: 150, cy: 10 },
                      ].map((pt, i) => (
                        <motion.circle
                          key={i}
                          cx={pt.cx}
                          cy={pt.cy}
                          r="4"
                          fill="#ffffff"
                          stroke="#ffa726"
                          strokeWidth="2.5"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.08 * i + 0.15, type: "spring", stiffness: 300 }}
                        />
                      ))}
                    </svg>
                  </div>
                </motion.div>

                {/* Fill Rate Card */}
                <motion.div 
                  className="revenue-card" 
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8.5px 10px', backgroundColor: '#ffffff', border: '2.5px solid #4a2c11', borderRadius: '10px', boxShadow: '0 3px 0 #4a2c11', minHeight: '140px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '9px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Fill Rate</span>
                    <span className="revenue-card-val" style={{ fontSize: '16px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px' }}>
                      <AnimatedFloat value={fillRate} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div style={{ marginTop: '4px' }} className="flex justify-center">
                    <svg width="45" height="45" viewBox="0 0 36 36" key={`fill-${fillRate}`}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#efebe9" strokeWidth="4" />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#0288d1"
                        strokeWidth="4"
                        strokeDashoffset="25"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0 100" }}
                        animate={{ 
                          strokeDasharray: `${fillRate} ${100 - fillRate}` 
                        }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </svg>
                  </div>
                </motion.div>

                {/* Daily Revenue Card */}
                <motion.div 
                  className="revenue-card" 
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8.5px 10px', backgroundColor: '#ffffff', border: '2.5px solid #4a2c11', borderRadius: '10px', boxShadow: '0 3px 0 #4a2c11', minHeight: '140px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '9px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Revenue (Today)</span>
                    <span className="revenue-card-val" style={{ fontSize: '16px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px' }}>
                      ₹<AnimatedNumber value={todayRevenue} />
                    </span>
                  </div>
                  <div style={{ marginTop: '4px' }} className="flex justify-center">
                    <svg width="70" height="45" viewBox="0 0 70 45" key={`coins-${todayRevenue}`}>
                      <motion.g 
                        transform="translate(15, 32)"
                        initial={{ y: 15, opacity: 0, scaleY: 0 }}
                        animate={{ y: 0, opacity: 1, scaleY: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 10, delay: 0.05 }}
                      >
                        <ellipse cx="0" cy="4" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="0" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="0" rx="10" ry="4" fill="#ffca28" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-2" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="-6" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-6" rx="10" ry="4" fill="#ffca28" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-8" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="-12" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-12" rx="10" ry="4" fill="#ffe082" stroke="#4a2c11" strokeWidth="1.5" />
                      </motion.g>
                      <motion.g 
                        transform="translate(35, 34)"
                        initial={{ y: 15, opacity: 0, scaleY: 0 }}
                        animate={{ y: 0, opacity: 1, scaleY: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 10, delay: 0.15 }}
                      >
                        <ellipse cx="0" cy="4" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="0" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="0" rx="10" ry="4" fill="#ffca28" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-2" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="-6" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-6" rx="10" ry="4" fill="#ffca28" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-8" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="-12" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-12" rx="10" ry="4" fill="#ffca28" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-14" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="-18" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-18" rx="10" ry="4" fill="#ffe082" stroke="#4a2c11" strokeWidth="1.5" />
                      </motion.g>
                      <motion.g 
                        transform="translate(55, 36)"
                        initial={{ y: 15, opacity: 0, scaleY: 0 }}
                        animate={{ y: 0, opacity: 1, scaleY: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 10, delay: 0.25 }}
                      >
                        <ellipse cx="0" cy="4" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="0" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="0" rx="10" ry="4" fill="#ffca28" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-2" rx="10" ry="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <rect x="-10" y="-6" width="20" height="4" fill="#ffd54f" stroke="#4a2c11" strokeWidth="1.5" />
                        <ellipse cx="0" cy="-6" rx="10" ry="4" fill="#ffe082" stroke="#4a2c11" strokeWidth="1.5" />
                      </motion.g>
                    </svg>
                  </div>
                </motion.div>

                {/* Total Cash Card */}
                <motion.div 
                  className="revenue-card" 
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8.5px 10px', backgroundColor: '#ffffff', border: '2.5px solid #4a2c11', borderRadius: '10px', boxShadow: '0 3px 0 #4a2c11', minHeight: '140px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '9px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Total Cash</span>
                    <span className="revenue-card-val" style={{ fontSize: '13px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ₹<AnimatedNumber value={cash} />
                    </span>
                  </div>
                  <div style={{ marginTop: '4px' }} className="flex justify-center">
                    <svg width="70" height="45" viewBox="0 0 70 45" key={`piggy-${cash}`}>
                      {/* Green Cash Note dropping into slot (Increase or default) */}
                      {(balanceChange === 'increase' || balanceChange === 'none') && (
                        <motion.g
                          initial={{ y: -15, x: 5, opacity: 0, rotate: -25 }}
                          animate={{ y: 12, x: 0, opacity: [0, 1, 1, 0], rotate: -15 }}
                          transition={{ duration: 0.7, ease: "easeIn" }}
                        >
                          <rect x="20" y="0" width="12" height="7" fill="#81c784" stroke="#4a2c11" strokeWidth="1.2" rx="1" />
                          <circle cx="26" cy="3.5" r="1.5" fill="#4caf50" />
                        </motion.g>
                      )}

                      {/* Red cash notes & gold coins flying OUT of slot (Decrease / Spending) */}
                      {balanceChange === 'decrease' && (
                        <>
                          <motion.g
                            initial={{ y: 12, x: 5, opacity: 0, scale: 0.8, rotate: 0 }}
                            animate={{ 
                              y: [-2, -15, -28], 
                              x: [2, -8, -16], 
                              opacity: [0, 1, 1, 0], 
                              scale: [0.8, 1.2, 0.6],
                              rotate: [0, -45, -90]
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          >
                            <rect x="20" y="0" width="10" height="6" fill="#e07a5f" stroke="#4a2c11" strokeWidth="1.2" rx="1" />
                            <circle cx="25" cy="3" r="1" fill="#c62828" />
                          </motion.g>
                          <motion.g
                            initial={{ y: 12, x: 5, opacity: 0, scale: 0.8, rotate: 0 }}
                            animate={{ 
                              y: [-2, -18, -32], 
                              x: [2, 10, 18], 
                              opacity: [0, 1, 1, 0], 
                              scale: [0.8, 1.2, 0.5],
                              rotate: [0, 45, 90]
                            }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.12 }}
                          >
                            <circle cx="25" cy="3" r="3.5" fill="#ffb74d" stroke="#4a2c11" strokeWidth="1.2" />
                            <circle cx="25" cy="3" r="1.5" fill="#ffe082" />
                          </motion.g>
                        </>
                      )}
                      
                      {/* Piggy Bank Body */}
                      <g transform="translate(35, 25)">
                        <motion.g
                          initial={{ scale: 1, x: 0 }}
                          animate={
                            balanceChange === 'decrease'
                              ? { x: [0, -4, 4, -3, 3, -1, 1, 0] }
                              : { scale: [1, 1.15, 0.9, 1.05, 1] }
                          }
                          transition={
                            balanceChange === 'decrease'
                              ? { duration: 0.5, ease: "easeInOut" }
                              : { duration: 0.5, ease: "easeInOut", delay: 0.45 }
                          }
                        >
                          <rect x="-12" y="10" width="6" height="6" fill="#f06292" stroke="#4a2c11" strokeWidth="1.5" rx="1.5" />
                          <rect x="6" y="10" width="6" height="6" fill="#f06292" stroke="#4a2c11" strokeWidth="1.5" rx="1.5" />
                          <ellipse cx="0" cy="0" rx="18" ry="14" fill="#f48fb1" stroke="#4a2c11" strokeWidth="1.8" />
                          <ellipse cx="17" cy="2" rx="4" ry="5" fill="#f06292" stroke="#4a2c11" strokeWidth="1.5" />
                          <circle cx="16" cy="1" r="0.8" fill="#4a2c11" />
                          <circle cx="18" cy="3" r="0.8" fill="#4a2c11" />
                          <path d="M -10 -10 L -4 -16 L 2 -11 Z" fill="#f06292" stroke="#4a2c11" strokeWidth="1.5" strokeLinejoin="round" />
                          <circle cx="9" cy="-4" r="1.5" fill="#4a2c11" />
                          <line x1="-6" y1="-12" x2="2" y2="-12" stroke="#4a2c11" strokeWidth="2" strokeLinecap="round" />
                        </motion.g>
                      </g>
                    </svg>
                  </div>
                </motion.div>

                {/* View Report Button */}
                <motion.button 
                  onClick={() => showDashboardToast("Opening spreadsheet analytics...")}
                  style={{
                    border: '3px solid #4a2c11',
                    borderRadius: '10px',
                    fontWeight: 900,
                    fontSize: '9.5px',
                    textTransform: 'uppercase',
                    color: '#4a2c11',
                    backgroundColor: '#ffd54f',
                    boxShadow: '0 3px 0 #4a2c11',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    gap: '4px',
                  }}
                  whileHover={{ scale: 1.05, y: -4, boxShadow: '0 6px 0 #4a2c11', backgroundColor: '#ffe082' }}
                  whileTap={{ scale: 0.98, y: 1, boxShadow: '0 1px 0 #4a2c11' }}
                >
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2' }}>View Revenue Report</span>
                </motion.button>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Concluded Modal */}
      <AnimatePresence>
        {isEnded && !dismissEndedModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-[999] p-4 text-[#4a2c11]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fffefb] border-4 border-[#4a2c11] max-w-md w-full p-8 shadow-2xl relative rounded-2xl text-center space-y-6"
            >
              <button 
                onClick={() => setDismissEndedModal(true)}
                className="absolute top-4 right-4 text-[#c62828] text-xs font-black hover:scale-125 transition-transform"
                title="Close"
              >
                ✕
              </button>
              
              <span className="text-7xl block animate-bounce">🏆</span>
              <h2 className="text-2xl font-black uppercase text-[#4a2c11]">Baking Plant Concluded</h2>
              <div className="bg-[#ffeef2] border-3 border-[#4a2c11] p-4 rounded-xl text-left space-y-2.5 font-mono text-xs text-[#4a2c11] font-bold">
                <div className="flex justify-between border-b border-[#4a2c11]/10 pb-1.5">
                  <span>TEAM:</span>
                  <span className="uppercase text-emerald-800">Cupcake Crew</span>
                </div>
                <div className="flex justify-between border-b border-[#4a2c11]/10 pb-1.5">
                  <span>FINAL CORPORATE VALUE:</span>
                  <span className="text-indigo-800">₹{cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>FINAL SCORE RATING:</span>
                  <span>{Math.round(fillRate)}% Fill Rate</span>
                </div>
              </div>
              <p className="text-xs text-[#8c7662] uppercase tracking-wider leading-relaxed">
                Look at the master leaderboard projection to examine final ranks!
              </p>
              <button 
                onClick={() => {
                  setDay(2);
                  setCountdown(15);
                  setCash(2803520.37);
                  setTodayRevenue(124850);
                  setDemandFilled(1090);
                  setFillRate(91.2);
                  setIsEnded(false);
                  setDismissEndedModal(false);
                  flourPendingDeliveryRef.current = null;
                  sugarPendingDeliveryRef.current = null;
                  cocoaPendingDeliveryRef.current = null;
                  setFlourStock(3000);
                  setSugarStock(2500);
                  setCocoaStock(1500);
                  showDashboardToast("Simulation restarted!");
                }}
                className="muffin-btn bg-[#89b873] border-[#4a2c11] text-white py-2 font-black uppercase rounded-lg hover:bg-[#78a562] mt-0 w-full"
              >
                Restart Simulation
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
