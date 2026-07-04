/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Download, 
  Trophy, 
  Plus, 
  Settings, 
  Activity, 
  Clock, 
  Shield, 
  Zap, 
  AlertTriangle, 
  LogOut,
  X, 
  UserPlus, 
  Grid, 
  Sliders, 
  Volume2, 
  VolumeX,
  Heart, 
  Layers, 
  Check, 
  Edit3, 
  BookOpen, 
  FileSpreadsheet,
  FastForward,
  Loader2
} from 'lucide-react';
import { Difficulty, GameEvent, EventType, Session, Team, Contract, DEFAULT_PARAMETERS } from '../types';
import { Timer } from './Timer.tsx';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, getDocs, collectionGroup, collection, query, orderBy, where } from 'firebase/firestore';


// Preset scenarios from the Professor Manual (Muffin Experiences)
const PRESET_SCENARIOS = [
  {
    id: 'sodapop_exp_1',
    name: 'Muffin Experience 1 - Intro Muffin (365 Days)',
    description: 'Perfect introductory scenario. Students learn material arrivals, bottling capacity constraints, and active fulfillment.',
    simulatedDays: 365,
    lengthRealTime: 120,
    productionCost: 5,
    interestRate: 10,
    rmUnitPrice: 2,
    fixedCostPerOrder: 100,
    leadTime: 4,
    sellingPrice: 20,
    contracts: [
      {
        id: 'c1',
        name: 'Muffin Cargo Pack A',
        appearsAtDay: 1,
        beginsAtDay: 3,
        endsAtDay: 365,
        dailyDemand: 50,
        pricePerUnit: 20,
        fillRateRequired: 75,
        fillRatePenalty: 1500,
        exitPenalty: 6250,
        deliveredCount: 0,
        demandedCount: 0,
        status: 'offered'
      }
    ],
    poissonDemand: true,
    breakingPoints: [
      { day: 0, demand: 100 },
      { day: 365, demand: 100 }
    ],
    initialCash: 850000,
    initialRawMaterials: 12000,
    initialQ: 12000,
    initialR: 2300,
    initialMachinesMixing: 1,
    initialMachinesBottling: 2,
    initialMachinesPackaging: 3,
    stations: {
      mixing: { capacityPerMachine: 24, purchasePrice: 20000 },
      bottling: { capacityPerMachine: 48, purchasePrice: 30000 },
      packaging: { capacityPerMachine: 72, purchasePrice: 100000 }
    },
    starsThresholds: [829500, 1000000, 1500000]
  },
  {
    id: 'sodapop_exp_2',
    name: 'Muffin Experience 2 - High Spike (365 Days)',
    description: 'Advanced economics scenario. High-severity material spikes, random surges, challenging delivery lead times.',
    simulatedDays: 365,
    lengthRealTime: 120,
    productionCost: 5,
    interestRate: 12,
    rmUnitPrice: 3,
    fixedCostPerOrder: 150,
    leadTime: 5,
    sellingPrice: 22,
    contracts: [
      {
        id: 'c2',
        name: 'Metropolitan Food Deal',
        appearsAtDay: 5,
        beginsAtDay: 10,
        endsAtDay: 350,
        dailyDemand: 100,
        pricePerUnit: 23,
        fillRateRequired: 80,
        fillRatePenalty: 5000,
        exitPenalty: 20000,
        deliveredCount: 0,
        demandedCount: 0,
        status: 'offered'
      }
    ],
    poissonDemand: true,
    breakingPoints: [
      { day: 0, demand: 80 },
      { day: 150, demand: 220 },
      { day: 365, demand: 90 }
    ],
    initialCash: 1000000,
    initialRawMaterials: 15000,
    initialQ: 15000,
    initialR: 4000,
    initialMachinesMixing: 2,
    initialMachinesBottling: 2,
    initialMachinesPackaging: 2,
    stations: {
      mixing: { capacityPerMachine: 48, purchasePrice: 25000 },
      bottling: { capacityPerMachine: 48, purchasePrice: 35000 },
      packaging: { capacityPerMachine: 48, purchasePrice: 105000 }
    },
    starsThresholds: [950000, 1300000, 2000000]
  },
  {
    id: 'sodapop_exp_endless',
    name: 'Muffin Experience 3 - Endless Mode (365 Days)',
    description: 'Perfect for long-running continuous play. The simulation will run infinitely without stopping.',
    simulatedDays: 365,
    lengthRealTime: 120,
    productionCost: 5,
    interestRate: 10,
    rmUnitPrice: 2,
    fixedCostPerOrder: 100,
    leadTime: 4,
    sellingPrice: 20,
    contracts: [
      {
        id: 'c1',
        name: 'Muffin Cargo Pack A',
        appearsAtDay: 1,
        beginsAtDay: 3,
        endsAtDay: 365,
        dailyDemand: 50,
        pricePerUnit: 20,
        fillRateRequired: 75,
        fillRatePenalty: 1500,
        exitPenalty: 6250,
        deliveredCount: 0,
        demandedCount: 0,
        status: 'offered'
      }
    ],
    poissonDemand: true,
    breakingPoints: [
      { day: 0, demand: 100 },
      { day: 50, demand: 150 },
      { day: 150, demand: 200 },
      { day: 250, demand: 250 },
      { day: 365, demand: 300 }
    ],
    initialCash: 850000,
    initialRawMaterials: 12000,
    initialQ: 12000,
    initialR: 2300,
    initialMachinesMixing: 1,
    initialMachinesBottling: 2,
    initialMachinesPackaging: 3,
    stations: {
      mixing: { capacityPerMachine: 24, purchasePrice: 20000 },
      bottling: { capacityPerMachine: 48, purchasePrice: 30000 },
      packaging: { capacityPerMachine: 72, purchasePrice: 100000 }
    },
    starsThresholds: [829500, 1000000, 1500000]
  }
];

export function InstructorDashboard() {
  const { 
    session, 
    allTeams, 
    results,
    startSession, 
    advanceRound, 
    updateSettings, 
    triggerEvent, 
    user, 
    theme, 
    toggleTheme,
    isDirectPlay,
    setIsDirectPlay,
    updateSession,
    updateTeamState,
    deleteTeamState,
    logout,
    overrideContracts,
    addInstructorContract,
    removeInstructorContract
  } = useGame();
  const isDark = theme === 'dark';

  // Audio feedback utility
  const playBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const handleExitToWebsite = async () => {
    playBeep(329, 'sine', 0.15);
    setIsDirectPlay(false);
    window.location.hash = '';
    await logout();
  };

  // Contract Manager states
  const [newContractName, setNewContractName] = useState('');
  const [newContractAppears, setNewContractAppears] = useState(1);
  const [newContractBegins, setNewContractBegins] = useState(2);
  const [newContractEnds, setNewContractEnds] = useState(10);
  const [newContractDemand, setNewContractDemand] = useState(50);
  const [newContractPrice, setNewContractPrice] = useState(25);
  const [newContractFillRate, setNewContractFillRate] = useState(85);
  const [newContractFillPenalty, setNewContractFillPenalty] = useState(500);
  const [newContractExitPenalty, setNewContractExitPenalty] = useState(1000);
  const [contractFormErrors, setContractFormErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handlePushContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newContractName.trim()) {
      errors.name = 'Contract name is required';
    }
    if (newContractBegins <= newContractAppears) {
      errors.begins = 'Active from Day must be after Appears on Day';
    }
    if (newContractEnds <= newContractBegins) {
      errors.ends = 'Active until Day must be after Active from Day';
    }
    if (newContractDemand <= 0) {
      errors.demand = 'Daily Demand must be greater than 0';
    }
    if (newContractPrice <= 0) {
      errors.price = 'Price per Unit must be greater than 0';
    }
    if (newContractFillRate < 1 || newContractFillRate > 100) {
      errors.fillRate = 'Fill Rate must be between 1% and 100%';
    }
    if (newContractFillPenalty < 0) {
      errors.fillPenalty = 'Penalty must be 0 or greater';
    }
    if (newContractExitPenalty < 0) {
      errors.exitPenalty = 'Exit Penalty must be 0 or greater';
    }

    if (Object.keys(errors).length > 0) {
      setContractFormErrors(errors);
      playBeep(220, 'sawtooth', 0.15);
      return;
    }

    setContractFormErrors({});

    try {
      await addInstructorContract({
        name: newContractName.trim(),
        appearsAtDay: newContractAppears,
        beginsAtDay: newContractBegins,
        endsAtDay: newContractEnds,
        dailyDemand: newContractDemand,
        pricePerUnit: newContractPrice,
        fillRateRequired: newContractFillRate,
        fillRatePenalty: newContractFillPenalty,
        exitPenalty: newContractExitPenalty,
      });

      showToast(`Contract pushed to all ${allTeams.length} teams`);
      playBeep(523, 'sine', 0.1);
      
      // Clear the form
      setNewContractName('');
      setNewContractAppears(1);
      setNewContractBegins(2);
      setNewContractEnds(10);
      setNewContractDemand(50);
      setNewContractPrice(25);
      setNewContractFillRate(85);
      setNewContractFillPenalty(500);
      setNewContractExitPenalty(1000);
    } catch (err: any) {
      alert(`Failed to add contract: ${err.message}`);
    }
  };

  const getInstructorContractStatus = (c: Contract, currentDay: number) => {
    if (currentDay < c.appearsAtDay) return 'PENDING';
    if (currentDay >= c.appearsAtDay && currentDay < c.beginsAtDay) return 'OFFERED';
    if (currentDay >= c.beginsAtDay && currentDay <= c.endsAtDay) return 'ACTIVE';
    return 'FINISHED';
  };

  // Tab Navigation state
  const [activeTab, setActiveTab] = useState<'live' | 'scenarios'>('live');
  
  // Custom & Preset scenarios combined state
  const [customScenarios, setCustomScenarios] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('custom_scenarios');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Pre-Start Room Parameters
  const [gameName, setGameName] = useState('Class 1');
  const [selectedScenarioId, setSelectedScenarioId] = useState('sodapop_exp_1');

  // Elapsed real-time ticker
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Interactive full screen leaderboard State
  const [showFullscreenLeaderboard, setShowFullscreenLeaderboard] = useState(false);

  // Inspect student team state
  const [inspectTeam, setInspectTeam] = useState<Team | null>(null);
  const [interveneCash, setInterveneCash] = useState('');
  const [interveneMaterials, setInterveneMaterials] = useState('');
  const [interveneQ, setInterveneQ] = useState('');
  const [interveneR, setInterveneR] = useState('');
  const [interveneContracts, setInterveneContracts] = useState<string[]>([]);

  // 6-Step Scenario Config Creator Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardScenarioId, setWizardScenarioId] = useState<string | null>(null);
  const [wName, setWName] = useState('My New Scenario');
  const [wDescription, setWDescription] = useState('Custom class scenario configuration');
  const [wSimulatedDays, setWSimulatedDays] = useState(365);
  const [wLengthRealTime, setWLengthRealTime] = useState(15);
  const [wProductionCost, setWProductionCost] = useState(5);
  const [wInterestRate, setWInterestRate] = useState(10);
  const [wRmUnitPrice, setWRmUnitPrice] = useState(2);
  const [wFixedCostPerOrder, setWFixedCostPerOrder] = useState(100);
  const [wLeadTime, setWLeadTime] = useState(4);
  const [wSellingPrice, setWSellingPrice] = useState(20);
  
  // Step 2 Contracts
  const [wContracts, setWContracts] = useState<any[]>([]);
  const [tempContractName, setTempContractName] = useState('Special Bulk Offer');
  const [tempContractAppear, setTempContractAppear] = useState(5);
  const [tempContractBegin, setTempContractBegin] = useState(10);
  const [tempContractEnd, setTempContractEnd] = useState(25);
  const [tempContractDemand, setTempContractDemand] = useState(60);
  const [tempContractPrice, setTempContractPrice] = useState(21);
  const [tempContractFill, setTempContractFill] = useState(80);
  const [tempContractPenalty, setTempContractPenalty] = useState(2000);

  // Step 3 Walk-In Customers Demand Breaking Points
  const [wPoissonDemand, setWPoissonDemand] = useState(true);
  const [wBreakingPoints, setWBreakingPoints] = useState<any[]>([
    { day: 0, demand: 100 },
    { day: 30, demand: 100 }
  ]);
  const [tempBPDay, setTempBPDay] = useState(15);
  const [tempBPDemand, setTempBPDemand] = useState(150);

  // Step 4 Starting conditions
  const [wInitialCash, setWInitialCash] = useState(850000);
  const [wInitialRawMaterials, setWInitialRawMaterials] = useState(12000);
  const [wInitialQ, setWInitialQ] = useState(12000);
  const [wInitialR, setWInitialR] = useState(2300);
  const [wMachinesMixing, setWMachinesMixing] = useState(1);
  const [wMachinesBottling, setWMachinesBottling] = useState(2);
  const [wMachinesPackaging, setWMachinesPackaging] = useState(3);

  // Step 5 Capacities Config
  const [wMixCap, setWMixCap] = useState(24);
  const [wMixPrice, setWMixPrice] = useState(20000);
  const [wBotCap, setWBotCap] = useState(48);
  const [wBotPrice, setWBotPrice] = useState(30000);
  const [wPackCap, setWPackCap] = useState(72);
  const [wPackPrice, setWPackPrice] = useState(100000);

  // Step 6 Score Thresholds
  const [wStar1, setWStar1] = useState(830000);
  const [wStar2, setWStar2] = useState(1000000);
  const [wStar3, setWStar3] = useState(1500000);

  // Custom dialog notifications and choices
  const [customNotification, setCustomNotification] = useState<{ message: string; title?: string } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
    title?: string;
    confirmLabel?: string;
  } | null>(null);

  const showAlert = (message: string, title = "Notice") => {
    setCustomNotification({ message, title });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = "Confirmation Required", confirmLabel = "Confirm Action") => {
    setCustomConfirm({ message, onConfirm, title, confirmLabel });
  };

  // Crew Alert Guardrails state
  const [alertSettings, setAlertSettings] = useState<{
    cashEnabled: boolean;
    cashMin: number;
    satisfactionEnabled: boolean;
    satisfactionMin: number;
    materialsEnabled: boolean;
    materialsMin: number;
    soundEnabled: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem(`instructor_alerts_${session?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {
        cashEnabled: true,
        cashMin: 700000,
        satisfactionEnabled: true,
        satisfactionMin: 80,
        materialsEnabled: false,
        materialsMin: 2000,
        soundEnabled: false
      };
    } catch {
      return {
        cashEnabled: true,
        cashMin: 700000,
        satisfactionEnabled: true,
        satisfactionMin: 80,
        materialsEnabled: false,
        materialsMin: 2000,
        soundEnabled: false
      };
    }
  });

  // Save alerts to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(`instructor_alerts_${session?.id || 'default'}`, JSON.stringify(alertSettings));
    } catch (e) {
      console.error(e);
    }
  }, [alertSettings, session?.id]);

  // Alert evaluator function
  const getTeamAlerts = (team: Team) => {
    const alerts: { type: 'cash' | 'sat' | 'materials'; message: string; severity: 'warning' | 'critical' }[] = [];
    
    if (alertSettings.cashEnabled && team.balance < alertSettings.cashMin) {
      const isCritical = team.balance < alertSettings.cashMin * 0.7;
      alerts.push({
        type: 'cash',
        message: `Total Cash ₹${team.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })} drops below safeguard limit (₹${alertSettings.cashMin.toLocaleString()})`,
        severity: isCritical ? 'critical' : 'warning'
      });
    }
    
    const satisfaction = team.satisfaction ?? 100;
    if (alertSettings.satisfactionEnabled && satisfaction < alertSettings.satisfactionMin) {
      const isCritical = satisfaction < alertSettings.satisfactionMin - 15;
      alerts.push({
        type: 'sat',
        message: `Customer rating at ${satisfaction}% is below safeguard limit (${alertSettings.satisfactionMin}%)`,
        severity: isCritical ? 'critical' : 'warning'
      });
    }
    
    const mats = team.rawMaterials ?? 0;
    if (alertSettings.materialsEnabled && mats < alertSettings.materialsMin) {
      const isCritical = mats < alertSettings.materialsMin * 0.5;
      alerts.push({
        type: 'materials',
        message: `Raw materials silo stock at ${mats.toLocaleString()} un. is critically low`,
        severity: isCritical ? 'critical' : 'warning'
      });
    }
    
    return alerts;
  };

  // Play alarm sound
  const playAlertSound = () => {
    if (!alertSettings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.05);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = audioCtx.currentTime;
      playTone(880, now, 0.22);
      playTone(660, now + 0.22, 0.3);
    } catch (err) {
      console.warn("Audio blocked by browser context:", err);
    }
  };

  // Track key variations to trigger alarm on new alert breaches
  const lastAlertKeyList = React.useRef<string>('');

  useEffect(() => {
    if (!session || session.status === 'waiting') return;
    
    const activeAlertsSummary = allTeams.map(t => {
      const alerts = getTeamAlerts(t);
      return alerts.map(a => `${t.id}-${a.type}`).join(',');
    }).filter(Boolean).join('|');

    if (activeAlertsSummary && activeAlertsSummary !== lastAlertKeyList.current) {
      const prevKeys = lastAlertKeyList.current.split(/[|,]/);
      const currentKeys = activeAlertsSummary.split(/[|,]/);
      const newlyAdded = currentKeys.filter(k => k && !prevKeys.includes(k));
      
      if (newlyAdded.length > 0) {
        playAlertSound();
      }
    }
    lastAlertKeyList.current = activeAlertsSummary;
  }, [allTeams, alertSettings, session?.status]);

  // Live disruption selection
  const [selectedEventType, setSelectedEventType] = useState<EventType>('demand_surge');
  const [selectedSeverity, setSelectedSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (!session) return;
    if (session.gameName) setGameName(session.gameName);
  }, [session]);

  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);

  // Elapsed real-time clock loop
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - new Date(session.createdAt).getTime();
      const secs = Math.floor(elapsedMs / 1000) % 60;
      const mins = Math.floor(elapsedMs / 60000) % 60;
      const hrs = Math.floor(elapsedMs / 3600000);
      const formatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setElapsedTime(formatted);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.status, session?.createdAt]);

  // Round time left countdown
  useEffect(() => {
    if (!session || session.status !== 'active' || !session.roundStartedAt) {
      setRoundTimeLeft(null);
      return;
    }
    const duration = session.settings?.roundDuration || 120;
    if (duration > 3600) {
      setRoundTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const start = new Date(session.roundStartedAt!).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setRoundTimeLeft(remaining);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [session?.status, session?.roundStartedAt, session?.settings?.roundDuration]);

  if (!session) return null;

  const activeScenario = PRESET_SCENARIOS.concat(customScenarios).find(s => s.name === session.scenarioName) || PRESET_SCENARIOS[0];
  const activeScoreThresholds = session.scoreThresholds || activeScenario.starsThresholds || [830000, 1000000, 1500000];

  // Global disruption injector
  const handleInjectEvent = () => {
    let message = '';
    if (selectedEventType === 'demand_surge') {
      message = `Market Spike: Sudden surge in corporate wholesale orders! Expected retail client demands: +${selectedSeverity === 'low' ? '30' : selectedSeverity === 'medium' ? '60' : '100'}%`;
    } else if (selectedEventType === 'material_shortage') {
      message = `Supply Chain Crisis: Global ingredients cargo shortage. Raw flour & sugar purchasing costs: x${selectedSeverity === 'low' ? '1.5' : selectedSeverity === 'medium' ? '2' : '3'}`;
    } else if (selectedEventType === 'machine_breakdown') {
      message = `Oven Malfunction: Heating element leakage inside Deck Ovens. Baking line capacity speed: -${selectedSeverity === 'low' ? '20' : selectedSeverity === 'medium' ? '40' : '65'}%`;
    }

    triggerEvent({
      type: selectedEventType,
      severity: selectedSeverity,
      message
    });
  };

  // Launch Session Room Game parameters
  const handleStartGame = async () => {
    const chosenScenario = PRESET_SCENARIOS.concat(customScenarios).find(s => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];
    await updateSession({
      status: 'active',
      currentRound: 1,
      gameName: gameName || 'Class 1',
      scenarioName: chosenScenario.name,
      totalRounds: chosenScenario.simulatedDays,
      scoreThresholds: chosenScenario.starsThresholds || [830000, 1000000, 1500000],
      settings: {
        roundDuration: 20,
        difficulty: 'medium',
        totalRounds: chosenScenario.simulatedDays,
        capacity: chosenScenario.stations.mixing.capacityPerMachine,
        parameters: {
          ...DEFAULT_PARAMETERS,
          baseLeadTime: chosenScenario.leadTime,
          storageCost: chosenScenario.interestRate / 10,
          rawMaterialUnitPrice: chosenScenario.rmUnitPrice,
        }
      },
      createdAt: new Date().toISOString(),
      roundStartedAt: new Date().toISOString()
    });
  };

  // Pause/Resume Simulation
  const handleTogglePause = async () => {
    const nextStatus = session.status === 'paused' ? 'active' : 'paused';
    await updateSession({ 
      status: nextStatus,
      ...(nextStatus === 'active' ? { roundStartedAt: new Date().toISOString() } : {})
    });
  };

  // End active game run
  const handleEndGame = async () => {
    showConfirm(
      "Are you sure you want to finalize and end the simulation run? This blocks further daily steps.",
      async () => {
        await updateSession({ status: 'ended' });
      },
      "End Session Confirmation",
      "End Session"
    );
  };

  // Delete/Kick Team
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    showConfirm(
      `Remove team "${teamName}" from the session floor?`,
      async () => {
        await deleteTeamState(teamId);
      },
      "Kick Team Confirmation",
      "Kick Team"
    );
  };

  // Distribute Resources to all teams (Instructor Assistance)
  const handleDistributeRelief = async () => {
    if (allTeams.length === 0) return;
    showConfirm(
      "Incur standard supervisor Raw Material grant of +2,000 U to ALL active teams?",
      async () => {
        for (const t of allTeams) {
          const flour = t.flourStock !== undefined ? t.flourStock : Math.round(0.35 * (t.rawMaterials || 12000));
          const sugar = t.sugarStock !== undefined ? t.sugarStock : Math.round(0.25 * (t.rawMaterials || 12000));
          const eggs = t.eggsStock !== undefined ? t.eggsStock : Math.round(0.20 * (t.rawMaterials || 12000));
          const cocoa = t.cocoaStock !== undefined ? t.cocoaStock : Math.round(0.20 * (t.rawMaterials || 12000));

          await updateTeamState(t.id, {
            flourStock: flour + 2000,
            sugarStock: sugar,
            eggsStock: eggs,
            cocoaStock: cocoa,
            rawMaterials: (t.rawMaterials || 0) + 2000
          });
        }
        showAlert("Relief flour credits successfully dispatched!", "Assistance Dispatched");
      },
      "Distribute Resource Relief",
      "Grant Relief"
    );
  };

  // DATA Download CSV
  const handleDownloadAllCSV = async () => {
    try {
      let resultsData: any[] = [];
      if (isDirectPlay) {
        resultsData = results.map(r => ({ ...r, teamId: 'solo-chef' }));
      } else {
        const resultsSnap = await getDocs(query(collectionGroup(db, 'results'), where('sessionId', '==', session.id)));
        resultsData = resultsSnap.docs.map(d => d.data());
      }
      
      if (resultsData.length === 0) {
        showAlert("Instructors notice: No team logs recorded in the session ledger database yet. Releasing daily cycles is required.", "No Records Found");
        return;
      }

      resultsData.sort((a, b) => a.round - b.round || a.teamId.localeCompare(b.teamId));
      
      const csvHeaders = "Team Name,Simulated Day,Simulated Hour,Muffins Sold,Revenue (₹),Cost (₹),Profit (₹),Total Cash (₹),Customer Satisfaction (%),Reorder Policy Q,Reorder Point R\n";
      const csvRows = resultsData.map(r => {
        const team = allTeams.find(t => t.id === r.teamId);
        const teamLabel = team ? team.name : r.teamId;
        const totalCost = (r.productionCost || 0) + (r.inventoryCost || 0) + (r.rawMaterialCost || 0) + (r.marketingCost || 0) + (r.penalties || 0);
        return `"${teamLabel}",${r.round},${r.round * 24},${r.soldQty?.standard || r.soldQty || 0},${r.revenue},${totalCost},${r.profit},${r.balanceAfter},${team?.satisfaction ?? 100},${team?.orderQuantity ?? 12000},${team?.reorderPoint ?? 2300}`;
      }).join("\n");

      const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Session_${session.code}_AllTeams_DailyLog.csv`;
      link.click();
    } catch {
      showAlert("Failed compiling transaction sheets.", "Export Error");
    }
  };

  // Download individual team historical record CSV
  const handleDownloadTeamCSV = async (teamId: string, teamLabel: string) => {
    try {
      let resultsData: any[] = [];
      if (isDirectPlay) {
        resultsData = results;
      } else {
        const snap = await getDocs(query(collection(db, `sessions/${session.id}/teams/${teamId}/results`), orderBy('round', 'asc')));
        resultsData = snap.docs.map(d => d.data());
      }

      if (resultsData.length === 0) {
        showAlert("This team hasn't committed decisions or processed days yet.", "No Data Found");
        return;
      }

      const csvHeaders = "Day Offset,Hours Offset,Daily Revenue,Daily Profit,Material Purchase cost,Production expenses,Holding charges,Contract compliance penalties,Total Cash\n";
      const csvRows = resultsData.map(r => 
        `${r.round},${r.round * 24},${r.revenue},${r.profit},${r.rawMaterialCost},${r.productionCost},${r.inventoryCost},${r.penalties},${r.balanceAfter}`
      ).join("\n");

      const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${teamLabel.replace(/\s+/g, '_')}_DailyBalanceReport.csv`;
      link.click();
    } catch {
      showAlert("Failed compiling ledger file.", "Download Error");
    }
  };

  // Team Intervention update
  const handleSaveIntervention = async () => {
    if (!inspectTeam) return;
    try {
      const updates: any = {};
      
      if (interveneCash !== '') updates.balance = parseFloat(interveneCash);
      
      if (interveneMaterials !== '') {
        const nextRaw = parseInt(interveneMaterials);
        updates.rawMaterials = nextRaw;
        // Distribute the new raw materials value proportionally across the 4 stocks
        updates.flourStock = Math.round(0.35 * nextRaw);
        updates.sugarStock = Math.round(0.25 * nextRaw);
        updates.eggsStock = Math.round(0.20 * nextRaw);
        updates.cocoaStock = Math.round(0.20 * nextRaw);
      }
      
      if (interveneQ !== '') {
        const nextQ = parseInt(interveneQ);
        updates.orderQuantity = nextQ;
        updates.flourOrderQty = nextQ;
        // Scale other ingredients order quantities proportionally
        const scale = nextQ / 2000;
        updates.sugarOrderQty = Math.round(1500 * scale);
        updates.eggsOrderQty = Math.round(1200 * scale);
        updates.cocoaOrderQty = Math.round(800 * scale);
      }
      
      if (interveneR !== '') {
        const nextR = parseInt(interveneR);
        updates.reorderPoint = nextR;
        updates.flourROP = nextR;
        // Scale other ingredients reorder points proportionally
        const scale = nextR / 500;
        updates.sugarROP = Math.round(400 * scale);
        updates.eggsROP = Math.round(300 * scale);
        updates.cocoaROP = Math.round(200 * scale);
      }

      await updateTeamState(inspectTeam.id, updates);
      
      // Also apply contract override
      await overrideContracts(inspectTeam.id, interveneContracts);

      showAlert(`Factory parameters override for ${inspectTeam.name} successfully updated!`, "Override Saved");
      setInspectTeam(null);
    } catch {
      showAlert("Correction override failed. Try again.", "Update Failed");
    }
  };

  // Open inspection details modal
  const handleOpenInspect = (team: Team) => {
    setInspectTeam(team);
    setInterveneCash(team.balance.toString());
    setInterveneMaterials(team.rawMaterials.toString());
    setInterveneQ((team.orderQuantity ?? 12000).toString());
    setInterveneR((team.reorderPoint ?? 2300).toString());
    setInterveneContracts(team.contracts?.map(c => c.id) || []);
  };

  // 6-Step Scenario builder triggers
  const openScenarioEditor = (scen: any = null) => {
    if (scen) {
      setWizardScenarioId(scen.id);
      setWName(scen.name);
      setWDescription(scen.description);
      setWSimulatedDays(scen.simulatedDays);
      setWLengthRealTime(scen.lengthRealTime);
      setWProductionCost(scen.productionCost);
      setWInterestRate(scen.interestRate);
      setWRmUnitPrice(scen.rmUnitPrice);
      setWFixedCostPerOrder(scen.fixedCostPerOrder);
      setWLeadTime(scen.leadTime);
      setWSellingPrice(scen.sellingPrice);
      setWContracts(JSON.parse(JSON.stringify(scen.contracts || [])));
      setWPoissonDemand(scen.poissonDemand ?? true);
      setWBreakingPoints(JSON.parse(JSON.stringify(scen.breakingPoints || [])));
      setWInitialCash(scen.initialCash);
      setWInitialRawMaterials(scen.initialRawMaterials);
      setWInitialQ(scen.initialQ);
      setWInitialR(scen.initialR);
      setWMachinesMixing(scen.initialMachinesMixing ?? 1);
      setWMachinesBottling(scen.initialMachinesBottling ?? 2);
      setWMachinesPackaging(scen.initialMachinesPackaging ?? 3);
      setWMixCap(scen.stations?.mixing?.capacityPerMachine ?? 24);
      setWMixPrice(scen.stations?.mixing?.purchasePrice ?? 20000);
      setWBotCap(scen.stations?.bottling?.capacityPerMachine ?? 48);
      setWBotPrice(scen.stations?.bottling?.purchasePrice ?? 30000);
      setWPackCap(scen.stations?.packaging?.capacityPerMachine ?? 72);
      setWPackPrice(scen.stations?.packaging?.purchasePrice ?? 100000);
      setWStar1(scen.starsThresholds?.[0] ?? 830000);
      setWStar2(scen.starsThresholds?.[1] ?? 1000000);
      setWStar3(scen.starsThresholds?.[2] ?? 1500000);
    } else {
      setWizardScenarioId(null);
      setWName('Muffin Experience Preset');
      setWDescription('Custom crafted baking operations scenario');
      setWSimulatedDays(30);
      setWLengthRealTime(15);
      setWProductionCost(5);
      setWInterestRate(10);
      setWRmUnitPrice(2);
      setWFixedCostPerOrder(100);
      setWLeadTime(4);
      setWSellingPrice(20);
      setWContracts([]);
      setWPoissonDemand(true);
      setWBreakingPoints([
        { day: 0, demand: 100 },
        { day: 30, demand: 100 }
      ]);
      setWInitialCash(850000);
      setWInitialRawMaterials(12000);
      setWInitialQ(12000);
      setWInitialR(2300);
      setWMachinesMixing(1);
      setWMachinesBottling(2);
      setWMachinesPackaging(3);
      setWMixCap(24);
      setWMixPrice(20000);
      setWBotCap(48);
      setWBotPrice(30000);
      setWPackCap(72);
      setWPackPrice(100000);
      setWStar1(830000);
      setWStar2(1000000);
      setWStar3(1500000);
    }
    setWizardStep(1);
    setShowWizard(true);
  };

  const handleSaveWizard = () => {
    const updated = {
      id: wizardScenarioId || `custom_${Date.now()}`,
      name: wName,
      description: wDescription,
      simulatedDays: wSimulatedDays,
      lengthRealTime: wLengthRealTime,
      productionCost: wProductionCost,
      interestRate: wInterestRate,
      rmUnitPrice: wRmUnitPrice,
      fixedCostPerOrder: wFixedCostPerOrder,
      leadTime: wLeadTime,
      sellingPrice: wSellingPrice,
      contracts: wContracts,
      poissonDemand: wPoissonDemand,
      breakingPoints: wBreakingPoints,
      initialCash: wInitialCash,
      initialRawMaterials: wInitialRawMaterials,
      initialQ: wInitialQ,
      initialR: wInitialR,
      initialMachinesMixing: wMachinesMixing,
      initialMachinesBottling: wMachinesBottling,
      initialMachinesPackaging: wMachinesPackaging,
      stations: {
        mixing: { capacityPerMachine: wMixCap, purchasePrice: wMixPrice },
        bottling: { capacityPerMachine: wBotCap, purchasePrice: wBotPrice },
        packaging: { capacityPerMachine: wPackCap, purchasePrice: wPackPrice }
      },
      starsThresholds: [wStar1, wStar2, wStar3]
    };

    let nextCustom = [];
    if (wizardScenarioId) {
      nextCustom = customScenarios.map(s => s.id === wizardScenarioId ? updated : s);
    } else {
      nextCustom = [...customScenarios, updated];
    }

    setCustomScenarios(nextCustom);
    localStorage.setItem('custom_scenarios', JSON.stringify(nextCustom));
    setShowWizard(false);
    showAlert("Classroom scenario successfully calibrated and saved!", "Experience Calibrated");
  };

  const handleDeleteScenario = (id: string, name: string) => {
    showConfirm(
      `Delete custom scenario "${name}"?`,
      () => {
        const nextCustom = customScenarios.filter(s => s.id !== id);
        setCustomScenarios(nextCustom);
        localStorage.setItem('custom_scenarios', JSON.stringify(nextCustom));
      },
      "Delete Scenario",
      "Delete"
    );
  };

  const handleCopyScenario = (scen: any) => {
    const copied = {
      ...scen,
      id: `custom_${Date.now()}`,
      name: `Copy of ${scen.name}`
    };
    const nextCustom = [...customScenarios, copied];
    setCustomScenarios(nextCustom);
    localStorage.setItem('custom_scenarios', JSON.stringify(nextCustom));
    showAlert(`Copied "${scen.name}"!`, "Scenario Copied");
  };

  const sortedTeams = [...allTeams].sort((a, b) => b.balance - a.balance);
  const everyoneReady = allTeams.length > 0 && allTeams.every(t => t.ready);

  const getStarsCount = (balance: number) => {
    if (balance >= activeScoreThresholds[2]) return 3;
    if (balance >= activeScoreThresholds[1]) return 2;
    if (balance >= activeScoreThresholds[0]) return 1;
    return 0;
  };

  return (
    <div className={`instructor-dashboard min-h-screen h-screen overflow-hidden ${isDark ? 'dark' : ''}`}>
      {/* Premium custom stylesheet isolated to instructor workspace */}
      <style dangerouslySetInnerHTML={{ __html: `
        .instructor-dashboard {
          --bg: #f7f0e6;
          --bg2: #f0e6d6;
          --bg3: #e8d9c4;
          --bg4: #deccb0;
          --ink: #120d07;
          --brown: #2c1a0a;
          --espresso: #1a0e05;
          --caramel: #b06818;
          --gold: #c8852a;
          --amber: #e0a040;
          --amber2: #f0b84e;
          --sage: #3d7050;
          --rust: #a03820;
          --txt: #1e1408;
          --txt2: #6b4e30;
          --txt3: #9a7a52;
          --b1: rgba(44,26,10,.08);
          --b2: rgba(44,26,10,.14);
          --b3: rgba(44,26,10,.22);
          --r1: 10px; --r2: 16px; --r3: 24px; --r4: 32px;
          
          background: var(--bg);
          color: var(--txt);
          font-family: 'DM Sans', sans-serif;
          transition: background 0.3s, color 0.3s;
          position: relative;
        }

        .instructor-dashboard.dark {
          --bg: #0d0c0a;
          --bg2: #16130f;
          --bg3: #221d17;
          --bg4: #332b22;
          --ink: #f7f0e6;
          --brown: #e8d9c4;
          --espresso: #16130f;
          --caramel: #c8852a;
          --gold: #b06818;
          --amber: #f0b84e;
          --amber2: #fbbf24;
          --sage: #4ade80;
          --rust: #f87171;
          --txt: #f7f0e6;
          --txt2: #d6c7b2;
          --txt3: #9a7a52;
          --b1: rgba(247,240,230,.08);
          --b2: rgba(247,240,230,.14);
          --b3: rgba(247,240,230,.22);
        }

        /* paper grain */
        .instructor-dashboard::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9998;
          opacity: .022;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .serif { font-family: 'Cormorant', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .txt2 { color: var(--txt2); }
        .txt3 { color: var(--txt3); }
        
        .bcard {
          background: var(--bg2);
          border: 1px solid var(--b2);
          border-radius: var(--r2);
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .instructor-dashboard.dark .bcard {
          background: var(--bg2);
          border-color: var(--b1);
        }

        /* custom scrollbar */
        .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--b3); border-radius: 4px; }
      ` }} />

      {/* Top Header Uplink Navigation Bar */}
      <h1 className="sr-only">Instructor Panel Control Center</h1>
      <header className="h-12 bg-zinc-950 text-white px-6 flex items-center justify-between border-b border-white/5 shadow-md relative z-40 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-gray-400">SUPERVISOR CONTROL CENTER // CODE: {session.code}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <nav aria-label="Section navigation" className="flex gap-2">
            <button 
              onClick={() => { playBeep(260, 'sine', 0.05); setActiveTab('live'); }}
              className={`text-[10px] uppercase font-black tracking-wider transition-all px-3 py-1 rounded-md cursor-pointer ${activeTab === 'live' ? 'bg-white/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              📊 Live Console
            </button>
            <button 
              onClick={() => { playBeep(260, 'sine', 0.05); setActiveTab('scenarios'); }}
              className={`text-[10px] uppercase font-black tracking-wider transition-all px-3 py-1 rounded-md cursor-pointer ${activeTab === 'scenarios' ? 'bg-white/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              📖 Experience presets
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExitToWebsite}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-red-950/20 hover:text-red-400 border border-white/10 hover:border-red-500/25 px-3 py-1.5 rounded-lg text-[9px] uppercase font-black text-gray-300 transition-all cursor-pointer select-none active:scale-95 animate-fade-in"
            title="Go back to the main website landing page"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Dashboard</span>
          </button>

          <button
            onClick={() => { playBeep(587.33, 'triangle', 0.1); setShowFullscreenLeaderboard(true); }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg text-[9px] uppercase font-black text-white transition-all shadow-md cursor-pointer select-none active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5 fill-current" />
            <span>📺 Projector Board</span>
          </button>
          
          <button
            onClick={() => { playBeep(523, 'triangle', 0.08); toggleTheme(); }}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer text-xs select-none"
            title="Toggle color theme"
          >
            {isDark ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Container - Absolute Viewport Height Locks */}
      <div className="h-[calc(100vh-48px)] overflow-hidden">
        {activeTab === 'live' ? (
          <main className="h-full p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Controls & Shocks Column (1/3 width, scrollable) */}
            <div className="lg:col-span-1 h-full overflow-y-auto custom-scroll pr-1 pb-6 space-y-6">
              
              {/* LOBBY WAITING FOR ROOM START */}
              {session.status === 'waiting' && (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream border-b border-muffin-brown/10 pb-2">
                    Lobby Room Setup
                  </h2>
                  <div className="space-y-4 font-semibold text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 block">1. Session Title / Section Name</label>
                      <input 
                        type="text" 
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="e.g. MBA Section 102 Assembly"
                        className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-2.5 font-mono text-xs rounded outline-none focus:border-muffin-gold text-dynamic-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 block">2. Select Scenario Calibrator</label>
                      <select
                        value={selectedScenarioId}
                        onChange={(e) => setSelectedScenarioId(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-2.5 font-mono text-xs rounded outline-none focus:border-muffin-gold text-dynamic-text"
                      >
                        {PRESET_SCENARIOS.concat(customScenarios).map(scen => (
                          <option key={scen.id} value={scen.id}>
                            {scen.name} ({scen.simulatedDays} Days)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleStartGame}
                    className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black uppercase text-xs tracking-wider rounded-xl border-b-4 border-emerald-950 shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 active:border-b transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Initialize Factory Line
                  </button>
                </section>
              )}

              {/* ACTIVE SESSION ROOM PARAMETERS */}
              {session.status !== 'waiting' && (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream border-b border-muffin-brown/10 pb-2">
                    Active Operations Room
                  </h2>
                  
                  {(session as any).lastAdvanceError && (
                    <div className="bg-red-500/10 border-2 border-red-500/30 p-3 rounded-xl text-red-700 dark:text-red-400 font-mono text-xs">
                      <strong>Auto-Advance Error:</strong> {(session as any).lastAdvanceError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">SESSION TITLE</span>
                      <span className="font-sans font-black text-xs text-dynamic-text block truncate mt-0.5">{session.gameName || 'Class 1'}</span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">EXPERIENCE PRESET</span>
                      <span className="font-sans font-black text-xs text-dynamic-text block truncate mt-0.5">{session.scenarioName || 'Preset 1'}</span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">SIMULATED TIME</span>
                      <span className="font-mono font-black text-base text-emerald-600 block mt-0.5">
                        Day {Math.min(session.currentRound, session.totalRounds || 10)} <span className="text-[10px] text-gray-400 font-normal">/ {session.totalRounds || 10}</span>
                      </span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">HOURS COMPLETED</span>
                      <span className="font-mono font-black text-base text-dynamic-text block mt-0.5">{(session.currentRound * 24).toLocaleString()} hrs</span>
                    </div>
                    {/* Day Progress Timer */}
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10 col-span-2">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">DAY PROGRESS</span>
                      <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {roundTimeLeft !== null ? `${roundTimeLeft}s remaining until next day` : 'Paused / Manual advancement'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-mono text-gray-400 block font-bold uppercase">Realtime Elapsed Clock</span>
                      <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{elapsedTime}</span>
                    </div>
                    <Clock className="w-5.5 h-5.5 text-emerald-500/40" />
                  </div>

                  <div className="space-y-2 border-t border-muffin-brown/10 pt-4">
                    <span className="text-[9.5px] font-mono uppercase font-bold text-gray-400 block">Supervisor override console</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleTogglePause}
                        className={`py-2 px-3 border rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer active:scale-95 ${session.status === 'paused' ? 'bg-amber-600 text-white border-amber-700 animate-pulse' : 'bg-zinc-950/5 dark:bg-white/5 border-muffin-brown/25 text-dynamic-text hover:bg-zinc-950/10'}`}
                      >
                        {session.status === 'paused' ? (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            Resume Arena
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            Pause Arena
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={handleEndGame}
                        disabled={session.status === 'ended'}
                        className="py-2 px-3 bg-red-650 hover:bg-red-700 text-white border border-red-750 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                        End Session
                      </button>
                    </div>
                  </div>

                  {session.status === 'active' && (
                    <button
                      disabled={session.status !== 'active'}
                      onClick={async () => {
                        try {
                          await advanceRound();
                        } catch (e: any) {
                          alert("Advance failed: " + (e.message || String(e)));
                        }
                      }}
                      className="w-full py-3.5 flex items-center justify-center gap-1.5 font-sans font-black uppercase text-xs tracking-widest rounded-xl border-b-4 bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-900 active:border-b shadow-md active:translate-y-0.5 transition-all select-none cursor-pointer"
                    >
                      <FastForward className="w-4 h-4" />
                      Advance Daily Cycle
                    </button>
                  )}

                  {/* Resource reliefs supervisors actions */}
                  <div className="pt-3 border-t border-muffin-brown/10">
                    <button
                      onClick={handleDistributeRelief}
                      className="w-full py-2 border-2 border-dashed border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      🎁 Dispatch +2,000 U Raw Flour relief credits (all teams)
                    </button>
                  </div>
                </section>
              )}

              {/* SAFEGUARD ALARM SYSTEMS MONITOR */}
              {session.status !== 'waiting' && (
                <section className="bcard space-y-4">
                  <div className="flex items-center justify-between border-b border-muffin-brown/10 pb-2">
                    <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-emerald-600" /> Crew Safeguard Guardrails
                    </h2>
                    
                    <button
                      onClick={() => setAlertSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      className={`p-1.5 rounded-full border transition-all cursor-pointer ${alertSettings.soundEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-zinc-900/5 dark:bg-white/5 border-muffin-brown/10 text-gray-400'}`}
                      title={alertSettings.soundEnabled ? "Audible warning sound active" : "Warning sound muted"}
                    >
                      {alertSettings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="space-y-4 text-[11px] font-sans">
                    {/* Minimum balance alert slider */}
                    <div className="space-y-1.5 p-2.5 rounded-xl border border-muffin-brown/15 bg-zinc-950/5 dark:bg-white/5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold uppercase text-[9.5px] text-dynamic-text flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={alertSettings.cashEnabled}
                            onChange={(e) => setAlertSettings(prev => ({ ...prev, cashEnabled: e.target.checked }))}
                            className="rounded border-muffin-brown/30 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Total Cash Limit</span>
                        </label>
                        <span className="font-mono font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[10px]">
                          ₹{alertSettings.cashMin.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Alarm if team capital falls below boundary.</p>
                      <input 
                        type="range"
                        min={100000}
                        max={1500000}
                        step={50000}
                        disabled={!alertSettings.cashEnabled}
                        value={alertSettings.cashMin}
                        onChange={(e) => setAlertSettings(prev => ({ ...prev, cashMin: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
                      />
                    </div>

                    {/* Customer satisfaction slider */}
                    <div className="space-y-1.5 p-2.5 rounded-xl border border-muffin-brown/15 bg-zinc-950/5 dark:bg-white/5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold uppercase text-[9.5px] text-dynamic-text flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={alertSettings.satisfactionEnabled}
                            onChange={(e) => setAlertSettings(prev => ({ ...prev, satisfactionEnabled: e.target.checked }))}
                            className="rounded border-muffin-brown/30 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Customer Sat. Level</span>
                        </label>
                        <span className="font-mono font-black text-orange-500 bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.5 rounded text-[10px]">
                          {alertSettings.satisfactionMin}%
                        </span>
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Alarm if team customer satisfaction breaches boundary.</p>
                      <input 
                        type="range"
                        min={50}
                        max={100}
                        step={5}
                        disabled={!alertSettings.satisfactionEnabled}
                        value={alertSettings.satisfactionMin}
                        onChange={(e) => setAlertSettings(prev => ({ ...prev, satisfactionMin: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Active Warnings Alert summary panel */}
                  {allTeams.some(t => getTeamAlerts(t).length > 0) ? (
                    <div className="border border-red-500/20 bg-red-500/10 p-3 rounded-xl space-y-1.5 text-left">
                      <div className="flex items-center gap-1.5 font-sans font-black uppercase text-[9px] tracking-wider text-red-700 leading-none">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                        <span>Safeguard alarm breaches detected:</span>
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll pr-1">
                        {allTeams.map(team => {
                          const alerts = getTeamAlerts(team);
                          if (alerts.length === 0) return null;
                          return (
                            <div key={team.id} className="text-[9px] uppercase font-bold border-b border-muffin-brown/5 pb-1 last:border-0">
                              <span className="text-dynamic-text block font-black">{team.name}:</span>
                              <ul className="list-disc list-inside mt-0.5 text-[8.5px] text-red-650 font-mono space-y-0.5 leading-snug">
                                {alerts.map((al, idx) => (
                                  <li key={idx} className="font-semibold">{al.message}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-emerald-500/20 bg-emerald-500/10 p-2.5 rounded-xl text-center font-mono font-black text-[9px] text-emerald-600 dark:text-emerald-400 uppercase">
                      🟢 Lobbies comply with active safeguards
                    </div>
                  )}
                </section>
              )}

              {/* INDUSTRIAL MARKET DISRUPTION SHOCKS */}
              {session.status !== 'waiting' && (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream flex items-center gap-1.5 border-b border-muffin-brown/10 pb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Economics Disruptions Suite
                  </h2>

                  {session.activeEvent ? (
                    <div className="bg-red-500/15 border-l-4 border-red-500 p-3 text-[11px] text-dynamic-text rounded-xl space-y-2 relative overflow-hidden">
                      <span className="absolute -right-3 -bottom-3 text-7xl text-red-500/10 font-black">⚠️</span>
                      <div className="flex items-center gap-1 font-sans font-black uppercase text-[9px] tracking-wider text-red-600">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                        ACTIVE SHOCK EVENT DISPATCHED
                      </div>
                      <div className="font-serif italic text-[11.5px] text-red-800 dark:text-red-300">
                        "{session.activeEvent.message}"
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-red-400/20 font-mono text-[9px] uppercase tracking-wider font-extrabold text-red-700 dark:text-red-400">
                        <span>Severity: {session.activeEvent.severity}</span>
                        <button
                          onClick={() => { playBeep(200, 'sine', 0.05); triggerEvent(null); }}
                          className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white rounded-lg border border-red-950 text-[8px] cursor-pointer"
                        >
                          Clear Shock
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10.5px]/relaxed uppercase font-black font-mono">
                      🟢 Arena status stable. Standard margins apply.
                    </div>
                  )}

                  <div className="space-y-4 pt-3 border-t border-muffin-brown/10 text-left">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-gray-500 block">1. Select Disruption Category</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => { playBeep(330, 'sine', 0.04); setSelectedEventType('demand_surge'); }}
                          className={`py-2 px-1 text-center font-bold text-[9px] uppercase border transition-all rounded-lg cursor-pointer ${selectedEventType === 'demand_surge' ? 'bg-[#2D4A6B] text-white border-black shadow-inner' : 'bg-white border-muffin-brown/20 text-[#333] hover:bg-gray-50'}`}
                        >
                          📈 Demand Surge
                        </button>
                        <button
                          onClick={() => { playBeep(330, 'sine', 0.04); setSelectedEventType('material_shortage'); }}
                          className={`py-2 px-1 text-center font-bold text-[9px] uppercase border transition-all rounded-lg cursor-pointer ${selectedEventType === 'material_shortage' ? 'bg-[#2D4A6B] text-white border-black shadow-inner' : 'bg-white border-muffin-brown/20 text-[#333] hover:bg-gray-50'}`}
                        >
                          🛑 Cost Spike
                        </button>
                        <button
                          onClick={() => { playBeep(330, 'sine', 0.04); setSelectedEventType('machine_breakdown'); }}
                          className={`py-2 px-1 text-center font-bold text-[9px] uppercase border transition-all rounded-lg cursor-pointer ${selectedEventType === 'machine_breakdown' ? 'bg-[#2D4A6B] text-white border-black shadow-inner' : 'bg-white border-muffin-brown/20 text-[#333] hover:bg-gray-50'}`}
                        >
                          💥 Oven Breakdown
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-gray-500 block">2. Severity Magnitude</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['low', 'medium', 'high'] as const).map((sev) => (
                          <button
                            key={sev}
                            onClick={() => { playBeep(290, 'sine', 0.04); setSelectedSeverity(sev); }}
                            className={`py-1.5 font-bold uppercase text-[9px] border transition-all rounded-lg cursor-pointer ${selectedSeverity === sev ? 'bg-amber-600 text-white border-amber-800 shadow-inner' : 'bg-white border-muffin-brown/20 text-gray-600 hover:bg-gray-50'}`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview message block */}
                    <div className="bg-zinc-950/5 dark:bg-white/5 border border-muffin-brown/15 p-2.5 rounded-xl text-[8.5px]/snug uppercase font-mono tracking-tight font-black">
                      <span className="text-gray-500 block mb-1">🔍 PREVIEW DISRUPTION MATRIX:</span>
                      {selectedEventType === 'demand_surge' && (
                        <div className="text-blue-800 dark:text-blue-300 font-extrabold">
                          Surge Demand Volume: +{selectedSeverity === 'low' ? '30% client orders' : selectedSeverity === 'medium' ? '60% client orders' : '100% Demand Surge!'}
                        </div>
                      )}
                      {selectedEventType === 'material_shortage' && (
                        <div className="text-red-750 dark:text-red-400 font-extrabold">
                          Ingredients Cost Index: x{selectedSeverity === 'low' ? '1.5 markup' : selectedSeverity === 'medium' ? '2.0 Double cost' : '3.0 Triple cost!'}
                        </div>
                      )}
                      {selectedEventType === 'machine_breakdown' && (
                        <div className="text-amber-700 dark:text-amber-400 font-extrabold">
                          Baking line capacity speed: -{selectedSeverity === 'low' ? '20% assembly pace' : selectedSeverity === 'medium' ? '40% assembly pace' : '65% Severe bottleneck!'}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleInjectEvent}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-muffin-espresso font-sans font-black uppercase tracking-widest text-xs py-3 rounded-xl border-b-4 border-amber-800 shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 active:border-b transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Inject Disruption Shock
                    </button>
                  </div>
                </section>
              )}

            </div>

            {/* Right Rankings & Ledger List Column (2/3 width, scrollable) */}
            <div className="lg:col-span-2 h-full overflow-y-auto custom-scroll pr-1 pb-6 space-y-6">
              
              <section className="bcard space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-muffin-brown/10 pb-3 gap-3">
                  <div className="space-y-0.5 text-left">
                    <h2 className="font-sans font-black text-sm uppercase tracking-wider text-muffin-brown dark:text-muffin-cream">
                      Registered Student Cohorts Ledger
                    </h2>
                    <p className="text-[9px] uppercase font-mono font-bold text-gray-500">
                      Currently active: {allTeams.length} teams
                    </p>
                  </div>
                  {session.status !== 'waiting' && (
                    <button
                      onClick={handleDownloadAllCSV}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 border-b-4 border-emerald-950 shadow-md rounded-xl transition-all select-none cursor-pointer active:translate-y-0.5 active:border-b"
                    >
                      <Download className="w-4 h-4" /> Export Simulation grading Sheet (CSV)
                    </button>
                  )}
                </div>

                {allTeams.length === 0 ? (
                  <div className="text-center py-20 bg-zinc-950/5 dark:bg-white/5 rounded-2xl border border-dashed border-muffin-brown/25">
                    <span className="text-6xl block animate-bounce mb-4">🧁</span>
                    <p className="text-[10px] font-mono font-black uppercase text-gray-400 tracking-widest leading-relaxed">
                      Waiting for students to connect to factory floor...<br/>
                      <span className="text-slate-700 bg-muffin-gold/15 border border-muffin-gold/30 px-3 py-1.5 text-[14px] rounded-xl mt-3.5 inline-block font-sans lowercase">Provide code: <span className="font-mono uppercase font-black tracking-normal text-muffin-brown dark:text-muffin-cream">{session.code}</span></span>
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-muffin-brown/15">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-[#2D4A6B]/15 text-[#2d4a6b] font-black uppercase tracking-wider border-b border-muffin-brown/15 select-none">
                          <th className="p-3 text-center">Rank</th>
                          <th className="p-3">Team Name</th>
                          <th className="p-3">Total Cash (INR)</th>
                          <th className="p-3">Muffin Stock</th>
                          <th className="p-3">Satisfaction</th>
                          <th className="p-3 text-right pr-4">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muffin-brown/10 font-bold uppercase text-slate-700 dark:text-zinc-300">
                        {sortedTeams.map((team, index) => {
                          const stars = getStarsCount(team.balance) || 0;
                          const teamAlerts = getTeamAlerts(team);
                          const hasCashAlert = teamAlerts.some(a => a.type === 'cash');
                          const hasSatAlert = teamAlerts.some(a => a.type === 'sat');
                          const hasAnyAlert = teamAlerts.length > 0;

                          return (
                            <tr 
                              key={team.id} 
                              className={`transition-colors duration-200 ${
                                hasAnyAlert 
                                  ? 'bg-red-500/10 border-l-4 border-red-500' 
                                  : 'hover:bg-zinc-950/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <td className="p-3 font-mono font-black text-center text-slate-500 w-14">
                                #{index + 1}
                              </td>
                              <td className="p-3 text-left">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-dynamic-text block text-sm tracking-tight">{team.name}</span>
                                    {hasAnyAlert && (
                                      <span className="inline-flex bg-red-650 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse leading-none border border-red-800">
                                        Safeguard Alert
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <span key={i} className={`text-xs ${i < stars ? 'text-yellow-500 font-extrabold' : 'text-gray-300'}`}>⭐</span>
                                    ))}
                                  </div>

                                  {/* safeguards alert highlights */}
                                  {hasAnyAlert && (
                                    <div className="space-y-0.5 mt-1 border-t border-red-500/10 pt-1">
                                      {teamAlerts.map((al, idx) => (
                                        <div 
                                          key={idx} 
                                          className="text-[7.5px] font-mono font-bold text-red-600 dark:text-red-400 tracking-wide flex items-center gap-1 lowercase"
                                        >
                                          <span className="w-1 h-1 bg-red-500 rounded-full inline-block" />
                                          <span>{al.message}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              <td className={`p-3 font-mono font-black text-[12.5px] transition-all duration-300 ${
                                hasCashAlert 
                                  ? 'text-red-600 bg-red-500/15 rounded-lg border border-red-500/20 font-black animate-pulse' 
                                  : 'text-emerald-600'
                              }`}>
                                ₹{team.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              
                              <td className="p-3 font-mono font-extrabold text-dynamic-text/80">
                                {(team.inventory?.standard || 0).toLocaleString()} un
                              </td>
                              
                              <td className={`p-3 font-mono font-black transition-all duration-300 ${
                                hasSatAlert 
                                  ? 'text-red-600 bg-red-500/15 rounded-lg border border-red-500/20 font-black animate-pulse' 
                                  : 'text-orange-500'
                              }`}>
                                {team.satisfaction || 100}% CSAT
                              </td>
                              
                              <td className="p-3 text-right">
                                <div className="flex gap-2.5 justify-end">
                                  <button
                                    onClick={() => { playBeep(440, 'sine', 0.05); handleOpenInspect(team); }}
                                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg border border-[#3c3c3a] text-[9px] font-black uppercase inline-flex items-center gap-1 cursor-pointer select-none transition-all active:scale-95 shadow-xs"
                                  >
                                    <Eye className="w-3 h-3" /> Inspect / Intervene
                                  </button>
                                  
                                  <button
                                    onClick={() => { playBeep(440, 'sine', 0.05); handleDownloadTeamCSV(team.id, team.name); }}
                                    className="p-1.5 bg-zinc-950/5 dark:bg-white/5 text-emerald-600 hover:text-emerald-700 border border-muffin-brown/25 rounded-lg hover:bg-zinc-950/10 cursor-pointer"
                                    title="Download team ledger report"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <button
                                    onClick={() => { playBeep(200, 'sine', 0.08); handleDeleteTeam(team.id, team.name); }}
                                    className="p-1.5 bg-red-500/5 text-red-650 hover:text-white hover:bg-red-650 border border-red-500/20 rounded-lg cursor-pointer"
                                    title="Kick from session room"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Standalone Contract Manager Panel */}
              <section className="bcard space-y-4 text-left">
                <div className="border-b border-muffin-brown/10 pb-3">
                  <h2 className="font-sans font-black text-sm uppercase tracking-wider text-muffin-brown dark:text-muffin-cream flex items-center gap-2">
                    📋 Contract Manager
                  </h2>
                  <p className="text-[9px] uppercase font-mono font-bold text-gray-500">
                    Create and push custom distribution contracts to all student teams
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Section A: Create New Contract */}
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-black tracking-wider text-[#8c7662]">
                      Create New Contract
                    </h3>
                    <form onSubmit={handlePushContract} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-500 block">Contract Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Super Mart Wholesale"
                          value={newContractName}
                          onChange={(e) => setNewContractName(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                        />
                        {contractFormErrors.name && (
                          <span className="text-[9.5px] font-bold text-red-500 block">{contractFormErrors.name}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Appears on Day</label>
                          <input
                            type="number"
                            min={1}
                            value={newContractAppears}
                            onChange={(e) => setNewContractAppears(parseInt(e.target.value) || 1)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Active from Day</label>
                          <input
                            type="number"
                            min={1}
                            value={newContractBegins}
                            onChange={(e) => setNewContractBegins(parseInt(e.target.value) || 1)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.begins && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.begins}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Active until Day</label>
                          <input
                            type="number"
                            min={1}
                            value={newContractEnds}
                            onChange={(e) => setNewContractEnds(parseInt(e.target.value) || 1)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.ends && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.ends}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Daily Demand (un)</label>
                          <input
                            type="number"
                            min={1}
                            value={newContractDemand}
                            onChange={(e) => setNewContractDemand(parseInt(e.target.value) || 1)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.demand && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.demand}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Price per Unit (₹)</label>
                          <input
                            type="number"
                            min={1}
                            value={newContractPrice}
                            onChange={(e) => setNewContractPrice(parseInt(e.target.value) || 1)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.price && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.price}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Fill Rate Req (%)</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={newContractFillRate}
                            onChange={(e) => setNewContractFillRate(parseInt(e.target.value) || 1)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.fillRate && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.fillRate}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Penalty if Missed (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={newContractFillPenalty}
                            onChange={(e) => setNewContractFillPenalty(parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.fillPenalty && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.fillPenalty}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 block">Exit Penalty (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={newContractExitPenalty}
                            onChange={(e) => setNewContractExitPenalty(parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-muffin-brown/20 rounded font-mono text-xs text-dynamic-text focus:border-muffin-gold outline-none"
                          />
                          {contractFormErrors.exitPenalty && (
                            <span className="text-[8px] font-bold text-red-500 block">{contractFormErrors.exitPenalty}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black uppercase tracking-wider text-xs py-2.5 rounded-xl border-b-4 border-emerald-800 shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 active:border-b transition-all"
                      >
                        📤 Push Contract to All Teams
                      </button>
                    </form>
                  </div>

                  {/* Section B: Active Instructor Contracts */}
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-black tracking-wider text-[#8c7662]">
                      Active Instructor Contracts
                    </h3>
                    
                    <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3 custom-scroll">
                      {!session?.instructorContracts || session.instructorContracts.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-muffin-brown/15 rounded-xl text-center text-xs text-gray-400 italic">
                          No contracts created yet. Use the form above to push contracts to all student teams.
                        </div>
                      ) : (
                        session.instructorContracts.map(c => {
                          const currentRound = session?.currentRound ?? 1;
                          const status = getInstructorContractStatus(c, currentRound);
                          const canRemove = status === 'PENDING' || status === 'OFFERED';
                          
                          let badgeBg = 'bg-zinc-100 text-zinc-800 border-zinc-300';
                          if (status === 'OFFERED') badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
                          if (status === 'ACTIVE') badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                          if (status === 'FINISHED') badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';

                          return (
                            <div key={c.id} className="p-3 bg-zinc-950/5 dark:bg-white/5 border border-muffin-brown/15 rounded-xl text-xs space-y-2 relative">
                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold uppercase text-dynamic-text block">{c.name}</span>
                                  <span className="text-[10px] text-gray-500 block">
                                    Days: {c.appearsAtDay} &rarr; {c.beginsAtDay} &rarr; {c.endsAtDay}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase font-mono tracking-wider ${badgeBg}`}>
                                    {status}
                                  </span>
                                  {canRemove && (
                                    <button
                                      onClick={async () => {
                                        if (window.confirm('Remove this contract from all teams?')) {
                                          playBeep(220, 'sawtooth', 0.1);
                                          await removeInstructorContract(c.id);
                                          showToast(`Contract "${c.name}" removed`);
                                        }
                                      }}
                                      className="p-1 hover:bg-red-500/10 hover:text-red-650 text-zinc-400 rounded-lg cursor-pointer transition-all"
                                      title="Remove contract"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 font-mono text-[9px] uppercase tracking-wider text-dynamic-text/75 bg-white dark:bg-zinc-950 p-2 border border-muffin-brown/10 rounded-lg">
                                <div>
                                  <span className="text-[7px] block font-bold text-gray-400 leading-none">Demand</span>
                                  <span className="font-black">{c.dailyDemand} un/d</span>
                                </div>
                                <div>
                                  <span className="text-[7px] block font-bold text-gray-400 leading-none">₹/unit</span>
                                  <span className="font-black">₹{c.pricePerUnit}</span>
                                </div>
                                <div>
                                  <span className="text-[7px] block font-bold text-gray-400 leading-none">Fill rate</span>
                                  <span className="font-black">{c.fillRateRequired}%</span>
                                </div>
                                <div>
                                  <span className="text-[7px] block font-bold text-gray-400 leading-none">Penalty</span>
                                  <span className="font-black">₹{c.fillRatePenalty}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </main>
        ) : (
          /* Scenarios Catalog View (h-screen scrollable) */
          <main className="h-full p-6 max-w-[1200px] mx-auto overflow-y-auto custom-scroll pb-16 space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <section className="bcard space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-muffin-brown/10 pb-3 gap-3 text-left">
                <div className="space-y-0.5">
                  <h2 className="font-sans font-black text-lg text-dynamic-text uppercase tracking-tight">Active Scenarios Catalog</h2>
                  <p className="text-[10px] uppercase font-mono font-bold text-gray-500">Configure parameters and launch specialized class runs</p>
                </div>
                <button
                  onClick={() => { playBeep(587.33, 'triangle', 0.1); openScenarioEditor(); }}
                  className="flex items-center gap-1.5 bg-[#2D4A6B] text-white hover:bg-[#34557b] px-4 py-2 border-b-4 border-slate-900 rounded-xl font-black text-xs uppercase transition-all shadow-md select-none cursor-pointer active:translate-y-0.5 active:border-b"
                >
                  <Plus className="w-4 h-4" /> Create Custom Scenario
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-left">
                {PRESET_SCENARIOS.concat(customScenarios).map((scen, idx) => {
                  const isPreset = idx < PRESET_SCENARIOS.length;
                  return (
                    <div key={scen.id} className="border border-muffin-brown/15 hover:border-muffin-gold/60 p-5 rounded-2xl bg-zinc-950/5 dark:bg-white/5 space-y-4 relative overflow-hidden transition-all duration-300">
                      <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider rounded-bl bg-muffin-brown/10 text-muffin-brown dark:text-muffin-cream shadow-xs">
                        {isPreset ? '🎯 PRESET STANDARD' : '🛡️ CUSTOM'}
                      </div>

                      <div className="space-y-1 text-left">
                        <h3 className="font-sans font-black text-sm text-dynamic-text uppercase tracking-tight">
                          {scen.name}
                        </h3>
                        <p className="text-[11.5px] text-dynamic-text/70 leading-relaxed font-serif italic">
                          "{scen.description}"
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 font-mono text-[9px] uppercase tracking-wider font-extrabold text-dynamic-text/70 bg-white dark:bg-zinc-950 border border-muffin-brown/15 p-3 rounded-xl">
                        <div>
                          <span className="text-[7.5px] block font-bold text-gray-400 leading-none">TIMELINE DAYS</span>
                          <span className="text-xs text-[#2D4A6B] dark:text-[#5c8dbe] font-bold">{scen.simulatedDays} Days</span>
                        </div>
                        <div>
                          <span className="text-[7.5px] block font-bold text-gray-400 leading-none">REAL TIME LIMIT</span>
                          <span className="text-xs text-[#2D4A6B] dark:text-[#5c8dbe] font-bold">{scen.lengthRealTime} Mins</span>
                        </div>
                        <div>
                          <span className="text-[7.5px] block font-bold text-gray-400 leading-none">ORDER COST (S)</span>
                          <span className="text-xs text-[#2D4A6B] dark:text-[#5c8dbe] font-bold">₹{scen.fixedCostPerOrder} setup</span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-muffin-brown/10">
                        <button
                          onClick={() => { playBeep(290, 'sine', 0.05); handleCopyScenario(scen); }}
                          className="p-1.5 px-3 border border-muffin-brown/20 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 text-[9px] font-black uppercase transition-all cursor-pointer select-none active:scale-95"
                        >
                          Copy Preset
                        </button>
                        
                        {!isPreset && (
                          <>
                            <button
                              onClick={() => { playBeep(440, 'sine', 0.05); openScenarioEditor(scen); }}
                              className="p-1.5 px-3 border border-[#2D4A6B] text-[#2D4A6B] dark:text-[#5c8dbe] rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 text-[9px] font-black uppercase transition-all cursor-pointer select-none active:scale-95"
                            >
                              Edit Config
                            </button>
                            <button
                              onClick={() => { playBeep(200, 'sine', 0.08); handleDeleteScenario(scen.id, scen.name); }}
                              className="p-2 bg-red-500/5 border border-red-500/20 rounded-lg text-red-650 hover:bg-red-650 hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
        )}
      </div>

      {/* DETAILED STUDENT INSPECTOR & OVERRIDE OVERLAY MODAL */}
      <AnimatePresence>
        {inspectTeam && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 text-[#120d07]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#f7f0e6] border-4 border-muffin-brown max-w-md w-full p-6 shadow-2xl relative rounded-2xl text-left"
            >
              {/* Scanline premium overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#120d07_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none" />

              <button 
                onClick={() => { playBeep(200, 'sine', 0.05); setInspectTeam(null); }}
                className="absolute top-4 right-4 text-zinc-500 hover:text-black font-black cursor-pointer text-sm font-sans z-[100] border-none bg-transparent hover:scale-110 duration-200 transition-all select-none"
              >
                ✕
              </button>

              <div className="border-b border-muffin-brown/15 pb-2 mb-4">
                <h3 className="font-sans font-black text-sm uppercase text-[#2c1a0a] tracking-wide">
                  💼 Intervene Team Operations
                </h3>
                <span className="font-mono text-[8px] uppercase tracking-wider text-muffin-gold block mt-0.5">Override operational values: {inspectTeam.name}</span>
              </div>

              <div className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-gray-500 block">Ledger Cash Treasury (₹)</label>
                    <input
                      type="number"
                      value={interveneCash}
                      onChange={(e) => setInterveneCash(e.target.value)}
                      className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-gray-500 block">Silo Stock Flour (un)</label>
                    <input
                      type="number"
                      value={interveneMaterials}
                      onChange={(e) => setInterveneMaterials(e.target.value)}
                      className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-gray-500 block">Safety Order Size Q</label>
                    <input
                      type="number"
                      value={interveneQ}
                      onChange={(e) => setInterveneQ(e.target.value)}
                      className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-gray-500 block">Reorder trigger Point R</label>
                    <input
                      type="number"
                      value={interveneR}
                      onChange={(e) => setInterveneR(e.target.value)}
                      className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-[9px] uppercase font-bold text-gray-500 block">Assigned Contracts</label>
                <div className="bg-white/80 border border-muffin-brown/20 p-2 rounded max-h-32 overflow-y-auto">
                  {(session?.instructorContracts || []).map(c => (
                    <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muffin-brown/5">
                      <input 
                        type="checkbox" 
                        checked={interveneContracts.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setInterveneContracts(prev => [...prev, c.id]);
                          else setInterveneContracts(prev => prev.filter(id => id !== c.id));
                        }}
                        className="w-3 h-3 text-muffin-brown focus:ring-muffin-brown rounded border-gray-300"
                      />
                      <span className="font-sans text-[10px] text-gray-800">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3.5 mt-6 pt-3 border-t border-muffin-brown/15 z-50 relative">
                <button
                  onClick={() => { playBeep(200, 'sine', 0.05); setInspectTeam(null); }}
                  className="px-4 py-2 border border-muffin-brown/30 text-[#6b4e30] font-sans font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIntervention}
                  className="px-5 py-2 bg-[#2c1a0a] text-[#f7f0e6] font-sans font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-slate-900 shadow-md border-b-2 border-black transition-all cursor-pointer"
                >
                  💾 Apply Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6-STEP PRESETS SCENARIO WIZARD CREATOR MODAL */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 text-[#120d07]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#f7f0e6] border-4 border-muffin-brown max-w-2xl w-full p-6 shadow-2xl relative rounded-2xl text-left"
            >
              {/* Scanline premium overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#120d07_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none" />

              <button 
                onClick={() => { playBeep(200, 'sine', 0.05); setShowWizard(false); }}
                className="absolute top-4 right-4 text-zinc-500 hover:text-black font-black cursor-pointer text-sm font-sans z-[100] border-none bg-transparent hover:scale-110 duration-200 transition-all select-none"
              >
                ✕
              </button>

              <div className="border-b border-muffin-brown/15 pb-2 mb-4 flex justify-between items-end">
                <div className="space-y-0.5">
                  <h3 className="font-sans font-black text-sm uppercase text-[#2c1a0a] tracking-wide">
                    🛡️ Custom Scenario Wizard
                  </h3>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-muffin-gold block">Experience calibrations and starting configurations</span>
                </div>
                <div className="font-mono text-[10px] font-black bg-muffin-gold/15 border border-muffin-gold/30 px-2 py-0.5 rounded text-muffin-brown select-none">
                  Step {wizardStep} / 5
                </div>
              </div>

              {/* Loader progress ticks */}
              <div className="w-full bg-[#deccb0] h-1.5 rounded-full overflow-hidden mb-5">
                <div className="bg-muffin-gold h-full duration-300 transition-all" style={{ width: `${(wizardStep / 5) * 100}%` }} />
              </div>

              <div className="min-h-[250px] py-1">
                
                {/* STEP 1: Metadata */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">Step 1: Experience Metadata & Chronology</h4>
                    <div className="grid grid-cols-2 gap-4 font-semibold text-xs text-[#2c1a0a]">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold block">Scenario Title</label>
                        <input type="text" value={wName} onChange={(e) => setWName(e.target.value)} className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold block">Description Brief</label>
                        <input type="text" value={wDescription} onChange={(e) => setWDescription(e.target.value)} className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold block">Simulated Days Length</label>
                        <input type="number" value={wSimulatedDays} onChange={(e) => setWSimulatedDays(parseInt(e.target.value) || 10)} className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold block">Real Time session duration (Minutes)</label>
                        <input type="number" value={wLengthRealTime} onChange={(e) => setWLengthRealTime(parseInt(e.target.value) || 15)} className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold block">Raw materials Purchase cost (₹)</label>
                        <input type="number" value={wRmUnitPrice} onChange={(e) => setWRmUnitPrice(parseFloat(e.target.value) || 2)} className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 font-bold block">Retail Sales Value (₹)</label>
                        <input type="number" value={wSellingPrice} onChange={(e) => setWSellingPrice(parseFloat(e.target.value) || 20)} className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Walk-In Customers Demand Breaking Points */}
                {wizardStep === 2 && (
                  <div className="space-y-4 animate-[fadeIn_0.3s_ease-out] text-xs">
                    <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">Step 2: walk-in retail demand breaking points</h4>
                    
                    <div className="flex justify-between items-center p-2 rounded-lg border border-muffin-brown/15 bg-white">
                      <span className="font-semibold">Activate Poisson Distribution random demand:</span>
                      <button
                        type="button"
                        onClick={() => { playBeep(260, 'sine', 0.05); setWPoissonDemand(!wPoissonDemand); }}
                        className={`w-14 py-1.5 rounded font-mono font-black border text-xs text-center transition-all cursor-pointer ${wPoissonDemand ? 'bg-emerald-605 bg-emerald-600 text-white border-emerald-800 shadow-sm' : 'bg-gray-300 text-gray-800 border-gray-400'}`}
                      >
                        {wPoissonDemand ? 'Yes' : 'No'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block">Linear demand breaking points:</span>
                      <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll">
                        {wBreakingPoints.map((bp, i) => (
                          <div key={i} className="flex justify-between items-center bg-white border border-muffin-brown/15 p-2 text-xs rounded-lg font-mono font-bold">
                            <span>Day <span className="font-black text-slate-800">{bp.day}</span> &rarr; Demand Volume <span className="font-black text-emerald-650">{bp.demand} Muffins</span></span>
                            <button
                              type="button"
                              onClick={() => setWBreakingPoints(wBreakingPoints.filter((_, idx) => idx !== i))}
                              className="text-red-650 font-sans font-bold uppercase text-[9px] cursor-pointer"
                            >
                              Delete Point
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-muffin-brown/15 p-3 rounded-xl bg-zinc-950/5 grid grid-cols-2 gap-3.5 text-xs font-semibold text-slate-700">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 block">Coordinate Day Office</label>
                        <input
                          type="number"
                          value={tempBPDay}
                          onChange={(e) => setTempBPDay(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-1.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-500 block">Retail Demand Volume (un)</label>
                        <input
                          type="number"
                          value={tempBPDemand}
                          onChange={(e) => setTempBPDemand(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-1.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedBPs = [...wBreakingPoints, { day: tempBPDay, demand: tempBPDemand }];
                          updatedBPs.sort((a, b) => a.day - b.day);
                          setWBreakingPoints(updatedBPs);
                        }}
                        className="w-full col-span-2 bg-[#2c1a0a] hover:bg-slate-900 text-white rounded-lg font-sans font-black uppercase text-[10px] py-2 text-center border-none cursor-pointer shadow-xs"
                      >
                        ➕ Add Coordinate Point
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Initial starting team conditions */}
                {wizardStep === 3 && (
                  <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">Step 3: Initial team starting parameters</h4>
                    <div className="grid grid-cols-2 gap-4 font-semibold text-xs text-[#2c1a0a]">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Starting Cash per team (₹)</label>
                        <input
                          type="number"
                          value={wInitialCash}
                          onChange={(e) => setWInitialCash(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Starting Silo Materials (un)</label>
                        <input
                          type="number"
                          value={wInitialRawMaterials}
                          onChange={(e) => setWInitialRawMaterials(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Initial Q order size</label>
                        <input
                          type="number"
                          value={wInitialQ}
                          onChange={(e) => setWInitialQ(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Initial R reorder level</label>
                        <input
                          type="number"
                          value={wInitialR}
                          onChange={(e) => setWInitialR(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-muffin-brown/10 text-left">
                      <span className="text-[9.5px] uppercase font-black text-gray-500 block mb-2">Initial Starting machine assets</span>
                      <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold text-slate-700">
                        <div className="bg-red-500/5 p-2.5 border border-muffin-brown/15 rounded-xl">
                          <label className="text-[8.5px] uppercase text-red-800 block mb-1">Mixing lines</label>
                          <input
                            type="number"
                            value={wMachinesMixing}
                            onChange={(e) => setWMachinesMixing(parseInt(e.target.value))}
                            className="w-16 bg-white border p-1 text-center text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="bg-amber-500/5 p-2.5 border border-muffin-brown/15 rounded-xl">
                          <label className="text-[8.5px] uppercase text-yellow-800 block mb-1">Baking ovens</label>
                          <input
                            type="number"
                            value={wMachinesBottling}
                            onChange={(e) => setWMachinesBottling(parseInt(e.target.value))}
                            className="w-16 bg-white border p-1 text-center text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="bg-emerald-500/5 p-2.5 border border-muffin-brown/15 rounded-xl">
                          <label className="text-[8.5px] uppercase text-emerald-800 block mb-1">Packaging lines</label>
                          <input
                            type="number"
                            value={wMachinesPackaging}
                            onChange={(e) => setWMachinesPackaging(parseInt(e.target.value))}
                            className="w-16 bg-white border p-1 text-center text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Capacity stations configure */}
                {wizardStep === 4 && (
                  <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">Step 4: Capacity speeds & Purchase Costs</h4>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-[#2c1a0a] text-left">
                      <div className="border border-muffin-brown/15 bg-red-500/5 p-3 rounded-xl space-y-2">
                        <span className="text-[9.5px] text-red-800 block font-bold border-b pb-1">🥣 MIX STATION</span>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={wMixCap} onChange={(e) => setWMixCap(parseInt(e.target.value))} className="w-full bg-white border p-1.5 font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost (₹)</label>
                          <input type="number" value={wMixPrice} onChange={(e) => setWMixPrice(parseInt(e.target.value))} className="w-full bg-white border p-1.5 font-mono" />
                        </div>
                      </div>

                      <div className="border border-muffin-brown/15 bg-amber-500/5 p-3 rounded-xl space-y-2">
                        <span className="text-[9.5px] text-yellow-800 block font-bold border-b pb-1">🔥 OVEN STATION</span>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={wBotCap} onChange={(e) => setWBotCap(parseInt(e.target.value))} className="w-full bg-white border p-1.5 font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost (₹)</label>
                          <input type="number" value={wBotPrice} onChange={(e) => setWBotPrice(parseInt(e.target.value))} className="w-full bg-white border p-1.5 font-mono" />
                        </div>
                      </div>

                      <div className="border border-muffin-brown/15 bg-emerald-500/5 p-3 rounded-xl space-y-2">
                        <span className="text-[9.5px] text-emerald-800 block font-bold border-b pb-1">📦 PACK STATION</span>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={wPackCap} onChange={(e) => setWPackCap(parseInt(e.target.value))} className="w-full bg-white border p-1.5 font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost (₹)</label>
                          <input type="number" value={wPackPrice} onChange={(e) => setWPackPrice(parseInt(e.target.value))} className="w-full bg-white border p-1.5 font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Star Score thresholds */}
                {wizardStep === 5 && (
                  <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">Step 5: Stars Achievement thresholds</h4>
                    <p className="text-[10px] text-gray-400 font-serif leading-relaxed uppercase font-bold text-center">Define student grading star ratings based on cumulative total cash.</p>
                    
                    <div className="space-y-4 max-w-sm mx-auto p-4 border border-muffin-brown/15 rounded-xl bg-zinc-950/5 font-semibold text-xs text-[#2c1a0a]">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-500 block">⭐ 1 Star Threshold (₹)</label>
                        <input
                          type="number"
                          value={wStar1}
                          onChange={(e) => setWStar1(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2 text-xs font-mono font-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-500 block">⭐⭐ 2 Stars Threshold (₹)</label>
                        <input
                          type="number"
                          value={wStar2}
                          onChange={(e) => setWStar2(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2 text-xs font-mono font-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-500 block">⭐⭐⭐ 3 Stars Threshold (₹)</label>
                        <input
                          type="number"
                          value={wStar3}
                          onChange={(e) => setWStar3(parseInt(e.target.value))}
                          className="w-full bg-white border border-muffin-brown/20 p-2 text-xs font-mono font-black"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Wizard footer */}
              <div className="flex justify-between items-center pt-3 border-t border-muffin-brown/15 z-50 relative">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                  className="px-4 py-2 border border-muffin-brown/30 text-[#6b4e30] font-sans font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-all"
                >
                  &larr; Previous Step
                </button>

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => Math.min(5, s + 1))}
                    className="px-5 py-2 bg-[#2c1a0a] text-white rounded-lg font-sans font-black uppercase text-[10px] tracking-wider hover:bg-slate-900 cursor-pointer shadow-md"
                  >
                    Next Step &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveWizard}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-sans font-black uppercase text-xs tracking-wider border-b-4 border-green-950 active:translate-y-0.5 active:border-b shadow-md transition-all cursor-pointer"
                  >
                    💾 Save Experience Configuration
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PROJECTOR DISPLAY MULTIPLAYER LEADERBOARD */}
      <AnimatePresence>
        {showFullscreenLeaderboard && (
          <div className="fixed inset-0 bg-[#0d0c0a] z-[1000] flex flex-col p-8 overflow-hidden select-none">
            {/* Scanline premium overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#f7f0e6_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none" />

            <div className="flex justify-between items-center border-b-2 border-muffin-brown/15 pb-4 mb-6">
              <div className="flex items-center gap-4 text-left">
                <span className="text-4xl">🏆</span>
                <div>
                  <h2 className="font-serif italic text-3xl text-muffin-gold uppercase tracking-wide leading-none">Muffin Factory Cohorts Leaderboard</h2>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500 mt-1 block">Live Corporate Net treasury Liquidity rankings</span>
                </div>
              </div>
              
              <button
                onClick={() => { playBeep(200, 'sine', 0.05); setShowFullscreenLeaderboard(false); }}
                className="bg-zinc-900 border border-zinc-750 text-white hover:text-muffin-gold font-mono font-black px-4 py-2 rounded-xl text-xs cursor-pointer active:scale-95 shadow-md transition-all"
              >
                Exit Projector Board [X]
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll max-w-4xl mx-auto w-full border border-muffin-brown/20 bg-zinc-950/20 rounded-2xl p-6">
              <table className="w-full text-left font-sans text-sm">
                <thead>
                  <tr className="bg-[#2D4A6B]/15 text-[#5c8dbe] font-black uppercase tracking-wider border-b border-muffin-brown/15 select-none text-xs">
                    <th className="p-4 text-center">Rank</th>
                    <th className="p-4">Corporate Plant Name</th>
                    <th className="p-4">Operations Day</th>
                    <th className="p-4">Rating CSAT</th>
                    <th className="p-4 text-right">Total Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muffin-brown/10 font-bold uppercase text-zinc-300">
                  {sortedTeams.map((team, idx) => {
                    const stars = getStarsCount(team.balance) || 0;
                    const medal = idx === 0 ? "🥇 1st" : idx === 1 ? "🥈 2nd" : idx === 2 ? "🥉 3rd" : `#${idx + 1}`;
                    return (
                      <tr 
                        key={team.id}
                        className={`transition-colors duration-200 ${idx === 0 ? 'bg-amber-500/10 text-white font-extrabold text-base' : 'hover:bg-white/5'}`}
                      >
                        <td className="p-4 font-mono font-black text-center text-muffin-gold w-20">
                          {medal}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="block text-white tracking-tight">{team.name}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <span key={i} className={`text-xs ${i < stars ? 'text-yellow-500 font-extrabold' : 'text-gray-800'}`}>⭐</span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-extrabold text-gray-400">
                          Day {team.tick ?? session.currentRound ?? 1}
                        </td>
                        <td className="p-4 font-mono text-orange-500">
                          {team.satisfaction || 100}% CSAT
                        </td>
                        <td className="p-4 font-mono text-right text-emerald-400 font-black text-[15px]">
                          ₹{team.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedTeams.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-gray-500 font-mono text-xs uppercase italic select-none">No student lobbies currently active in simulation arena...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM OVERLAY ALERT (NOTIFICATIONS) */}
      <AnimatePresence>
        {customNotification && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] px-4 text-[#120d07]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#f7f0e6] border-4 border-muffin-brown w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left relative"
            >
              {/* Scanline premium overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#120d07_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none" />

              <div className="bg-[#2c1a0a] text-white px-4 py-3 font-sans font-black uppercase text-xs tracking-wider flex items-center justify-between">
                <span>{customNotification.title || "Notice"}</span>
                <button
                  onClick={() => setCustomNotification(null)}
                  className="hover:text-red-400 transition-all text-gray-400 cursor-pointer bg-transparent border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 font-sans font-bold text-[#6b4e30] text-xs uppercase leading-relaxed text-left z-10 relative">
                {customNotification.message}
              </div>
              <div className="bg-muffin-gold/10 border-t border-muffin-brown/10 p-3 flex justify-end z-10 relative">
                <button
                  onClick={() => setCustomNotification(null)}
                  className="px-4 py-2 bg-[#2c1a0a] hover:bg-slate-900 text-white font-sans font-black uppercase text-[10px] tracking-wider rounded-lg transition-all cursor-pointer shadow-md border-b border-black"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM OVERLAY CONFIRMATION */}
      <AnimatePresence>
        {customConfirm && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] px-4 text-[#120d07]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#f7f0e6] border-4 border-muffin-brown w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left relative"
            >
              {/* Scanline premium overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#120d07_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none" />

              <div className="bg-[#2c1a0a] text-white px-4 py-3 font-sans font-black uppercase text-xs tracking-wider flex items-center justify-between">
                <span>{customConfirm.title || "Confirmation Required"}</span>
                <button
                  onClick={() => setCustomConfirm(null)}
                  className="hover:text-red-400 transition-all text-gray-400 cursor-pointer bg-transparent border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 font-sans font-black text-[#2c1a0a] text-xs uppercase leading-relaxed text-left z-10 relative">
                {customConfirm.message}
              </div>
              <div className="bg-muffin-gold/10 border-t border-muffin-brown/10 p-3 flex justify-end gap-2.5 z-10 relative">
                <button
                  onClick={() => setCustomConfirm(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-sans font-black uppercase text-[10px] tracking-wider rounded-lg border border-muffin-brown/20 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-sans font-black uppercase text-[10px] tracking-wider rounded-lg border border-red-750 transition-all cursor-pointer shadow-md"
                >
                  {customConfirm.confirmLabel || "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-emerald-600 text-white font-sans font-black uppercase text-[10px] tracking-wider px-4 py-3 rounded-xl shadow-2xl border-2 border-emerald-800 z-[9999]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
