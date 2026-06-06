/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Clock, 
  Settings, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  ChevronRight, 
  X,
  FileText,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';

import { RoundResult, Contract, DEFAULT_STATIONS, Delivery, INITIAL_VALUES, DEFAULT_PARAMETERS } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AnimatedFactoryFloor } from "./AnimatedFactoryFloor";
import { getInitialContracts, calculateDemand } from '../lib/gameLogic';
import { SodaBottlingGame } from './SodaBottlingGame';

// Helper animation components for counting up values smoothly
function AnimatedNumber({ value, formatter }: { value: number; formatter?: (v: number) => string }) {
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

  return <span>{formatter ? formatter(displayValue) : displayValue.toLocaleString()}</span>;
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

  return <span>{displayValue.toFixed(decimals)}{suffix}</span>;
}

interface LocalGameState {
  balance: number;
  initialCash: number;
  salesRevenue: number;
  contractRevenue: number;
  totalCostsPaid: number;
  inventory: number;
  flourStock: number;
  sugarStock: number;
  eggsStock: number;
  cocoaStock: number;
  deliveries: Delivery[];
  contracts: Contract[];
  stations: typeof DEFAULT_STATIONS;
  flourOrderQty: number;
  flourROP: number;
  sugarOrderQty: number;
  sugarROP: number;
  eggsOrderQty: number;
  eggsROP: number;
  cocoaOrderQty: number;
  cocoaROP: number;
  tick: number;
  lastDemand: number;
  lastSold: number;
  lastStockout: number;
  lastRevenue: number;
  satisfaction: number;
  ropFiredThisTick: boolean;
}

export function StudentDashboard() {
  const {
    session,
    currentTeam,
    allTeams,
    results,
    isDirectPlay,
    setIsDirectPlay,
    resetDirectSession,
    acceptContract,
    abortContract,
    buyMachine,
    updateActiveMachines,
    updateProcurementSettingsEx,
    theme,
    toggleTheme,
    logout,
    updateTeamState,
    updateSession
  } = useGame();

  const handleExit = async () => {
    setIsDirectPlay(false);
    window.location.hash = '';
    await logout();
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const lastWrittenStateRef = useRef<any>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [dismissEndedModal, setDismissEndedModal] = useState(false);

  // Sync ended modal dismissal state
  useEffect(() => {
    if (session?.status === 'active') {
      setDismissEndedModal(false);
    }
  }, [session?.status]);

  // ─── LOCAL GAME LOOP STATE ───
  const [gameState, setGameState] = useState<LocalGameState | null>(null);
  const stateRef = useRef<LocalGameState | null>(null);
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);
  const [gameRunning, setGameRunning] = useState(false);
  const intervalRef = useRef<any>(null);
  const [cashFlash, setCashFlash] = useState<'gain' | 'loss' | null>(null);

  // Track previous balance to determine cash flow direction (incoming/outgoing)
  const prevBalanceRef = useRef<number | null>(null);
  const [balanceChange, setBalanceChange] = useState<'increase' | 'decrease' | 'none'>('none');

  useEffect(() => {
    if (!gameState) return;
    const curr = gameState.balance;
    if (prevBalanceRef.current !== null) {
      const prev = prevBalanceRef.current;
      if (curr > prev) {
        setBalanceChange('increase');
      } else if (curr < prev) {
        setBalanceChange('decrease');
      } else {
        setBalanceChange('none');
      }
    }
    prevBalanceRef.current = curr;
  }, [gameState?.balance]);

  // Raw Material Local Inputs (committed on Apply)
  const [flourQ, setFlourQ] = useState(2000);
  const [flourR, setFlourR] = useState(500);
  const [sugarQ, setSugarQ] = useState(1500);
  const [sugarR, setSugarR] = useState(400);
  const [eggsQ, setEggsQ] = useState(1200);
  const [eggsR, setEggsR] = useState(300);
  const [cocoaQ, setCocoaQ] = useState(800);
  const [cocoaR, setCocoaR] = useState(200);

  // Machine Running Local Inputs (committed on Apply)
  const [mixingRunning, setMixingRunning] = useState(2);
  const [bakingRunning, setBakingRunning] = useState(3);
  const [icingRunning, setIcingRunning] = useState(1);
  const [packingRunning, setPackingRunning] = useState(1);

  // Sync inputs from database updates
  useEffect(() => {
    if (currentTeam) {
      setFlourQ(currentTeam.flourOrderQty ?? 2000);
      setFlourR(currentTeam.flourROP ?? 500);
      setSugarQ(currentTeam.sugarOrderQty ?? 1500);
      setSugarR(currentTeam.sugarROP ?? 400);
      setEggsQ(currentTeam.eggsOrderQty ?? 1200);
      setEggsR(currentTeam.eggsROP ?? 300);
      setCocoaQ(currentTeam.cocoaOrderQty ?? 800);
      setCocoaR(currentTeam.cocoaROP ?? 200);

      if (currentTeam.stations) {
        setMixingRunning(currentTeam.stations.mixing?.active ?? 2);
        setBakingRunning(currentTeam.stations.bottling?.active ?? 3);
        setIcingRunning(currentTeam.stations.icing?.active ?? 1);
        setPackingRunning(currentTeam.stations.packaging?.active ?? 1);
      }
    }
  }, [currentTeam]);

  // Initialize gameState from Firestore on mount
  useEffect(() => {
    if (!currentTeam || gameState) return;
    
    const initialFlour = currentTeam.flourStock ?? Math.round(0.35 * (currentTeam.rawMaterials || 0));
    const initialSugar = currentTeam.sugarStock ?? Math.round(0.25 * (currentTeam.rawMaterials || 0));
    const initialEggs = currentTeam.eggsStock ?? Math.round(0.20 * (currentTeam.rawMaterials || 0));
    const initialCocoa = currentTeam.cocoaStock ?? Math.round(0.20 * (currentTeam.rawMaterials || 0));

    const initialState: LocalGameState = {
      balance: currentTeam.balance ?? INITIAL_VALUES.BALANCE,
      initialCash: currentTeam.initialCash ?? currentTeam.balance ?? INITIAL_VALUES.BALANCE,
      salesRevenue: currentTeam.salesRevenue ?? 0,
      contractRevenue: currentTeam.contractRevenue ?? 0,
      totalCostsPaid: currentTeam.totalCostsPaid ?? 0,
      inventory: currentTeam.inventory?.standard ?? 0,
      flourStock: initialFlour,
      sugarStock: initialSugar,
      eggsStock: initialEggs,
      cocoaStock: initialCocoa,
      deliveries: currentTeam.deliveries ?? [],
      contracts: currentTeam.contracts ?? getInitialContracts(),
      stations: currentTeam.stations ?? JSON.parse(JSON.stringify(DEFAULT_STATIONS)),
      flourOrderQty: currentTeam.flourOrderQty ?? 2000,
      flourROP: currentTeam.flourROP ?? 500,
      sugarOrderQty: currentTeam.sugarOrderQty ?? 1500,
      sugarROP: currentTeam.sugarROP ?? 400,
      eggsOrderQty: currentTeam.eggsOrderQty ?? 1200,
      eggsROP: currentTeam.eggsROP ?? 300,
      cocoaOrderQty: currentTeam.cocoaOrderQty ?? 800,
      cocoaROP: currentTeam.cocoaROP ?? 200,
      tick: currentTeam.tick ?? session?.currentRound ?? 1,
      lastDemand: 0,
      lastSold: 0,
      lastStockout: 0,
      lastRevenue: 0,
      satisfaction: currentTeam.satisfaction ?? 100,
      ropFiredThisTick: false
    };

    setGameState(initialState);
    lastWrittenStateRef.current = {
      balance: initialState.balance,
      flourStock: initialState.flourStock,
      sugarStock: initialState.sugarStock,
      eggsStock: initialState.eggsStock,
      cocoaStock: initialState.cocoaStock,
      satisfaction: initialState.satisfaction,
    };
  }, [currentTeam?.id]);

  // Start/stop game loop based on session status
  useEffect(() => {
    if (session?.status === 'active' && gameState) {
      setGameRunning(true);
    } else {
      setGameRunning(false);
    }
  }, [session?.status, !!gameState]);

  // Sync remote changes (e.g. from instructor intervention or database initialization) back to local gameState
  useEffect(() => {
    if (!currentTeam || !gameState) return;
    
    const lastWritten = lastWrittenStateRef.current;
    let needsUpdate = false;
    const nextState = { ...gameState };
    
    if (lastWritten.balance === undefined || (currentTeam.balance !== lastWritten.balance && currentTeam.balance !== gameState.balance)) {
      nextState.balance = currentTeam.balance;
      nextState.initialCash = currentTeam.initialCash ?? currentTeam.balance;
      needsUpdate = true;
    }
    if (lastWritten.flourStock === undefined || (currentTeam.flourStock !== lastWritten.flourStock && currentTeam.flourStock !== gameState.flourStock)) {
      nextState.flourStock = currentTeam.flourStock ?? nextState.flourStock;
      needsUpdate = true;
    }
    if (lastWritten.sugarStock === undefined || (currentTeam.sugarStock !== lastWritten.sugarStock && currentTeam.sugarStock !== gameState.sugarStock)) {
      nextState.sugarStock = currentTeam.sugarStock ?? nextState.sugarStock;
      needsUpdate = true;
    }
    if (lastWritten.eggsStock === undefined || (currentTeam.eggsStock !== lastWritten.eggsStock && currentTeam.eggsStock !== gameState.eggsStock)) {
      nextState.eggsStock = currentTeam.eggsStock ?? nextState.eggsStock;
      needsUpdate = true;
    }
    if (lastWritten.cocoaStock === undefined || (currentTeam.cocoaStock !== lastWritten.cocoaStock && currentTeam.cocoaStock !== gameState.cocoaStock)) {
      nextState.cocoaStock = currentTeam.cocoaStock ?? nextState.cocoaStock;
      needsUpdate = true;
    }
    if (lastWritten.satisfaction === undefined || (currentTeam.satisfaction !== lastWritten.satisfaction && currentTeam.satisfaction !== gameState.satisfaction)) {
      nextState.satisfaction = currentTeam.satisfaction ?? nextState.satisfaction;
      needsUpdate = true;
    }
    
    // Check if inputs (OrderQty and ROP) were changed externally (e.g., intervention)
    if (currentTeam.flourOrderQty !== undefined && currentTeam.flourOrderQty !== gameState.flourOrderQty) {
      nextState.flourOrderQty = currentTeam.flourOrderQty;
      needsUpdate = true;
    }
    if (currentTeam.flourROP !== undefined && currentTeam.flourROP !== gameState.flourROP) {
      nextState.flourROP = currentTeam.flourROP;
      needsUpdate = true;
    }
    if (currentTeam.sugarOrderQty !== undefined && currentTeam.sugarOrderQty !== gameState.sugarOrderQty) {
      nextState.sugarOrderQty = currentTeam.sugarOrderQty;
      needsUpdate = true;
    }
    if (currentTeam.sugarROP !== undefined && currentTeam.sugarROP !== gameState.sugarROP) {
      nextState.sugarROP = currentTeam.sugarROP;
      needsUpdate = true;
    }
    if (currentTeam.eggsOrderQty !== undefined && currentTeam.eggsOrderQty !== gameState.eggsOrderQty) {
      nextState.eggsOrderQty = currentTeam.eggsOrderQty;
      needsUpdate = true;
    }
    if (currentTeam.eggsROP !== undefined && currentTeam.eggsROP !== gameState.eggsROP) {
      nextState.eggsROP = currentTeam.eggsROP;
      needsUpdate = true;
    }
    if (currentTeam.cocoaOrderQty !== undefined && currentTeam.cocoaOrderQty !== gameState.cocoaOrderQty) {
      nextState.cocoaOrderQty = currentTeam.cocoaOrderQty;
      needsUpdate = true;
    }
    if (currentTeam.cocoaROP !== undefined && currentTeam.cocoaROP !== gameState.cocoaROP) {
      nextState.cocoaROP = currentTeam.cocoaROP;
      needsUpdate = true;
    }

    if (needsUpdate) {
      setGameState(nextState);
      lastWrittenStateRef.current = {
        ...lastWritten,
        balance: currentTeam.balance,
        flourStock: currentTeam.flourStock,
        sugarStock: currentTeam.sugarStock,
        eggsStock: currentTeam.eggsStock,
        cocoaStock: currentTeam.cocoaStock,
        satisfaction: currentTeam.satisfaction,
      };
    }
  }, [
    currentTeam?.balance, 
    currentTeam?.flourStock, 
    currentTeam?.sugarStock, 
    currentTeam?.eggsStock, 
    currentTeam?.cocoaStock, 
    currentTeam?.satisfaction,
    currentTeam?.flourOrderQty,
    currentTeam?.flourROP,
    currentTeam?.sugarOrderQty,
    currentTeam?.sugarROP,
    currentTeam?.eggsOrderQty,
    currentTeam?.eggsROP,
    currentTeam?.cocoaOrderQty,
    currentTeam?.cocoaROP
  ]);

  // Sync session active settings / db modifications back to gameState
  useEffect(() => {
    if (!currentTeam || !gameState) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stations: currentTeam.stations ?? prev.stations,
        contracts: currentTeam.contracts ?? prev.contracts,
        deliveries: currentTeam.deliveries ?? prev.deliveries,
      };
    });
  }, [currentTeam?.stations, currentTeam?.contracts, currentTeam?.deliveries]);

  // ─── UNIFIED LOCAL GAME LOOP & COUNTDOWN TIMER (1 DAY = 20 SECONDS) ───
  const runLocalTick = () => {
    try {
      const s = stateRef.current;
      if (!s) return;

      // Check end condition: 365 days
      if (s.tick >= 365) {
        setGameRunning(false);
        setDismissEndedModal(false);
        if (session?.id && currentTeam?.id) {
          if (isDirectPlay) {
            updateSession({ status: 'ended' });
          } else {
            updateDoc(doc(db, `sessions/${session.id}/teams/${currentTeam.id}`), {
              status: 'ended'
            }).catch(console.error);
          }
        }
        return;
      }

      const params = session?.settings?.parameters ?? DEFAULT_PARAMETERS;
      const LEAD_TIME = params.baseLeadTime ?? 1;
      const RM_PRICE = params.rawMaterialUnitPrice ?? 8;
      const STORAGE_COST = params.storageCost ?? 1;
      const SELLING_PRICE = params.products?.[0]?.sellingPrice ?? 20;
      const PRODUCTION_COST = params.products?.[0]?.productionCost ?? 2;
      const BACKORDER_PENALTY = params.backorderPenalty ?? 2;

      const event = session?.activeEvent;

      // ── 1. Deliveries arrive ──
      const arriving = s.deliveries.filter(d => d.roundArriving <= s.tick);
      const stillPending = s.deliveries.filter(d => d.roundArriving > s.tick);

      let flour = s.flourStock;
      let sugar = s.sugarStock;
      let eggs = s.eggsStock;
      let cocoa = s.cocoaStock;

      arriving.forEach(d => {
        const item = d.item || 'flour';
        if (item === 'flour') flour += d.quantity;
        else if (item === 'sugar') sugar += d.quantity;
        else if (item === 'eggs') eggs += d.quantity;
        else if (item === 'cocoa') cocoa += d.quantity;
      });

      // ── 2. Production ──
      let mixingCap = (s.stations.mixing?.active ?? 2) * (s.stations.mixing?.capacityPerMachine ?? 54);
      let bottlingCap = (s.stations.bottling?.active ?? 3) * (s.stations.bottling?.capacityPerMachine ?? 24);
      let icingCap = (s.stations.icing?.active ?? 1) * (s.stations.icing?.capacityPerMachine ?? 55);
      let packagingCap = (s.stations.packaging?.active ?? 1) * (s.stations.packaging?.capacityPerMachine ?? 216);

      if (event?.type === 'machine_breakdown') {
        const penaltyRatio = event.severity === 'low' ? 0.8 : event.severity === 'medium' ? 0.6 : 0.4;
        mixingCap = Math.round(mixingCap * penaltyRatio);
        bottlingCap = Math.round(bottlingCap * penaltyRatio);
        icingCap = Math.round(icingCap * penaltyRatio);
        packagingCap = Math.round(packagingCap * penaltyRatio);
      }

      const bottleneck = Math.min(mixingCap, bottlingCap, icingCap, packagingCap);
      const matLimit = Math.min(flour, sugar, cocoa);
      const produced = Math.min(bottleneck, matLimit);

      flour -= produced;
      sugar -= produced;
      cocoa -= produced;
      const productionCostThisTick = produced * PRODUCTION_COST;

      let inventory = s.inventory + produced;

      // ── 3. ROP checks ──
      let newDeliveries = [...stillPending];
      let rawMaterialPrice = RM_PRICE;
      if (event?.type === 'material_shortage') {
        if (event.severity === 'low') rawMaterialPrice *= 1.5;
        if (event.severity === 'medium') rawMaterialPrice *= 2.0;
        if (event.severity === 'high') rawMaterialPrice *= 3.0;
      }

      let rawMatOrderCost = 0;
      let ropFired = false;

      const checkAndOrder = (
        stock: number, rop: number, qty: number, item: Delivery['item']
      ) => {
        const inFlight = newDeliveries
          .filter(d => d.item === item || (!d.item && item === 'flour'))
          .reduce((sum, d) => sum + d.quantity, 0);
        if (stock + inFlight <= rop && qty > 0) {
          newDeliveries.push({ roundArriving: s.tick + LEAD_TIME, quantity: qty, item });
          rawMatOrderCost += qty * rawMaterialPrice + 100;
          ropFired = true;
        }
      };

      checkAndOrder(flour, s.flourROP, s.flourOrderQty, 'flour');
      checkAndOrder(sugar, s.sugarROP, s.sugarOrderQty, 'sugar');
      checkAndOrder(eggs, s.eggsROP, s.eggsOrderQty, 'eggs');
      checkAndOrder(cocoa, s.cocoaROP, s.cocoaOrderQty, 'cocoa');

      // ── 4. Contracts ──
      const updatedContracts = s.contracts.map(c => {
        if (c.status === 'pending' && (s.tick + 1) >= c.appearsAtDay) {
          return { ...c, status: 'offered' as const };
        }
        return c;
      });

      let contractRevenueThisTick = 0;
      let totalContractDemanded = 0;
      let totalContractDelivered = 0;

      const activeContracts = updatedContracts.filter(
        c => c.status === 'accepted' && s.tick >= c.beginsAtDay && s.tick <= c.endsAtDay
      );
      activeContracts.forEach(c => {
        const demand = c.dailyDemand;
        totalContractDemanded += demand;
        const delivered = Math.min(inventory, demand);
        inventory -= delivered;
        contractRevenueThisTick += delivered * c.pricePerUnit;
        totalContractDelivered += delivered;
        c.deliveredCount += delivered;
        c.demandedCount += demand;
      });

      // Contract Expiries & compliance penalties
      let contractPenaltiesThisTick = 0;
      const finalContracts = updatedContracts.map(c => {
        if (c.status === 'accepted' && s.tick === c.endsAtDay) {
          const fillRate = c.demandedCount > 0 ? (c.deliveredCount / c.demandedCount) : 0;
          const targetRequired = c.fillRateRequired / 100;
          if (fillRate < targetRequired) {
            contractPenaltiesThisTick += c.fillRatePenalty;
          }
          return { ...c, status: 'finished' as const };
        }
        return c;
      });

      // ── 5. Retail demand ──
      const calculatedDemands = calculateDemand(s.tick, 0, event);
      const demand = calculatedDemands['standard'] || 100;
      const sold = Math.min(inventory, demand);
      const stockout = demand - sold;
      inventory -= sold;

      const salesRevenueThisTick = sold * SELLING_PRICE;
      const backorderCost = stockout * BACKORDER_PENALTY;

      // ── 6. Holding cost ──
      const holdingCost = inventory * STORAGE_COST;

      // ── 7. Machine fixed cost ──
      const totalActiveMachines =
        (s.stations.mixing?.active ?? 0) +
        (s.stations.bottling?.active ?? 0) +
        (s.stations.icing?.active ?? 0) +
        (s.stations.packaging?.active ?? 0);
      const machineCostThisTick = totalActiveMachines * 50;

      // ── 8. Compute Total Cash ──
      const totalCostsThisTick = productionCostThisTick + rawMatOrderCost + holdingCost + backorderCost + machineCostThisTick + contractPenaltiesThisTick;
      const newSalesRevenue = s.salesRevenue + salesRevenueThisTick;
      const newContractRevenue = s.contractRevenue + contractRevenueThisTick;
      const newTotalCostsPaid = s.totalCostsPaid + totalCostsThisTick;
      const totalCash = s.initialCash + newSalesRevenue + newContractRevenue - newTotalCostsPaid;

      // Service Level Rating update
      const totalDayDemanded = totalContractDemanded + demand;
      const totalDayDelivered = totalContractDelivered + sold;
      const serviceLevelIndex = totalDayDemanded > 0 ? (totalDayDelivered / totalDayDemanded) : 1;
      const nextSatisfaction = Math.max(0, Math.min(100, Math.round((s.satisfaction * 0.9) + (serviceLevelIndex * 10))));



      // ── 10. Set ALL state in ONE call ──
      const newState: LocalGameState = {
        ...s,
        balance: totalCash,
        salesRevenue: newSalesRevenue,
        contractRevenue: newContractRevenue,
        totalCostsPaid: newTotalCostsPaid,
        inventory,
        flourStock: flour,
        sugarStock: sugar,
        eggsStock: eggs,
        cocoaStock: cocoa,
        deliveries: newDeliveries,
        contracts: finalContracts,
        tick: s.tick + 1,
        lastDemand: demand,
        lastSold: sold,
        lastStockout: stockout,
        lastRevenue: salesRevenueThisTick + contractRevenueThisTick,
        satisfaction: nextSatisfaction,
        ropFiredThisTick: ropFired
      };

      setGameState(newState);

      // ── 11. Flash animation ──
      if (totalCash !== s.balance) {
        setCashFlash(totalCash > s.balance ? 'gain' : 'loss');
        setTimeout(() => setCashFlash(null), 600);
      }

      // ── 12. Write to Firestore / Context (non-blocking side effect) ──
      if (session?.id && currentTeam?.id) {
        lastWrittenStateRef.current = {
          balance: totalCash,
          flourStock: flour,
          sugarStock: sugar,
          eggsStock: eggs,
          cocoaStock: cocoa,
          satisfaction: nextSatisfaction,
        };

        if (isDirectPlay) {
          updateTeamState(currentTeam.id, {
            balance: totalCash,
            inventory: { standard: inventory },
            flourStock: flour,
            sugarStock: sugar,
            eggsStock: eggs,
            cocoaStock: cocoa,
            deliveries: newDeliveries,
            contracts: finalContracts,
            salesRevenue: newSalesRevenue,
            contractRevenue: newContractRevenue,
            totalCostsPaid: newTotalCostsPaid,
            tick: s.tick + 1,
            satisfaction: nextSatisfaction,
          });
          updateSession({
            currentRound: s.tick + 1,
            status: (s.tick + 1) > 365 ? 'ended' : 'active'
          });
        } else {
          setDoc(
            doc(db, `sessions/${session.id}/teams/${currentTeam.id}`),
            {
              balance: totalCash,
              inventory: { standard: inventory },
              flourStock: flour,
              sugarStock: sugar,
              eggsStock: eggs,
              cocoaStock: cocoa,
              deliveries: newDeliveries,
              contracts: finalContracts,
              salesRevenue: newSalesRevenue,
              contractRevenue: newContractRevenue,
              totalCostsPaid: newTotalCostsPaid,
              tick: s.tick + 1,
              satisfaction: nextSatisfaction,
              lastUpdated: serverTimestamp()
            },
            { merge: true }
          ).catch(console.error);
        }
      }

    } catch (err) {
      console.error('Tick error:', err);
    }
  };

  useEffect(() => {
    if (!gameRunning) return;

    setCountdown(20);

    const timerId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          runLocalTick();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameRunning, session?.id, currentTeam?.id]);

  // Audio Context synth beep player
  const playBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleOvertimeReward = (addedCash: number, addedRM: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        balance: prev.balance + addedCash,
        flourStock: prev.flourStock + Math.round(0.35 * addedRM),
        sugarStock: prev.sugarStock + Math.round(0.25 * addedRM),
        eggsStock: prev.eggsStock + Math.round(0.20 * addedRM),
        cocoaStock: prev.cocoaStock + Math.round(0.20 * addedRM),
      };
    });
  };

  const handleApplyOrderChanges = async () => {
    playBeep(880, 'sine', 0.1);
    setGameState(prev => prev ? {
      ...prev,
      flourOrderQty: flourQ,
      flourROP: flourR,
      sugarOrderQty: sugarQ,
      sugarROP: sugarR,
      eggsOrderQty: eggsQ,
      eggsROP: eggsR,
      cocoaOrderQty: cocoaQ,
      cocoaROP: cocoaR
    } : prev);
    try {
      await updateProcurementSettingsEx({
        flourQ: parseInt(String(flourQ), 10) || 0, 
        flourR: parseInt(String(flourR), 10) || 0,
        sugarQ: parseInt(String(sugarQ), 10) || 0, 
        sugarR: parseInt(String(sugarR), 10) || 0,
        eggsQ: parseInt(String(eggsQ), 10) || 0, 
        eggsR: parseInt(String(eggsR), 10) || 0,
        cocoaQ: parseInt(String(cocoaQ), 10) || 0, 
        cocoaR: parseInt(String(cocoaR), 10) || 0
      });
      showToast("Order changes applied to pantry!");
    } catch (err) {
      showToast("Failed to apply order changes.");
    }
  };

  const handleApplyOperations = async () => {
    playBeep(660, 'triangle', 0.1);
    try {
      if (!currentTeam?.id || !session?.id) return;
      
      await updateActiveMachines('mixing', mixingRunning);
      await updateActiveMachines('bottling', bakingRunning);
      await updateActiveMachines('icing', icingRunning);
      await updateActiveMachines('packaging', packingRunning);
      
      showToast("Operations applied! Floor speeds updated.");
    } catch (err) {
      showToast("Failed to update active machines.");
    }
  };

  const handleBuyMachineClick = async (stationId: 'mixing' | 'bottling' | 'icing' | 'packaging', name: string, price: number) => {
    if (!currentTeam) return;
    const currentBalance = gameState?.balance ?? currentTeam.balance;
    if (currentBalance < price) {
      playBeep(220, 'sawtooth', 0.2);
      showToast(`Insufficient funds for ${name}! Costs ₹${price.toLocaleString()}.`);
      return;
    }
    
    if (window.confirm(`Buy another ${name} for ₹${price.toLocaleString()}?`)) {
      playBeep(523, 'sine', 0.15);
      try {
        await buyMachine(stationId);
        showToast(`Purchased a new ${name}!`);
      } catch (e) {
        showToast("Error purchasing machine.");
      }
    }
  };

  if (!session || !currentTeam) {
    return (
      <div className="min-h-screen bg-[#ffeef2] flex items-center justify-center font-sans text-[#4a2c11] p-6">
        <div className="bg-white border-4 border-[#4a2c11] rounded-2xl p-8 max-w-md w-full text-center shadow-[0_8px_0_#4a2c11]">
          <span className="text-6xl animate-bounce block">🧁</span>
          <h2 className="text-2xl font-black uppercase mt-4">Warming Up Telemetry...</h2>
          <p className="text-sm mt-2 text-[#8c7662]">Establishing pipeline connections with muffin plant mainframe...</p>
        </div>
      </div>
    );
  }

  // Lobby/Waiting Screen
  if (session.status === 'waiting') {
    return (
      <div className="min-h-screen bg-[#ffeef2] flex items-center justify-center font-sans text-[#4a2c11] p-6">
        <div className="bg-white border-4 border-[#4a2c11] rounded-2xl p-8 max-w-lg w-full text-center shadow-[0_8px_0_#4a2c11] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-pink-400 via-red-300 to-yellow-300" />
          <span className="text-7xl block my-4 animate-pulse">🧁</span>
          <h1 className="text-3xl font-black uppercase tracking-tight">Muffin Factory</h1>
          <p className="text-sm text-[#8c7662] uppercase tracking-wider font-bold mt-1">Lobby Waiting Room</p>
          
          <div className="my-6 p-4 bg-[#fff9c4]/50 border-2 border-dashed border-[#4a2c11] rounded-xl text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#8c7662]">TEAM NAME:</span>
              <span className="font-black text-emerald-700 uppercase">{currentTeam.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#8c7662]">SESSION ID:</span>
              <span className="font-mono font-black">{session.code}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#8c7662]">STARTING TOTAL CASH:</span>
              <span className="font-black text-indigo-700">₹{currentTeam.balance.toLocaleString()}</span>
            </div>
          </div>
          
          <p className="text-xs text-[#8c7662] animate-pulse">
            The professor will start the simulation soon. Get ready to cook!
          </p>

          {isDirectPlay && (
            <button 
              onClick={() => setIsDirectPlay(false)}
              className="mt-6 px-6 py-2 bg-red-600 text-white font-black uppercase border-3 border-[#4a2c11] rounded-xl hover:bg-red-700 active:translate-y-1 shadow-[0_4px_0_#4a2c11] transition-all text-xs"
            >
              Exit Sandbox Lobby
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active Station Configuration variables
  const stations = currentTeam.stations || {
    mixing: { owned: 3, active: 2, capacityPerMachine: 24, purchasePrice: 20000 },
    bottling: { owned: 3, active: 3, capacityPerMachine: 48, purchasePrice: 30000 },
    icing: { owned: 2, active: 1, capacityPerMachine: 55, purchasePrice: 60000 },
    packaging: { owned: 1, active: 1, capacityPerMachine: 72, purchasePrice: 100000 }
  };

  const flourStock = currentTeam.flourStock ?? Math.round(0.35 * (currentTeam.rawMaterials || 0));
  const sugarStock = currentTeam.sugarStock ?? Math.round(0.25 * (currentTeam.rawMaterials || 0));
  const eggsStock = currentTeam.eggsStock ?? Math.round(0.20 * (currentTeam.rawMaterials || 0));
  const cocoaStock = currentTeam.cocoaStock ?? Math.round(0.20 * (currentTeam.rawMaterials || 0));

  const mixingOwned = stations.mixing.owned;
  const bakingOwned = stations.bottling.owned;
  const icingOwned = stations.icing?.owned ?? 2;
  const packingOwned = stations.packaging.owned;

  const mixingPrice = stations.mixing?.purchasePrice || DEFAULT_STATIONS.mixing.purchasePrice;
  const bakingPrice = stations.bottling?.purchasePrice || DEFAULT_STATIONS.bottling.purchasePrice;
  const icingPrice = stations.icing?.purchasePrice || DEFAULT_STATIONS.icing.purchasePrice;
  const packingPrice = stations.packaging?.purchasePrice || DEFAULT_STATIONS.packaging.purchasePrice;

  const isAnyStationOffline = mixingRunning === 0 || bakingRunning === 0 || icingRunning === 0 || packingRunning === 0;

  // Calculate live progress for Simulated Day Clock (e.g. 08:45 AM) based on local 20s countdown
  const elapsedProgress = Math.min(1.0, Math.max(0, (20 - countdown) / 20));
  const startHour = 8;
  const endHour = 18;
  const totalHours = endHour - startHour;
  const currentHourDecimal = startHour + elapsedProgress * totalHours;
  
  const h = Math.floor(currentHourDecimal);
  const m = Math.floor((currentHourDecimal % 1) * 60);
  const isPm = h >= 12;
  const displayH = h > 12 ? h - 12 : h;
  const simulatedTimeStr = `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;

  // Calculate Rank among all teams
  const sortedTeams = [...allTeams].sort((a, b) => b.balance - a.balance);
  const teamRank = sortedTeams.findIndex(t => t.name === currentTeam.name) + 1;

  // Lead time calculations
  const defaultLeadTime = session.settings?.roundDuration ? 1.2 : 1.2;

  // Conveyor belt animation speed
  const conveyorSpeed = isAnyStationOffline ? 0 : Math.max(3, 8 - (mixingRunning + bakingRunning + icingRunning + packingRunning));

  // Round results summary
  const lastResult = results && results.length > 0 ? results[results.length - 1] : null;
  const retailSold = lastResult ? (lastResult.soldQty?.standard || 0) : 0;
  const retailMissed = lastResult ? (lastResult.missedDemand?.standard || 0) : 0;
  const totalRetailDemand = retailSold + retailMissed;
  
  const fillRate = gameState?.satisfaction ?? currentTeam.satisfaction ?? 100;
  const revenueToday = lastResult ? lastResult.revenue : 0;

  return (
    <div className="h-screen bg-[#ffeef2] text-[#4a2c11] font-sans selection:bg-pink-300 selection:text-[#4a2c11] overflow-hidden relative p-3 flex flex-col justify-start select-none font-bold">
      
      {/* ─── Global Scenario Pause/End Interstitials ─── */}
      <AnimatePresence>
        {session.status === 'paused' && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-6 text-center select-none text-white font-sans">
            <div className="max-w-md bg-white text-[#4a2c11] border-4 border-[#4a2c11] p-8 rounded-2xl shadow-2xl space-y-5">
              <span className="text-7xl block animate-bounce">🔒</span>
              <h3 className="text-xl font-black uppercase text-[#4a2c11] tracking-wide">Simulation Paused</h3>
              <p className="text-xs font-mono text-[#8c7662] uppercase tracking-widest">{">>>"} ORCHESTRATOR PAUSE SIGNAL ACTIVE ...</p>
              <p className="text-sm font-serif italic text-gray-700 leading-relaxed">
                "The coordinator has paused the arena workspace to review classroom statistics. Focus on the projector screen."
              </p>
            </div>
          </div>
        )}

        {(session.status === 'ended' || (gameState && gameState.tick >= 365)) && !dismissEndedModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center text-white font-sans">
            <div className="max-w-md bg-white text-[#4a2c11] border-4 border-[#4a2c11] p-8 rounded-2xl shadow-2xl space-y-6 relative">
              <button 
                onClick={() => { playBeep(440, 'sine', 0.05); setDismissEndedModal(true); }}
                className="absolute top-4 right-4 qty-control-btn hover:bg-gray-100"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-7xl block animate-bounce">🏆</span>
              <h2 className="text-2xl font-black uppercase text-[#4a2c11]">Baking Plant Concluded</h2>
              <div className="bg-[#ffeef2] border-3 border-[#4a2c11] p-4 rounded-xl text-left space-y-2.5 font-mono text-xs text-[#4a2c11] font-bold">
                <div className="flex justify-between border-b border-[#4a2c11]/10 pb-1.5">
                  <span>TEAM:</span>
                  <span className="uppercase text-emerald-800">{currentTeam.name}</span>
                </div>
                <div className="flex justify-between border-b border-[#4a2c11]/10 pb-1.5">
                  <span>FINAL CORPORATE VALUE:</span>
                  <span className="text-indigo-800">₹{(gameState?.balance ?? currentTeam.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>FINAL SCORE RATING:</span>
                  <span>{gameState?.satisfaction ?? currentTeam.satisfaction}% Rating</span>
                </div>
              </div>
              <p className="text-xs text-[#8c7662] uppercase tracking-wider leading-relaxed">
                Look at the master leaderboard projection to examine final ranks!
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

       <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .gear-spin-active {
          display: inline-block;
          animation: gear-spin 4s linear infinite;
          transform-origin: center;
        }
        .muffin-brand-name {
          font-family: 'Outfit', 'Segoe UI', sans-serif;
          letter-spacing: -0.02em;
        }
        .muffin-preview-container {
          width: 100%;
          box-sizing: border-box;
        }
        .qty-control {
          display: flex;
          align-items: center;
          gap: 5px;
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
        .qty-control-btn {
          width: 21px;
          height: 21px;
          background-color: #ffffff;
          border: 2px solid #4a2c11;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 1.2px 0 #4a2c11;
          font-size: 11px;
          user-select: none;
          transition: transform 0.08s, box-shadow 0.08s;
        }
        .qty-control-btn:active {
          transform: translateY(1.2px);
          box-shadow: 0 0.4px 0 #4a2c11;
        }
        .qty-lbl-large {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          min-width: 32px;
          text-align: center;
          font-weight: 900;
          color: #4a2c11;
        }
        .input-rop-large {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 900;
          border: 2px solid #4a2c11;
          border-radius: 5px;
          width: 46px;
          height: 21px;
          text-align: center;
          font-size: 10px;
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
        .lead-lbl-large {
          font-size: 11px;
          font-weight: 800;
          color: #8c7662;
        }
        .muffin-btn {
          width: 100%;
          border: 3px solid #4a2c11;
          border-radius: 12px;
          padding: 14px;
          font-weight: 900;
          text-transform: uppercase;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 4px 0 #4a2c11;
          font-size: 16px;
          margin-top: 10px;
          transition: transform 0.08s, box-shadow 0.08s;
        }
        .muffin-btn:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #4a2c11;
        }
        .muffin-progress-bg {
          width: 90px;
          height: 18px;
          background-color: #f1ebd9;
          border: 2.5px solid #4a2c11;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        .muffin-progress-fill {
          height: 100%;
          border-radius: 4px;
        }
        .blueprint-canvas {
          background-color: #d2e9f5;
          border: 3px solid #4a2c11;
          border-radius: 12px;
          width: 100%;
          height: 100%;
          flex: 1;
          position: relative;
          overflow: hidden;
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
          padding: 2.5px 5px;
          text-transform: uppercase;
        }
        .machine-status-badge .lbl-state {
          color: #ffffff;
          padding: 2.5px 5px;
          text-transform: uppercase;
          min-width: 22px;
          text-align: center;
        }
        .machine-status-badge .lbl-state.on {
          background-color: #89b873;
        }
        .machine-status-badge .lbl-state.off {
          background-color: #e07a5f;
        }
        .dashboard-toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1a1a18;
          color: #ffffff;
          border-radius: 30px;
          padding: 8px 20px;
          font-size: 12px;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 2px solid #fff;
        }
        .muffin-badge-on {
          background-color: #89b873;
          color: white;
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 900;
          border: 2px solid #4a2c11;
        }
        .muffin-badge-off {
          background-color: #e07a5f;
          color: white;
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 900;
          border: 2px solid #4a2c11;
        }
        .muffin-card-header {
          padding: 14px 18px;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #ffffff;
          border-bottom: 4px solid #4a2c11;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .revenue-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr) 130px;
          gap: 10px;
          align-items: stretch;
        }
        @media (max-width: 1024px) {
          .revenue-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}} />

      {/* Internal Notification Toast */}
      {toastMsg && <div className="dashboard-toast">🧁 {toastMsg}</div>}

      {/* ─── Header Bar ─── */}
      <header className="bg-[#fceeed] border-4 border-[#4a2c11] rounded-2xl p-2.5 px-4 mb-3 shadow-[0_3px_0_#4a2c11] flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-4xl">🧁</span>
          <div className="flex flex-col justify-center leading-none">
            <div className="text-[17px] font-black uppercase text-[#4a2c11] leading-[1] font-sans tracking-tight">Muffin Factory</div>
            <div className="text-[17px] font-black uppercase text-[#4a2c11] leading-[1] font-sans tracking-tight">Factory</div>
            <div className="text-[8px] font-black tracking-widest text-[#e98fa8] uppercase mt-1 leading-[1]">{isDirectPlay ? 'Solo Chef Mode' : 'Class Team Arena'}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Back to Website Button */}
          <button 
            onClick={() => { playBeep(329, 'sine', 0.1); handleExit(); }}
            className="header-btn"
            style={{ backgroundColor: '#fff0f0', borderColor: '#c62828', color: '#c62828' }}
          >
            <span className="text-xl">←</span>
            <span className="text-[11px] font-black tracking-wider">Back to Website</span>
          </button>

          {(session.status === 'ended' || (gameState && gameState.tick >= 365)) && (
            <button 
              onClick={() => { playBeep(440, 'sine', 0.05); setDismissEndedModal(false); }}
              className="header-btn"
              style={{ backgroundColor: '#eef2ff', borderColor: '#4f46e5', color: '#4f46e5' }}
            >
              <span className="text-sm">🏆</span>
              <span className="text-[11px] font-black tracking-wider">View Results</span>
            </button>
          )}

          {/* Day / Time Pill */}
          <div className="header-pill">
            <span className="text-xl">📅</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[11px] font-extrabold text-[#4a2c11] uppercase">Day {Math.min(gameState?.tick ?? session.currentRound, 365).toString().padStart(2, '0')}</span>
              <span className="text-[9px] font-mono text-[#8c7662] mt-0.5">{simulatedTimeStr}</span>
            </div>
          </div>

          {/* Total Cash Pill */}
          <div className="header-pill">
            <span className="text-xl">💵</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Total Cash</span>
              <span className="text-[12px] font-black text-[#4a2c11] mt-0.5">₹{(gameState?.balance ?? currentTeam.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Current Revenue Pill */}
          <div className="header-pill">
            <span className="text-xl">📈</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Sales Revenue (Cumulative)</span>
              <span className="text-[12px] font-black text-[#4db6ac] mt-0.5">₹{(gameState?.salesRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <div className="w-12 h-2 bg-[#b2dfdb] border border-[#4a2c11] rounded-full overflow-hidden shrink-0">
                  <div 
                    className={`h-full transition-all duration-1000 ease-linear ${countdown <= 5 ? 'bg-[#e53935]' : 'bg-[#4db6ac]'}`}
                    style={{ width: `${(countdown / 20) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contracts Trigger Button */}
          <button 
            onClick={() => { playBeep(440, 'sine', 0.05); setShowContractsModal(true); }}
            className="header-btn"
          >
            <span className="text-xl">📋</span>
            <span className="text-[11px] font-black tracking-wider text-[#4a2c11]">Contracts</span>
          </button>

          {/* Overtime Dash Trigger Button */}
          <button 
            onClick={() => { playBeep(440, 'sine', 0.05); setShowOvertimeModal(true); }}
            className="header-btn"
            style={{ backgroundColor: '#fdf2e9', borderColor: '#e65100', color: '#e65100' }}
          >
            <span className="text-xl">🎮</span>
            <span className="text-[11px] font-black tracking-wider">Overtime Dash</span>
          </button>

          {/* Rank Pill */}
          <div className="header-pill">
            <span className="text-xl">🏆</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Rank</span>
              <span className="text-[12px] font-black text-[#4a2c11] mt-0.5">#{teamRank}</span>
            </div>
          </div>

          {/* Team Name Pill */}
          <div className="header-pill">
            <span className="text-xl">👨‍🍳</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] font-bold text-[#8c7662] uppercase tracking-wider">Team</span>
              <span className="text-[11px] font-black text-[#4a2c11] uppercase truncate max-w-[120px] mt-0.5">{currentTeam.name}</span>
            </div>
          </div>

          {/* Help button */}
          <button
            onClick={() => { playBeep(523, 'sine', 0.1); showToast("How to Play: Run your factory by making reorder and scheduling decisions!"); }}
            className="header-icon-btn"
            style={{ backgroundColor: '#f48fb1', color: 'white' }}
            title="Help"
          >
            ❓
          </button>

          {/* Sounds Toggle */}
          <button 
            onClick={() => { setSoundEnabled(!soundEnabled); playBeep(523, 'sine', 0.1); }}
            className="header-icon-btn"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Direct Play/Sandbox toggle */}
          {isDirectPlay && (
            <button 
              onClick={() => { playBeep(329, 'sine', 0.1); setIsDirectPlay(false); }}
              className="bg-red-650 text-white text-[10px] px-3 py-2 uppercase rounded-lg border-2 border-[#4a2c11] shadow-[0_2px_0_#4a2c11] hover:bg-red-700 active:translate-y-0.5"
            >
              Exit Sandbox
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Grid Layout ─── */}
      <main className="grid grid-cols-1 lg:grid-cols-[370px_1fr] gap-3 w-full flex-1 min-h-0 overflow-hidden">
        
        {/* Left Side Controls Panel */}
        <div className="space-y-3 flex flex-col h-full min-h-0">
          
          {/* Panel 1: Raw Material Management */}
          <div className="bg-white border-[3px] border-[#4a2c11] rounded-xl shadow-[0_3px_0_#4a2c11] overflow-hidden flex flex-col min-h-0 flex-[1.1]">
            <div className="bg-[#89b873] muffin-card-header text-white" style={{ padding: '6px 12px', fontSize: '12px', borderBottomWidth: '3px' }}>
              <span className="text-[11px] uppercase tracking-wider font-extrabold">Raw Material Management</span>
              <span className="text-sm">🌾</span>
            </div>
            
            <div className="p-1.5 space-y-1 flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e6ccb2] text-[9.5px] uppercase tracking-wider text-[#8a7360] font-black whitespace-nowrap">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Order Qty</th>
                    <th className="pb-1 text-center">ROP</th>
                    <th className="pb-1 text-right">Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-[#e6ccb2] text-[12px] font-extrabold">
                  {/* Flour */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11] whitespace-nowrap">
                      <span>🥖</span> Flour (Stock: {Math.round(gameState?.flourStock ?? flourStock)})
                    </td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setFlourQ(p => Math.max(100, p - 100))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large">{flourQ.toLocaleString()}</span>
                        <button onClick={() => setFlourQ(p => Math.min(9900, p + 100))} className="qty-control-btn">+</button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <input 
                          type="number" 
                          value={flourR}
                          onChange={(e) => setFlourR(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="input-rop-large"
                        />
                        <button onClick={() => setFlourR(0)} className="text-[#c62828] text-[10px] font-black hover:scale-125 transition-transform" title="Clear">✕</button>
                      </div>
                    </td>
                    <td className="py-[1px] text-right lead-lbl-large font-mono whitespace-nowrap">1.2 Days</td>
                  </tr>
                  
                  {/* Sugar */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11] whitespace-nowrap">
                      <span>🥣</span> Sugar (Stock: {Math.round(gameState?.sugarStock ?? sugarStock)})
                    </td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setSugarQ(p => Math.max(100, p - 100))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large">{sugarQ.toLocaleString()}</span>
                        <button onClick={() => setSugarQ(p => Math.min(9900, p + 100))} className="qty-control-btn">+</button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <input 
                          type="number" 
                          value={sugarR}
                          onChange={(e) => setSugarR(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="input-rop-large"
                        />
                        <button onClick={() => setSugarR(0)} className="text-[#c62828] text-[10px] font-black hover:scale-125 transition-transform" title="Clear">✕</button>
                      </div>
                    </td>
                    <td className="py-[1px] text-right lead-lbl-large font-mono whitespace-nowrap">1.0 Days</td>
                  </tr>

                  {/* Cocoa */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11] whitespace-nowrap">
                      <span>🫙</span> Cocoa (Stock: {Math.round(gameState?.cocoaStock ?? cocoaStock)})
                    </td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setCocoaQ(p => Math.max(50, p - 50))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large">{cocoaQ.toLocaleString()}</span>
                        <button onClick={() => setCocoaQ(p => Math.min(9900, p + 50))} className="qty-control-btn">+</button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <input 
                          type="number" 
                          value={cocoaR}
                          onChange={(e) => setCocoaR(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="input-rop-large"
                        />
                        <button onClick={() => setCocoaR(0)} className="text-[#c62828] text-[10px] font-black hover:scale-125 transition-transform" title="Clear">✕</button>
                      </div>
                    </td>
                    <td className="py-[1px] text-right lead-lbl-large font-mono whitespace-nowrap">1.5 Days</td>
                  </tr>
                </tbody>
              </table>

              <button 
                onClick={async () => {
                  const btn = document.getElementById('apply-order-btn');
                  if (btn) btn.innerHTML = "Saving...";
                  await handleApplyOrderChanges();
                  if (btn) {
                    btn.innerHTML = "Saved! ✔";
                    btn.style.backgroundColor = "#78a562";
                    setTimeout(() => {
                      btn.innerHTML = "Apply Order Changes";
                      btn.style.backgroundColor = "";
                    }, 2000);
                  }
                }}
                id="apply-order-btn"
                className="muffin-btn bg-[#89b873] border-[#4a2c11] hover:bg-[#78a562] active:translate-y-0.5 block w-full text-center transition-colors"
                style={{ padding: '6px 12px', fontSize: '11px', marginTop: '6px', minHeight: 'auto', boxShadow: '0 2.5px 0 #4a2c11' }}
              >
                Apply Order Changes
              </button>

              {/* Pending Shipments */}
              <div className="mt-1 pt-1 border-t border-[#4a2c11]/10">
                <span className="text-[9px] uppercase font-black tracking-wider text-[#8c7662] block mb-0.5">📦 Pending Shipments</span>
                {((gameState?.deliveries ?? currentTeam.deliveries ?? []).length === 0) ? (
                  <div className="text-[9px] italic text-[#8c7662] text-center py-0.5">No orders in transit.</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(gameState?.deliveries ?? currentTeam.deliveries ?? []).map((d, idx) => {
                      const ticksRemaining = Math.max(0, d.roundArriving - (gameState?.tick ?? 1));
                      return (
                        <div key={idx} className="text-[8.5px] bg-[#f1ebd9] border border-[#4a2c11] rounded px-1 py-0.25 font-mono text-[#4a2c11] flex items-center gap-1 font-bold">
                          <span className="capitalize">{d.item || 'flour'}:</span>
                          <span>{d.quantity}</span>
                          <span className="text-indigo-600">({ticksRemaining}d)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel 2: Workfloor Activity */}
          <div className="bg-white border-[3px] border-[#4a2c11] rounded-xl shadow-[0_3px_0_#4a2c11] overflow-hidden flex flex-col min-h-0 flex-1">
            <div className="bg-[#9f7eb8] muffin-card-header text-white" style={{ padding: '6px 12px', fontSize: '12px', borderBottomWidth: '3px' }}>
              <span className="text-[11px] uppercase tracking-wider font-extrabold">Workfloor Activity</span>
              <span className={`text-sm ${mixingRunning + bakingRunning + icingRunning + packingRunning > 0 ? 'gear-spin-active' : ''}`}>⚙️</span>
            </div>

            <div className="p-1.5 space-y-1 flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e6ccb2] text-[9.5px] uppercase tracking-wider text-[#8a7360] font-black whitespace-nowrap">
                    <th className="pb-1">Machine</th>
                    <th className="pb-1 text-center">Running</th>
                    <th className="pb-1 text-center">Total</th>
                    <th className="pb-1 text-center">Capacity</th>
                    <th className="pb-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-[#e6ccb2] text-[12px] font-extrabold">
                  {/* Mixing */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11]">🥣 Mixing</td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setMixingRunning(p => Math.max(0, p - 1))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large" style={{ minWidth: '24px' }}>{mixingRunning}</span>
                        <button 
                          onClick={() => {
                            if (mixingRunning >= mixingOwned) {
                              handleBuyMachineClick('mixing', 'Mixer', mixingPrice);
                            } else {
                              setMixingRunning(p => p + 1);
                            }
                          }} 
                          className="qty-control-btn"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center text-[11.5px] font-black text-[#4a2c11]">{mixingOwned}</td>
                    <td className="py-[1px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9.5px] font-mono leading-none text-[#4a2c11]">{mixingOwned > 0 ? Math.round((mixingRunning / mixingOwned) * 100) : 0}%</span>
                        <div className="muffin-progress-bg w-[60px] h-[6px] mx-auto">
                          <div 
                            className="muffin-progress-fill bg-[#89b873] h-full"
                            style={{ width: `${mixingOwned > 0 ? (mixingRunning / mixingOwned) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-[1px] text-right">
                      <span className={mixingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {mixingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>

                  {/* Baking */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11]">🔥 Baking</td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setBakingRunning(p => Math.max(0, p - 1))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large" style={{ minWidth: '24px' }}>{bakingRunning}</span>
                        <button 
                          onClick={() => {
                            if (bakingRunning >= bakingOwned) {
                              handleBuyMachineClick('bottling', 'Baker', bakingPrice);
                            } else {
                              setBakingRunning(p => p + 1);
                            }
                          }} 
                          className="qty-control-btn"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center text-[11.5px] font-black text-[#4a2c11]">{bakingOwned}</td>
                    <td className="py-[1px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9.5px] font-mono leading-none text-[#4a2c11]">{bakingOwned > 0 ? Math.round((bakingRunning / bakingOwned) * 100) : 0}%</span>
                        <div className="muffin-progress-bg w-[60px] h-[6px] mx-auto">
                          <div 
                            className="muffin-progress-fill bg-[#ffb74d] h-full"
                            style={{ width: `${bakingOwned > 0 ? (bakingRunning / bakingOwned) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-[1px] text-right">
                      <span className={bakingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {bakingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>

                  {/* Icing */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11]">🧁 Icing</td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setIcingRunning(p => Math.max(0, p - 1))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large" style={{ minWidth: '24px' }}>{icingRunning}</span>
                        <button 
                          onClick={() => {
                            if (icingRunning >= icingOwned) {
                              handleBuyMachineClick('icing', 'Icer', icingPrice);
                            } else {
                              setIcingRunning(p => p + 1);
                            }
                          }} 
                          className="qty-control-btn"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center text-[11.5px] font-black text-[#4a2c11]">{icingOwned}</td>
                    <td className="py-[1px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9.5px] font-mono leading-none text-[#4a2c11]">{icingOwned > 0 ? Math.round((icingRunning / icingOwned) * 100) : 0}%</span>
                        <div className="muffin-progress-bg w-[60px] h-[6px] mx-auto">
                          <div 
                            className="muffin-progress-fill bg-[#f06292] h-full"
                            style={{ width: `${icingOwned > 0 ? (icingRunning / icingOwned) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-[1px] text-right">
                      <span className={icingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {icingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>

                  {/* Packaging */}
                  <tr>
                    <td className="py-[1px] flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#4a2c11]">📦 Packaging</td>
                    <td className="py-[1px]">
                      <div className="qty-control justify-center">
                        <button onClick={() => setPackingRunning(p => Math.max(0, p - 1))} className="qty-control-btn">-</button>
                        <span className="qty-lbl-large" style={{ minWidth: '24px' }}>{packingRunning}</span>
                        <button 
                          onClick={() => {
                            if (packingRunning >= packingOwned) {
                              handleBuyMachineClick('packaging', 'Packager', packingPrice);
                            } else {
                              setPackingRunning(p => p + 1);
                            }
                          }} 
                          className="qty-control-btn"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-[1px] text-center text-[11.5px] font-black text-[#4a2c11]">{packingOwned}</td>
                    <td className="py-[1px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9.5px] font-mono leading-none text-[#4a2c11]">{packingOwned > 0 ? Math.round((packingRunning / packingOwned) * 100) : 0}%</span>
                        <div className="muffin-progress-bg w-[60px] h-[6px] mx-auto">
                          <div 
                            className="muffin-progress-fill bg-[#4db6ac] h-full"
                            style={{ width: `${packingOwned > 0 ? (packingRunning / packingOwned) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-[1px] text-right">
                      <span className={packingRunning > 0 ? 'muffin-badge-on' : 'muffin-badge-off'}>
                        {packingRunning > 0 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <button 
                onClick={handleApplyOperations}
                className="muffin-btn bg-[#9f7eb8] border-[#4a2c11] hover:bg-[#8663a0] active:translate-y-0.5 block w-full text-center"
                style={{ padding: '6px 12px', fontSize: '11px', marginTop: '6px', minHeight: 'auto', boxShadow: '0 2.5px 0 #4a2c11' }}
              >
                Apply Operations
              </button>
            </div>
          </div>
        </div>

        {/* Right Column Factory Visual & Revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
          
          {/* Factory Floor Card */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 0, flex: 1.8, minHeight: 0 }}>
            {/* The header is now baked into the factory_floor_v2.jpg image inside AnimatedFactoryFloor */}

            <div style={{ padding: '0px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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

              <div style={{ border: '3px solid #4a2c11', boxShadow: '0 4px 0 #4a2c11', borderRadius: '12px', flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffdfa', overflow: 'hidden', position: 'relative' }}>
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
          <div className="muffin-card" style={{ border: '3px solid #4a2c11', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 0 #4a2c11', marginBottom: 0, flexShrink: 0 }}>
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
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', border: '3.5px solid #4a2c11', borderRadius: '12px', boxShadow: '0 4px 0 #4a2c11', minHeight: '170px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '11px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block', tracking: '0.05em' }}>Current Demand</span>
                    <span className="revenue-card-val" style={{ fontSize: '22px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px' }}>
                      {gameState ? (
                        <>
                          <AnimatedNumber value={gameState.lastSold} /> / <AnimatedNumber value={gameState.lastDemand} />
                        </>
                      ) : lastResult ? (
                        <>
                          <AnimatedNumber value={retailSold ?? 0} /> / <AnimatedNumber value={totalRetailDemand ?? 0} />
                        </>
                      ) : (
                        '1,090 / 1,200'
                      )}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#8c7662', display: 'block', marginTop: '1px' }}>Muffins Sold</span>

                    {/* Finished Goods Inventory Progress Bar */}
                    <div className="mt-2 pt-1 border-t border-[#4a2c11]/10">
                      <span className="revenue-card-title" style={{ fontSize: '9px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Finished Goods Stock</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[12px] font-black text-[#4a2c11]">
                          <AnimatedNumber value={gameState ? gameState.inventory : (currentTeam.inventory?.standard ?? 0)} />
                        </span>
                        <div className="w-20 h-2 bg-[#f1ebd9] border border-[#4a2c11] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#ffa726] transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (((gameState ? gameState.inventory : (currentTeam.inventory?.standard ?? 0)) / 1000) * 100))}%` 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <svg viewBox="0 0 160 50" width="100%" height="60" key={`chart-${retailSold}`}>
                      <motion.path
                        d="M 10 40 L 30 35 L 50 38 L 70 28 L 90 32 L 110 18 L 130 22 L 150 10"
                        fill="none"
                        stroke="#ffa726"
                        strokeWidth="3.5"
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
                          r="4.5"
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
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', border: '3.5px solid #4a2c11', borderRadius: '12px', boxShadow: '0 4px 0 #4a2c11', minHeight: '170px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '11px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block', tracking: '0.05em' }}>Fill Rate</span>
                    <span className="revenue-card-val" style={{ fontSize: '22px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px' }}>
                      <AnimatedFloat value={gameState ? gameState.satisfaction : fillRate} decimals={1} suffix="%" />
                    </span>
                  </div>
                  <div style={{ marginTop: '6px' }} className="flex justify-center">
                    <svg width="65" height="65" viewBox="0 0 36 36" key={`fill-${gameState ? gameState.satisfaction : fillRate}`}>
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
                          strokeDasharray: `${gameState ? gameState.satisfaction : (lastResult ? fillRate : 91.2)} ${100 - (gameState ? gameState.satisfaction : (lastResult ? fillRate : 91.2))}` 
                        }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </svg>
                  </div>
                </motion.div>

                {/* Daily Revenue Card */}
                <motion.div 
                  className="revenue-card" 
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', border: '3.5px solid #4a2c11', borderRadius: '12px', boxShadow: '0 4px 0 #4a2c11', minHeight: '170px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '11px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block', tracking: '0.05em' }}>Revenue (Today)</span>
                    <span className="revenue-card-val" style={{ fontSize: '22px', fontWeight: 900, color: '#4a2c11', display: 'block', marginTop: '2px' }}>
                      ₹{gameState ? (
                        <AnimatedNumber value={gameState.lastRevenue} />
                      ) : lastResult ? (
                        <AnimatedNumber value={revenueToday ?? 0} />
                      ) : (
                        '1,24,850'
                      )}
                    </span>
                  </div>
                  <div style={{ marginTop: '6px' }} className="flex justify-center">
                    <svg width="90" height="60" viewBox="0 0 70 45" key={`coins-${gameState ? gameState.lastRevenue : revenueToday}`}>
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
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', border: '3.5px solid #4a2c11', borderRadius: '12px', boxShadow: '0 4px 0 #4a2c11', minHeight: '170px', cursor: 'default' }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 6px 0 #4a2c11' }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div>
                    <span className="revenue-card-title" style={{ fontSize: '11px', color: '#8c7662', textTransform: 'uppercase', fontWeight: 800, display: 'block', tracking: '0.05em' }}>Total Cash</span>
                    <span className={`revenue-card-val transition-colors duration-500 ${
                      cashFlash === 'gain' ? 'text-emerald-600' :
                      cashFlash === 'loss' ? 'text-red-500' :
                      'text-[#4a2c11]'
                    }`} style={{ fontSize: '20px', fontWeight: 900, display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ₹<AnimatedNumber value={gameState?.balance ?? currentTeam.balance ?? 0} />
                    </span>
                  </div>
                  <div style={{ marginTop: '6px' }} className="flex justify-center">
                    <svg width="90" height="60" viewBox="0 0 70 45" key={`piggy-${gameState?.balance ?? currentTeam.balance}`}>
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
                  onClick={() => { playBeep(880, 'sine', 0.1); showToast("Opening corporate spreadsheet report..."); downloadCSV(results, currentTeam.name); }}
                  style={{
                    border: '3.5px solid #4a2c11',
                    borderRadius: '12px',
                    fontWeight: 950,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    color: '#4a2c11',
                    backgroundColor: '#ffd54f',
                    boxShadow: '0 4px 0 #4a2c11',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 12px',
                    gap: '6px',
                  }}
                  whileHover={{ scale: 1.05, y: -4, boxShadow: '0 6px 0 #4a2c11', backgroundColor: '#ffe082' }}
                  whileTap={{ scale: 0.98, y: 1, boxShadow: '0 1px 0 #4a2c11' }}
                >
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2' }}>View Revenue Report</span>
                </motion.button>
              </div>

            </div>
          </div>
        </div>
      </main>
      {/* ─── Overtime Baking Dash Mini-Game Modal ─── */}
      <AnimatePresence>
        {showOvertimeModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c1a] border-4 border-[#4a2c11] max-w-4xl w-full p-2 shadow-2xl relative rounded-2xl"
            >
              <SodaBottlingGame 
                onReward={handleOvertimeReward}
                onClose={() => setShowOvertimeModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Offered & Active Contracts Modal ─── */}
      <AnimatePresence>
        {showContractsModal && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-[#4a2c11]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fffefb] border-4 border-[#4a2c11] max-w-lg w-full p-6 shadow-2xl relative rounded-2xl"
            >
              <button 
                onClick={() => { playBeep(440, 'sine', 0.05); setShowContractsModal(false); }}
                className="absolute top-4 right-4 qty-control-btn hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-lg font-black uppercase text-[#4a2c11] border-b-3 border-[#4a2c11]/15 pb-2 mb-4 flex items-center gap-2">
                <span>📜</span> Active Distribution Contracts
              </h3>

              <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1">
                {/* Contracts Offered */}
                <div>
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-[#8c7662] mb-2">Offered Deals</h4>
                  {currentTeam.contracts?.filter(c => c.status === 'offered').length === 0 ? (
                    <div className="p-3 border-2 border-dashed border-[#e6ccb2] rounded-xl text-center text-xs text-gray-500">
                      No distribution contract proposals offered currently.
                    </div>
                  ) : (
                    currentTeam.contracts?.filter(c => c.status === 'offered').map(c => (
                      <div key={c.id} className="p-3 bg-[#fff9c4]/30 border-2 border-[#4a2c11] rounded-xl flex justify-between items-center text-xs gap-3">
                        <div className="text-left">
                          <span className="font-extrabold uppercase text-[#4a2c11] block">{c.name}</span>
                          <span className="text-[10px] text-gray-500 block">Fulfill {c.dailyDemand} un/day @ ₹{c.pricePerUnit} (Req: {c.fillRateRequired}%)</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={async () => {
                              playBeep(523, 'sine', 0.1);
                              await acceptContract(c.id);
                              showToast(`Accepted "${c.name}" contract!`);
                            }}
                            className="bg-[#89b873] hover:bg-[#78a562] text-white border-2 border-[#4a2c11] shadow-[0_2px_0_#4a2c11] px-3 py-1 rounded font-black uppercase tracking-wider text-[9px] active:translate-y-0.5"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Contracts Accepted */}
                <div>
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-[#8c7662] mb-2">Accepted Active Contracts</h4>
                  {currentTeam.contracts?.filter(c => c.status === 'accepted').length === 0 ? (
                    <div className="p-3 border-2 border-dashed border-[#e6ccb2] rounded-xl text-center text-xs text-gray-500">
                      No accepted active distribution agreements currently.
                    </div>
                  ) : (
                    currentTeam.contracts?.filter(c => c.status === 'accepted').map(c => (
                      <div key={c.id} className="p-3 bg-[#e8f5e9]/30 border-2 border-[#4a2c11] rounded-xl text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="text-left">
                            <span className="font-extrabold uppercase text-emerald-800">{c.name}</span>
                            <span className="text-[10px] text-gray-500 block">Deliveries: {c.deliveredCount} / {c.demandedCount} un (Req: {c.fillRateRequired}%)</span>
                          </div>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Abort contract ${c.name}? Will incur exit penalty of ₹${c.exitPenalty.toLocaleString()}.`)) {
                                playBeep(220, 'sawtooth', 0.15);
                                await abortContract(c.id);
                                showToast(`Aborted "${c.name}"!`);
                              }
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white border-2 border-[#4a2c11] shadow-[0_2px_0_#4a2c11] px-2 py-0.5 rounded font-black uppercase tracking-wider text-[8px] active:translate-y-0.5"
                          >
                            Abort (Penalty ₹{c.exitPenalty})
                          </button>
                        </div>
                        
                        {/* Progress fill rate bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-gray-500">
                            <span>Fulfillment rate: {c.demandedCount > 0 ? Math.round((c.deliveredCount / c.demandedCount) * 100) : 0}%</span>
                            <span>Target: {c.fillRateRequired}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 border-2 border-[#4a2c11] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600"
                              style={{ width: `${c.demandedCount > 0 ? Math.min(100, (c.deliveredCount / c.demandedCount) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Download/Export Round results utility
const downloadCSV = (results: any[], teamName: string) => {
  if (!results || results.length === 0) return;
  const headers = "Day,Revenue,Profit,Raw Material Cost,Production Cost,Inventory Holding Cost,Penalties,BalanceAfter\n";
  const rows = results.map(r => 
    `${r.round},${r.revenue},${r.profit},${r.rawMaterialCost},${r.productionCost},${r.inventoryCost},${r.penalties},${r.balanceAfter}`
  ).join("\n");
  const blob = new Blob([headers + rows], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `${teamName}_MuffinFactory_Ledger.csv`);
  a.click();
};
