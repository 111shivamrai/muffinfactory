import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { motion, useInView } from 'motion/react';
import {
  ArrowRight, Check, ChevronDown, ChevronRight, X,
  Factory, Boxes, AlertTriangle, Users, Gamepad2, BarChart3,
  Play, LogIn, Mail, Lock, Eye, EyeOff, Monitor, GraduationCap,
  Shield, Clock, DollarSign, TrendingUp, Award, Zap, Menu,
  BookOpen, Settings, LayoutDashboard, PieChart, Package,
  Cpu, Truck, Gauge, Star, Globe, Building2, Phone
} from 'lucide-react';

import { useGame } from '../context/GameContext';
import { MuffinFactoryDashboardPreview } from './MuffinFactoryDashboardPreview';

/* ─── Props ──────────────────────────────────────────────────── */
interface Props {
  login?: () => Promise<void>; // Kept for backwards compatibility but unused in the new modal
  setIsDirectPlay: (active: boolean) => void;
}

/* ─── Design Tokens ──────────────────────────────────────────── */
const T = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Manrope', sans-serif",
  mono: "'Inconsolata', monospace",
  white: '#fff',
  off: '#f9f9f7',
  subtle: '#f3f3f0',
  border: '#e8e8e3',
  border2: '#d8d8d0',
  ink: '#1a1a18',
  ink2: '#3d3d38',
  ink3: '#7a7a72',
  ink4: '#b0b0a8',
  green: '#1d7a45',
  green2: '#25a05a',
  greenBg: '#f0f9f4',
  greenBorder: '#b8deca',
  amber: '#b56a00',
  amberBg: '#fdf6ec',
  red: '#c0392b',
  redBg: '#fdf0ef',
  blue: '#1a4fa0',
  radius: '10px',
  radiusSm: '6px',
  radiusLg: '16px',
  radiusPill: '999px',
  shadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,.08)',
  shadowLg: '0 12px 40px rgba(0,0,0,.12)',
};

/* ─── Reusable helpers ───────────────────────────────────────── */
const sectionPad: CSSProperties = { padding: '100px 24px', maxWidth: 1200, margin: '0 auto' };
const fadeUp = { initial: { opacity: 0, y: 36 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } };

function useWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Feature Data ───────────────────────────────────────────── */
const FEATURES = [
  {
    key: 'flow', icon: Factory, label: 'Factory Flow',
    title: 'End-to-End Factory Flow Simulation',
    body: 'Students manage raw materials through mixing, baking, and packaging stages. Each station has realistic capacity constraints, processing times, and failure probabilities that mirror real manufacturing environments.',
    checks: ['Configurable station capacities & processing rates', 'Realistic queue buildup and WIP tracking', 'Visual flow diagram with live throughput data', 'Bottleneck identification through constraint analysis'],
  },
  {
    key: 'inventory', icon: Boxes, label: 'Inventory Policy',
    title: 'Inventory Management & Ordering Policies',
    body: 'Explore EOQ, reorder-point, safety stock, and just-in-time strategies. Students set parameters and watch how their policies perform under demand variability and supply disruptions.',
    checks: ['EOQ, ROP, and (s,S) policy implementation', 'Demand variability with configurable distributions', 'Supplier lead-time uncertainty modeling', 'Holding, ordering, and stockout cost tracking'],
  },
  {
    key: 'bottleneck', icon: AlertTriangle, label: 'Bottleneck Theory',
    title: 'Theory of Constraints & Bottleneck Analysis',
    body: 'Built around Goldratt\'s Theory of Constraints. Students identify the system bottleneck, subordinate other resources, and elevate capacity to maximize throughput.',
    checks: ['Automatic bottleneck detection algorithms', 'Drum-Buffer-Rope scheduling visualization', 'What-if analysis for capacity investments', 'Throughput accounting vs. cost accounting comparison'],
  },
  {
    key: 'multiplayer', icon: Users, label: 'Live Multiplayer',
    title: 'Real-Time Multiplayer Competition',
    body: 'Up to 200 students compete simultaneously in the same market. Decisions on pricing, production volume, and quality create a competitive ecosystem with emergent market dynamics.',
    checks: ['Real-time WebSocket synchronization', 'Up to 200 concurrent players per session', 'Market-clearing price mechanism', 'Team-based and individual competition modes'],
  },
  {
    key: 'overtime', icon: Gamepad2, label: 'Overtime Arcade',
    title: 'Overtime Arcade Mini-Game',
    body: 'A fast-paced arcade-style mini-game where students manually manage overtime shifts. Quick reflexes and strategic resource allocation determine bonus production output.',
    checks: ['Keyboard-driven machine activation (M→B→P)', 'Time-pressure decision making under constraints', 'Bonus multipliers for optimal sequencing', 'Integration with main simulation scoring'],
  },
  {
    key: 'analytics', icon: BarChart3, label: 'Analytics Engine',
    title: 'Comprehensive Analytics & Reporting',
    body: 'Every decision is tracked and visualized. Students review their performance through interactive dashboards while instructors access class-wide analytics and exportable reports.',
    checks: ['Real-time KPI dashboards per student', 'Cross-cohort benchmarking for instructors', 'Exportable CSV & PDF reports', 'Historical trend analysis across sessions'],
  },
];

/* ─── FAQ Data ───────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'How many students can participate in a single session?',
    a: 'Muffin Factory Lab supports up to 200 students in a single live session. Each student gets their own factory instance while competing in a shared market environment. For larger classes, you can run multiple concurrent sessions.',
  },
  {
    q: 'Do students need to install any software?',
    a: 'No installation required. Muffin Factory Lab runs entirely in the browser — Chrome, Firefox, Safari, and Edge are all supported. Students simply click a link to join. Works on laptops, tablets, and even phones in a pinch.',
  },
  {
    q: 'Can I customize the scenarios for my course?',
    a: 'Absolutely. Instructors can configure demand patterns, supply disruptions, machine failure rates, cost structures, and competitive market parameters. We also offer 12 pre-built scenarios aligned with popular operations management textbooks.',
  },
  {
    q: 'Is there a free trial available?',
    a: 'Yes! You can launch a free demo right now — no account required. For a full instructor trial with all features, including multiplayer and analytics, contact us for a 30-day pilot license at no cost.',
  },
  {
    q: 'What kind of support do you offer for instructors?',
    a: 'Every license includes onboarding assistance, a comprehensive instructor guide, pre-built lesson plans, and email support. Premium plans add dedicated account management, custom scenario development, and live technical support during class sessions.',
  },
];

/* ─── Dashboard Mock Data ────────────────────────────────────── */
const DASHBOARD_TABS = ['Student', 'Instructor', 'Admin'] as const;

/* ─── Main Component ─────────────────────────────────────────── */
export function MarketingLandingPage({ login, setIsDirectPlay }: Props) {
  const w = useWidth();
  const isMobile = w < 768;
  const isTablet = w < 1024;

  /* ── state ── */
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeDashboard, setActiveDashboard] = useState<number>(0);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const { loginWithMockCredentials } = useGame();
  
  const [showModal, setShowModal] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<'instructor' | '1' | '2' | '3' | '4'>('1');
  const [showPw, setShowPw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  /* quote modal state */
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteOrg, setQuoteOrg] = useState('');
  const [quoteDept, setQuoteDept] = useState('');
  const [quoteStep, setQuoteStep] = useState(1); // 1 = Form, 2 = Invoice
  const [quoteRefNum, setQuoteRefNum] = useState('');

  /* demo modal state */
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCourse, setDemoCourse] = useState('');
  const [demoStep, setDemoStep] = useState(1); // 1 = Date & Time, 2 = Details, 3 = Confirmation
  const [demoDateSelection, setDemoDateSelection] = useState<string>('');
  const [demoTimeSelection, setDemoTimeSelection] = useState<string>('');

  /* pricing calculator */
  const [students, setStudents] = useState(60);
  const [sessions, setSessions] = useState(4);
  const [duration, setDuration] = useState('semester');
  const [institution, setInstitution] = useState('university');

  /* animated counters */
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  useEffect(() => {
    if (!statsInView) return;
    const targets = [48200, 97, 12];
    const durations = [2000, 1800, 1600];
    const setters = [setCount1, setCount2, setCount3];
    targets.forEach((target, i) => {
      const steps = 60;
      const inc = target / steps;
      let current = 0;
      const iv = setInterval(() => {
        current += inc;
        if (current >= target) { setters[i](target); clearInterval(iv); }
        else setters[i](Math.floor(current));
      }, durations[i] / steps);
    });
  }, [statsInView]);

  /* toast helper */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* pricing calc */
  const basePrice = 1000; // Flat base price for 1 student
  const durationMul = duration === 'semester' ? 1 : duration === 'quarter' ? 0.75 : duration === 'workshop' ? 0.4 : 1.2;
  const perStudent = Math.round(basePrice * durationMul * 100) / 100;
  const totalPrice = Math.round(perStudent * students * sessions * 100) / 100;
  
  // "Say many contact us" -> if > 500 student, require a custom quote
  const isCustomPricing = students > 500;

  /* nav items */
  const navItems = [
    { label: 'Features', id: 'features' },
    { label: 'Simulator', id: 'simulator' },
    { label: 'Dashboards', id: 'dashboards' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  /* ─────────────── RENDER ─────────────── */
  return (
    <div style={{ fontFamily: T.sans, color: T.ink, background: T.white, overflowX: 'hidden' as const, minHeight: '100vh' }}>

      {/* ════ TOAST ════ */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
            background: T.ink, color: T.white, padding: '12px 28px', borderRadius: T.radiusPill,
            fontFamily: T.sans, fontSize: 14, fontWeight: 500, boxShadow: T.shadowLg,
          }}
        >
          {toast}
        </motion.div>
      )}

      {/* ════ 2. STICKY NAV ════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${T.border}`, padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64,
        }}>
          {/* logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🧁</div>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, lineHeight: 1.1, color: T.ink }}>
                Muffin Factory Lab
              </div>
              <div style={{
                fontFamily: T.mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.12em',
                color: T.ink3, textTransform: 'uppercase' as const,
              }}>
                Operations Strategy Engine
              </div>
            </div>
          </div>

          {/* desktop nav */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              {navItems.map((n) => (
                <span
                  key={n.id}
                  onClick={() => scrollTo(n.id)}
                  style={{
                    fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.ink2,
                    cursor: 'pointer', letterSpacing: '0.01em',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.ink)}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.ink2)}
                >
                  {n.label}
                </span>
              ))}
            </div>
          )}

          {/* buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isMobile && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink,
                  background: 'transparent', border: `1.5px solid ${T.border2}`,
                  borderRadius: T.radiusPill, padding: '8px 20px', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = T.ink; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = T.border2; }}
              >
                Sign in
              </button>
            )}
            <button
              onClick={() => { setIsDirectPlay(true); showToast('Launching free demo…'); }}
              style={{
                fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.white,
                background: T.ink, border: 'none', borderRadius: T.radiusPill,
                padding: '8px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = T.ink2; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = T.ink; }}
            >
              Try for free <ArrowRight size={14} />
            </button>

            {isMobile && (
              <button onClick={() => setMobileMenu(!mobileMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Menu size={22} color={T.ink} />
              </button>
            )}
          </div>
        </div>

        {/* mobile menu */}
        {isMobile && mobileMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ borderTop: `1px solid ${T.border}`, padding: '16px 0', overflow: 'hidden' }}
          >
            {navItems.map((n) => (
              <div
                key={n.id}
                onClick={() => { scrollTo(n.id); setMobileMenu(false); }}
                style={{ padding: '12px 0', fontSize: 15, fontWeight: 500, color: T.ink2, cursor: 'pointer' }}
              >
                {n.label}
              </div>
            ))}
            <div style={{ paddingTop: 12, borderTop: `1px solid ${T.border}`, marginTop: 8 }}>
              <button
                onClick={() => { setShowModal(true); setMobileMenu(false); }}
                style={{
                  fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink,
                  background: 'transparent', border: `1.5px solid ${T.border2}`,
                  borderRadius: T.radiusPill, padding: '10px 24px', cursor: 'pointer', width: '100%',
                }}
              >
                Sign in
              </button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ════ 3. HERO ════ */}
      <section style={{ ...sectionPad, paddingTop: 80, paddingBottom: 80 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr',
          gap: isTablet ? 48 : 64,
          alignItems: 'center',
        }}>
          {/* left */}
          <motion.div {...fadeUp}>
            {/* eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: T.greenBg, border: `1px solid ${T.greenBorder}`,
              borderRadius: T.radiusPill, padding: '6px 16px', marginBottom: 28,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: T.green2,
                animation: 'pulse 2s ease-in-out infinite',
                boxShadow: `0 0 0 0 ${T.green2}`,
              }} />
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: T.green, textTransform: 'uppercase' as const }}>
                Live in 45+ universities
              </span>
            </div>

            {/* headline */}
            <h1 style={{
              fontFamily: T.serif, fontSize: isMobile ? 42 : 56, fontWeight: 600,
              lineHeight: 1.1, color: T.ink, margin: '0 0 24px',
              letterSpacing: '-0.02em',
            }}>
              The factory simulator built for{' '}
              <span style={{
                color: T.green,
                textDecoration: 'underline',
                textDecorationColor: T.greenBorder,
                textUnderlineOffset: '6px',
                textDecorationThickness: '3px',
              }}>
                operations
              </span>{' '}
              education.
            </h1>

            <p style={{
              fontFamily: T.sans, fontSize: 17, lineHeight: 1.7, color: T.ink3,
              margin: '0 0 36px', maxWidth: 520,
            }}>
              Muffin Factory Lab lets students run a virtual bakery — managing inventory,
              scheduling production, and competing in live multiplayer markets. Used by top
              business schools worldwide.
            </p>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, marginBottom: 40 }}>
              <button
                onClick={() => { setIsDirectPlay(true); showToast('Launching demo…'); }}
                style={{
                  fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.white,
                  background: T.ink, border: 'none', borderRadius: T.radiusPill,
                  padding: '14px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: T.shadowMd,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <Play size={16} fill={T.white} /> Launch Demo Free
              </button>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink,
                  background: 'transparent', border: `1.5px solid ${T.border2}`,
                  borderRadius: T.radiusPill, padding: '14px 32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = T.ink; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = T.border2; }}
              >
                <LogIn size={16} /> Instructor Login
              </button>
            </div>
          </motion.div>

          {/* right — hero card */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
            <img 
              src="/hero_preview.png" 
              alt="Muffin Factory Simulation Dashboard Preview" 
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: T.radiusLg || '24px',
                boxShadow: T.shadowLg || '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                border: `3px solid ${T.border2}`,
                display: 'block'
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ════ 6. FEATURES ════ */}
      <section id="features" style={{ background: T.off, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <motion.div {...fadeUp} style={{ ...sectionPad }}>
          {/* section header */}
          <div style={{ textAlign: 'center' as const, marginBottom: 64 }}>
            <div style={{
              fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
              color: T.green, textTransform: 'uppercase' as const, marginBottom: 12,
            }}>
              Platform Capabilities
            </div>
            <h2 style={{
              fontFamily: T.serif, fontSize: isMobile ? 34 : 44, fontWeight: 600,
              color: T.ink, margin: '0 0 16px', letterSpacing: '-0.02em',
            }}>
              Everything you need to teach operations
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink3, maxWidth: 560, margin: '0 auto' }}>
              Six integrated modules that cover the complete operations management curriculum — from inventory theory to live competitive simulations.
            </p>
          </div>

          {/* feature layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTablet ? '1fr' : '280px 1fr',
            gap: 32,
          }}>
            {/* left nav */}
            <div style={{ display: 'flex', flexDirection: isTablet ? 'row' as const : 'column' as const, gap: 4, overflowX: isTablet ? 'auto' as const : undefined }}>
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                const isActive = i === activeFeature;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveFeature(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px', borderRadius: T.radius,
                      background: isActive ? T.white : 'transparent',
                      border: isActive ? `1px solid ${T.border}` : '1px solid transparent',
                      boxShadow: isActive ? T.shadow : 'none',
                      cursor: 'pointer', textAlign: 'left' as const,
                      fontFamily: T.sans, fontSize: 14, fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.ink : T.ink3,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap' as const,
                      minWidth: isTablet ? 'auto' : undefined,
                      flex: isTablet ? '0 0 auto' : undefined,
                    }}
                  >
                    <Icon size={18} color={isActive ? T.green : T.ink4} />
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* right panel */}
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                background: T.white, border: `1px solid ${T.border}`,
                borderRadius: T.radiusLg, padding: isMobile ? 28 : 44,
                boxShadow: T.shadow,
              }}
            >
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 48, height: 48, borderRadius: 12,
                background: T.greenBg, border: `1px solid ${T.greenBorder}`, marginBottom: 24,
              }}>
                {React.createElement(FEATURES[activeFeature].icon, { size: 24, color: T.green })}
              </div>
              <h3 style={{
                fontFamily: T.serif, fontSize: isMobile ? 26 : 30, fontWeight: 600,
                color: T.ink, margin: '0 0 16px', letterSpacing: '-0.02em',
              }}>
                {FEATURES[activeFeature].title}
              </h3>
              <p style={{
                fontFamily: T.sans, fontSize: 15, lineHeight: 1.7, color: T.ink3,
                margin: '0 0 28px', maxWidth: 560,
              }}>
                {FEATURES[activeFeature].body}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                {FEATURES[activeFeature].checks.map((c) => (
                  <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, background: T.greenBg,
                      border: `1px solid ${T.greenBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Check size={12} color={T.green} strokeWidth={3} />
                    </div>
                    <span style={{ fontFamily: T.sans, fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
                      {c}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ════ 7. PINK PASTEL DECORATIVE SIMULATOR PREVIEW ════ */}
      <section id="simulator" style={{ background: T.white }}>
        <motion.div {...fadeUp} style={{ ...sectionPad, paddingTop: 80, paddingBottom: 80 }}>
          {/* header */}
          <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
            <div style={{
              fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
              color: T.green, textTransform: 'uppercase' as const, marginBottom: 12,
            }}>
              Interactive Preview
            </div>
            <h2 style={{
              fontFamily: T.serif, fontSize: isMobile ? 34 : 44, fontWeight: 600,
              color: T.ink, margin: '0 0 16px', letterSpacing: '-0.02em',
            }}>
              See the simulator in action
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink3, maxWidth: 520, margin: '0 auto' }}>
              A complete factory operations environment — from raw materials to finished goods, with real-time analytics and competitive multiplayer.
            </p>
          </div>

          {/* simulator mockup container */}
          <MuffinFactoryDashboardPreview />
        </motion.div>
      </section>

      {/* ════ 9. PRICING CALCULATOR ════ */}
      <section id="pricing" style={{ background: T.off, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <motion.div {...fadeUp} style={{ ...sectionPad }}>
          {/* header */}
          <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
            <div style={{
              fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
              color: T.green, textTransform: 'uppercase' as const, marginBottom: 12,
            }}>
              Transparent Pricing
            </div>
            <h2 style={{
              fontFamily: T.serif, fontSize: isMobile ? 34 : 44, fontWeight: 600,
              color: T.ink, margin: '0 0 16px', letterSpacing: '-0.02em',
            }}>
              Build your custom quote
            </h2>
            <p style={{ fontFamily: T.sans, fontSize: 16, color: T.ink3, maxWidth: 520, margin: '0 auto' }}>
              Pricing scales with your class size. Adjust the parameters below to get an instant estimate.
            </p>
          </div>

          {/* calculator */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTablet ? '1fr' : '1fr 400px',
            gap: 32,
          }}>
            {/* left form */}
            <div style={{
              background: T.white, border: `1px solid ${T.border}`,
              borderRadius: T.radiusLg, padding: isMobile ? 28 : 40,
              boxShadow: T.shadow,
            }}>
              {/* students */}
              <div style={{ marginBottom: 32 }}>
                <label style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink, display: 'block', marginBottom: 10 }}>
                  Number of Students
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input
                    type="number"
                    max={1500}
                    value={students}
                    onChange={(e) => setStudents(Math.max(1, Math.min(1500, Number(e.target.value))))}
                    style={{
                      fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.ink,
                      width: 100, padding: '10px 14px', border: `1.5px solid ${T.border2}`,
                      borderRadius: T.radiusSm, outline: 'none', textAlign: 'center' as const,
                    }}
                  />
                  <input
                    type="range"
                    min={1}
                    max={1500}
                    value={students}
                    onChange={(e) => setStudents(Number(e.target.value))}
                    style={{ flex: 1, accentColor: T.green }}
                  />
                </div>
              </div>

              {/* sessions */}
              <div style={{ marginBottom: 32 }}>
                <label style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink, display: 'block', marginBottom: 10 }}>
                  Number of Sessions
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {[1, 2, 4, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSessions(n)}
                      style={{
                        fontFamily: T.mono, fontSize: 14, fontWeight: 600,
                        padding: '10px 20px', borderRadius: T.radiusSm,
                        border: `1.5px solid ${sessions === n ? T.green : T.border2}`,
                        background: sessions === n ? T.greenBg : T.white,
                        color: sessions === n ? T.green : T.ink2,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* duration */}
              <div style={{ marginBottom: 32 }}>
                <label style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink, display: 'block', marginBottom: 10 }}>
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{
                    fontFamily: T.sans, fontSize: 14, padding: '12px 16px',
                    border: `1.5px solid ${T.border2}`, borderRadius: T.radiusSm,
                    background: T.white, color: T.ink, width: '100%', cursor: 'pointer',
                    outline: 'none', appearance: 'auto' as const,
                  }}
                >
                  <option value="workshop">Workshop (1–2 days)</option>
                  <option value="quarter">Quarter (10 weeks)</option>
                  <option value="semester">Semester (16 weeks)</option>
                  <option value="annual">Annual license</option>
                </select>
              </div>

              {/* institution type */}
              <div>
                <label style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink, display: 'block', marginBottom: 10 }}>
                  Institution Type
                </label>
                <select
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  style={{
                    fontFamily: T.sans, fontSize: 14, padding: '12px 16px',
                    border: `1.5px solid ${T.border2}`, borderRadius: T.radiusSm,
                    background: T.white, color: T.ink, width: '100%', cursor: 'pointer',
                    outline: 'none', appearance: 'auto' as const,
                  }}
                >
                  <option value="university">University / Business School</option>
                  <option value="community">Community College</option>
                  <option value="corporate">Corporate Training</option>
                </select>
              </div>
            </div>

            {/* right — result panel */}
            <div style={{
              background: T.ink, borderRadius: T.radiusLg, padding: isMobile ? 28 : 40,
              display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontFamily: T.mono, fontSize: 11, color: T.ink4, letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const, marginBottom: 24,
                }}>
                  Estimated Cost
                </div>
                
                {isCustomPricing ? (
                  <>
                    <div style={{
                      fontFamily: T.serif, fontSize: 44, fontWeight: 700, color: T.white,
                      letterSpacing: '-0.02em', lineHeight: 1.1,
                    }}>
                      Custom Quote
                    </div>
                    <div style={{
                      fontFamily: T.sans, fontSize: 15, color: T.ink3, marginTop: 12, lineHeight: 1.5
                    }}>
                      For large cohorts ({students} students), please contact our sales team for custom volume pricing and deployment options.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      fontFamily: T.serif, fontSize: 52, fontWeight: 700, color: T.white,
                      letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                      ₹{totalPrice.toLocaleString()}
                    </div>
                    <div style={{
                      fontFamily: T.mono, fontSize: 14, color: T.green2, marginTop: 8,
                    }}>
                      ₹{perStudent}/student/session
                    </div>

                    {/* breakdown */}
                    <div style={{ marginTop: 40 }}>
                      {[
                        { label: 'Base rate per student', value: `₹${basePrice.toFixed(2)}` },
                        { label: 'Duration modifier', value: `×${durationMul}` },
                        { label: 'Students', value: students.toString() },
                        { label: 'Sessions', value: sessions.toString() },
                      ].map((line) => (
                        <div key={line.label} style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '10px 0', borderBottom: '1px solid #2a2a26',
                        }}>
                          <span style={{ fontFamily: T.sans, fontSize: 13, color: T.ink4 }}>{line.label}</span>
                          <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.white }}>{line.value}</span>
                        </div>
                      ))}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '14px 0 0', marginTop: 4,
                      }}>
                        <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.white }}>Total</span>
                        <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.green2 }}>
                          ₹{totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setQuoteRefNum('MFL-2026-' + Math.floor(100000 + Math.random() * 900000));
                  setQuoteStep(1);
                  setShowQuoteModal(true);
                }}
                style={{
                  fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink,
                  background: T.white, border: 'none', borderRadius: T.radiusPill,
                  padding: '14px 0', cursor: 'pointer', width: '100%', marginTop: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.9'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
              >
                Request Formal Quote <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════ 10. FAQ ════ */}
      <section id="faq">
        <motion.div {...fadeUp} style={{ ...sectionPad }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTablet ? '1fr' : '360px 1fr',
            gap: isTablet ? 48 : 64,
          }}>
            {/* left */}
            <div>
              <div style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                color: T.green, textTransform: 'uppercase' as const, marginBottom: 12,
              }}>
                FAQ
              </div>
              <h2 style={{
                fontFamily: T.serif, fontSize: isMobile ? 30 : 36, fontWeight: 600,
                color: T.ink, margin: '0 0 16px', letterSpacing: '-0.02em',
              }}>
                Common questions
              </h2>
              <p style={{
                fontFamily: T.sans, fontSize: 15, lineHeight: 1.7, color: T.ink3,
                margin: '0 0 32px',
              }}>
                Can't find what you're looking for? Reach out to our team for a personalized walkthrough.
              </p>

              {/* CTA card */}
              <div style={{
                background: T.greenBg, border: `1px solid ${T.greenBorder}`,
                borderRadius: T.radiusLg, padding: 28,
              }}>
                <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                  Still have questions?
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 13, lineHeight: 1.6, color: T.ink3, margin: '0 0 18px' }}>
                  Book a 15-minute demo call with our team. We'll walk you through the platform and answer any questions.
                </p>
                <button
                  onClick={() => {
                    setDemoStep(1);
                    setDemoDateSelection('');
                    setDemoTimeSelection('');
                    setShowDemoModal(true);
                  }}
                  style={{
                    fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.white,
                    background: T.green, border: 'none', borderRadius: T.radiusPill,
                    padding: '10px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Phone size={14} /> Book a Demo
                </button>
              </div>
            </div>

            {/* right — accordion */}
            <div>
              {FAQS.map((faq, i) => {
                const isOpen = !!faqOpen[i];
                return (
                  <div key={i} style={{
                    borderBottom: `1px solid ${T.border}`,
                    padding: '0',
                  }}>
                    <button
                      onClick={() => setFaqOpen((p) => ({ ...p, [i]: !p[i] }))}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '22px 0',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left' as const,
                      }}
                    >
                      <span style={{
                        fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink,
                        paddingRight: 16,
                      }}>
                        {faq.q}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ flexShrink: 0 }}
                      >
                        <ChevronDown size={18} color={T.ink3} />
                      </motion.span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p style={{
                        fontFamily: T.sans, fontSize: 14, lineHeight: 1.7, color: T.ink3,
                        margin: 0, paddingBottom: 22,
                      }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════ 11. FOOTER ════ */}
      <footer style={{
        background: T.ink, color: T.white, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ ...sectionPad, paddingTop: 72, paddingBottom: 40 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : '1.5fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 56,
          }}>
            {/* brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: '#2a2a26',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>🧁</div>
                <div>
                  <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.white }}>
                    Muffin Factory Lab
                  </div>
                  <div style={{
                    fontFamily: T.mono, fontSize: 9, letterSpacing: '0.12em',
                    color: T.ink4, textTransform: 'uppercase' as const,
                  }}>
                    Operations Strategy Engine
                  </div>
                </div>
              </div>
              <p style={{
                fontFamily: T.sans, fontSize: 14, lineHeight: 1.7, color: T.ink4,
                maxWidth: 280, margin: 0,
              }}>
                The leading operations management simulator for business schools and corporate training programs worldwide.
              </p>
            </div>

            {/* Product */}
            <div>
              <div style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                color: T.ink4, textTransform: 'uppercase' as const, marginBottom: 20,
              }}>
                Product
              </div>
              {['Features', 'Simulator', 'Dashboards', 'Pricing', 'Changelog', 'Roadmap'].map((link) => (
                <div key={link} style={{
                  fontFamily: T.sans, fontSize: 14, color: '#888880', marginBottom: 12,
                  cursor: 'pointer', transition: 'color 0.2s',
                }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = T.white; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#888880'; }}
                >
                  {link}
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                color: T.ink4, textTransform: 'uppercase' as const, marginBottom: 20,
              }}>
                Company
              </div>
              {['About', 'Blog', 'Careers', 'Contact', 'Partner Program'].map((link) => (
                <div key={link} style={{
                  fontFamily: T.sans, fontSize: 14, color: '#888880', marginBottom: 12,
                  cursor: 'pointer', transition: 'color 0.2s',
                }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = T.white; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#888880'; }}
                >
                  {link}
                </div>
              ))}
            </div>

            {/* Legal */}
            <div>
              <div style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                color: T.ink4, textTransform: 'uppercase' as const, marginBottom: 20,
              }}>
                Legal
              </div>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'FERPA Compliance', 'Accessibility'].map((link) => (
                <div key={link} style={{
                  fontFamily: T.sans, fontSize: 14, color: '#888880', marginBottom: 12,
                  cursor: 'pointer', transition: 'color 0.2s',
                }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = T.white; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#888880'; }}
                >
                  {link}
                </div>
              ))}
            </div>
          </div>

          {/* bottom line */}
          <div style={{
            borderTop: '1px solid #2a2a26', paddingTop: 28,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap' as const, gap: 12,
          }}>
            <span style={{ fontFamily: T.sans, fontSize: 13, color: T.ink4 }}>
              © 2025 Muffin Factory Lab. All rights reserved.
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: '#3a3a36' }}>
              Built with 🧁 for operations educators
            </span>
          </div>
        </div>
      </footer>

      {/* ════ 12. AUTH MODAL ════ */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.white, borderRadius: T.radiusLg,
              width: '100%', maxWidth: 440, boxShadow: T.shadowLg,
              overflow: 'hidden',
            }}
          >
            {/* modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 28px', borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: T.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>🧁</div>
                <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700, color: T.ink }}>
                  Muffin Factory Lab
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color={T.ink3} />
              </button>
            </div>

            <div style={{ padding: '28px' }}>
              {/* Option A — instant demo */}
              <div style={{
                background: T.greenBg, border: `1px solid ${T.greenBorder}`,
                borderRadius: T.radius, padding: 22, marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Zap size={16} color={T.green} />
                  <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.green }}>
                    Recommended
                  </span>
                </div>
                <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
                  Try the instant demo
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink3, margin: '0 0 16px', lineHeight: 1.6 }}>
                  No account needed. Jump straight into a sandbox simulation and explore the full factory environment.
                </p>
                <button
                  onClick={() => { setShowModal(false); setIsDirectPlay(true); showToast('Launching demo…'); }}
                  style={{
                    fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.white,
                    background: T.green, border: 'none', borderRadius: T.radiusPill,
                    padding: '11px 24px', cursor: 'pointer', width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Play size={15} fill={T.white} /> Launch Anonymous Demo
                </button>
              </div>

              {/* divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
              }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontFamily: T.sans, fontSize: 12, color: T.ink4, fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>

              {/* id/password form */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.ink2, display: 'block', marginBottom: 6 }}>
                  Login ID (Instructor or Student)
                </label>
                <div style={{ position: 'relative' as const }}>
                  <Mail size={16} color={T.ink4} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="Enter your Login ID"
                    style={{
                      fontFamily: T.sans, fontSize: 14, padding: '11px 14px 11px 40px',
                      border: `1.5px solid ${T.border2}`, borderRadius: T.radiusSm,
                      width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                      color: T.ink,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.ink2, display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' as const }}>
                  <Lock size={16} color={T.ink4} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      fontFamily: T.sans, fontSize: 14, padding: '11px 44px 11px 40px',
                      border: `1.5px solid ${T.border2}`, borderRadius: T.radiusSm,
                      width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                      color: T.ink,
                    }}
                  />
                  <button
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    }}
                  >
                    {showPw ? <EyeOff size={16} color={T.ink4} /> : <Eye size={16} color={T.ink4} />}
                  </button>
                </div>
              </div>

              {/* member slot selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.ink2, display: 'block', marginBottom: 6 }}>
                  Session Role / Team Slot
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[
                    { val: 'instructor', label: 'Inst.' },
                    { val: '1', label: 'Mem 1' },
                    { val: '2', label: 'Mem 2' },
                    { val: '3', label: 'Mem 3' },
                    { val: '4', label: 'Mem 4' }
                  ].map(opt => {
                    const isSelected = selectedSlot === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setSelectedSlot(opt.val as any)}
                        style={{
                          fontFamily: T.sans, fontSize: 11, fontWeight: 700,
                          padding: '10px 4px', borderRadius: T.radiusSm,
                          border: isSelected ? '2px solid #16a34a' : `1.5px solid ${T.border}`,
                          background: isSelected ? '#f0fdf4' : T.white,
                          color: isSelected ? '#16a34a' : T.ink3,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={async () => { 
                  try {
                    showToast('Signing in...');
                    // Always pass the full ID as-is — admin-generated IDs are already unique
                    await loginWithMockCredentials(loginId.trim(), password);
                    showToast('Sign in successful!');
                    setShowModal(false);
                  } catch (err: any) {
                    showToast('Error: ' + err.message);
                  }
                }}
                style={{
                  fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.white,
                  background: T.ink, border: 'none', borderRadius: T.radiusPill,
                  padding: '12px 0', cursor: 'pointer', width: '100%', marginBottom: 14,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = T.ink2; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = T.ink; }}
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ════ 13. CUSTOM QUOTE GENERATOR MODAL ════ */}
      {showQuoteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowQuoteModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, overflowY: 'auto' as const,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fffdf9', borderRadius: T.radiusLg,
              border: '3px solid #4a2c11', boxShadow: '0 12px 0 #4a2c11',
              width: '100%', maxWidth: quoteStep === 1 ? 460 : 560,
              overflow: 'hidden', color: '#4a2c11',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '3px solid #4a2c11',
              background: '#ffeef2',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 800 }}>
                  {quoteStep === 1 ? 'Request Formal Price Quote' : 'Official License Price Quote'}
                </span>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#4a2c11" style={{ strokeWidth: 3 }} />
              </button>
            </div>

            {/* Content Step 1: Form */}
            {quoteStep === 1 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quoteName || !quoteEmail || !quoteOrg) {
                    showToast('Please fill out all required fields.');
                    return;
                  }
                  setQuoteStep(2);
                }}
                style={{ padding: 28 }}
              >
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Your Full Name <span style={{ color: T.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    placeholder="e.g. Professor Sarah Jenkins"
                    style={{
                      fontFamily: T.sans, fontSize: 14, padding: '10px 14px',
                      border: '2px solid #4a2c11', borderRadius: T.radiusSm,
                      width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                      color: '#4a2c11', background: '#fff',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Work Email <span style={{ color: T.red }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={quoteEmail}
                    onChange={(e) => setQuoteEmail(e.target.value)}
                    placeholder="e.g. s.jenkins@university.edu"
                    style={{
                      fontFamily: T.sans, fontSize: 14, padding: '10px 14px',
                      border: '2px solid #4a2c11', borderRadius: T.radiusSm,
                      width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                      color: '#4a2c11', background: '#fff',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    University / Organization <span style={{ color: T.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteOrg}
                    onChange={(e) => setQuoteOrg(e.target.value)}
                    placeholder="e.g. Harvard Business School"
                    style={{
                      fontFamily: T.sans, fontSize: 14, padding: '10px 14px',
                      border: '2px solid #4a2c11', borderRadius: T.radiusSm,
                      width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                      color: '#4a2c11', background: '#fff',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Department / Academic Role
                  </label>
                  <input
                    type="text"
                    value={quoteDept}
                    onChange={(e) => setQuoteDept(e.target.value)}
                    placeholder="e.g. Operations Strategy"
                    style={{
                      fontFamily: T.sans, fontSize: 14, padding: '10px 14px',
                      border: '2px solid #4a2c11', borderRadius: T.radiusSm,
                      width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                      color: '#4a2c11', background: '#fff',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    fontFamily: T.sans, fontSize: 14, fontWeight: 800, color: T.white,
                    background: T.ink, border: '3px solid #4a2c11', borderRadius: T.radiusPill,
                    padding: '12px 0', cursor: 'pointer', width: '100%',
                    boxShadow: '0 4px 0 #4a2c11', transition: 'all 0.1s',
                  }}
                >
                  Generate Formal Quote ➔
                </button>
              </form>
            ) : (
              /* Content Step 2: Invoice display */
              <div style={{ padding: 28 }}>
                {/* Official looking invoice layout */}
                <div style={{
                  background: '#fffdf6', border: '3.5px dashed #4a2c11',
                  borderRadius: '10px', padding: 24, marginBottom: 24,
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)',
                }}>
                  {/* Watermark branding */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800 }}>Muffin Factory Lab</div>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a7360' }}>
                        Official Strategy Engine License Quote
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800 }}>{quoteRefNum}</div>
                      <div style={{ fontSize: 10, color: '#8a7360' }}>Date: May 30, 2026</div>
                    </div>
                  </div>

                  {/* Billing party info */}
                  <div style={{ borderTop: '2px solid #4a2c11', borderBottom: '2px solid #4a2c11', padding: '12px 0', marginBottom: 20, fontSize: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ textTransform: 'uppercase', fontSize: 9, color: '#8a7360', fontWeight: 800, marginBottom: 4 }}>Prepared For:</div>
                        <div style={{ fontWeight: 800 }}>{quoteName}</div>
                        <div>{quoteOrg}</div>
                        {quoteDept && <div style={{ fontStyle: 'italic' }}>{quoteDept}</div>}
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ textTransform: 'uppercase', fontSize: 9, color: '#8a7360', fontWeight: 800, marginBottom: 4 }}>Valid Until:</div>
                        <div style={{ fontWeight: 800 }}>June 29, 2026 (30 Days)</div>
                        <div>Email: {quoteEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Calculations details */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2.5px solid #4a2c11' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>Item Description</th>
                        <th style={{ textAlign: 'center', paddingBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>Qty</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>Rate</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px dashed #e6ccb2' }}>
                        <td style={{ padding: '10px 0', fontWeight: 800 }}>
                          Muffin Factory Pro SaaS License<br/>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#8a7360' }}>
                            Duration: {duration === 'semester' ? 'Semester License (16 weeks)' : duration === 'quarter' ? 'Quarter License (10 weeks)' : duration === 'workshop' ? 'Workshop License (1-2 days)' : 'Annual Enterprise License'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{students} students</td>
                        <td style={{ textAlign: 'right' }}>${perStudent}/stud</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>${(students * perStudent).toFixed(2)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px dashed #e6ccb2' }}>
                        <td style={{ padding: '10px 0', fontWeight: 800 }}>
                          Multiplayer Interactive Sessions<br/>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#8a7360' }}>
                            Proctored Simulation Rounds & Analytics
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{sessions} sessions</td>
                        <td style={{ textAlign: 'right' }}>Included</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>$0.00</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 0', fontWeight: 800 }}>
                          Onboarding & Dedicated Instructor Support<br/>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#8a7360' }}>
                            Lesson plans, tutorials, and CSV reports
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>1-on-1</td>
                        <td style={{ textAlign: 'right' }}>Included</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>$0.00</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Total section */}
                  <div style={{
                    borderTop: '2.5px solid #4a2c11', marginTop: 14, paddingTop: 14,
                    display: 'flex', justifyContent: 'flex-end',
                  }}>
                    <div style={{ width: 220, textAlign: 'right' as const }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12 }}>Subtotal:</span>
                        <span style={{ fontWeight: 800 }}>${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: '#2e7d32' }}>
                        <span>Academic Discount:</span>
                        <span>-$0.00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #4a2c11', paddingTop: 8, fontSize: 16 }}>
                        <span style={{ fontWeight: 800 }}>Total Price:</span>
                        <span style={{ fontWeight: 800, color: '#1d7a45' }}>${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => {
                      showToast('Quote PDF saved to system downloads.');
                      window.print();
                    }}
                    style={{
                      fontFamily: T.sans, fontSize: 13, fontWeight: 800, color: '#4a2c11',
                      background: '#ffffff', border: '3px solid #4a2c11', borderRadius: T.radiusPill,
                      padding: '12px 0', cursor: 'pointer', boxShadow: '0 4px 0 #4a2c11',
                      transition: 'all 0.1s',
                    }}
                  >
                    🖨️ Print / Save PDF
                  </button>
                  <button
                    onClick={() => {
                      showToast(`Quote Approved! Verification email sent to ${quoteEmail}`);
                      setShowQuoteModal(false);
                      setIsDirectPlay(true); // Jump straight to playing demo sandbox
                    }}
                    style={{
                      fontFamily: T.sans, fontSize: 13, fontWeight: 800, color: '#ffffff',
                      background: '#89b873', border: '3px solid #4a2c11', borderRadius: T.radiusPill,
                      padding: '12px 0', cursor: 'pointer', boxShadow: '0 4px 0 #4a2c11',
                      transition: 'all 0.1s',
                    }}
                  >
                    ✅ Accept & Activate Pro
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* ════ 14. CALENDLY-STYLE DEMO BOOKING MODAL ════ */}
      {showDemoModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDemoModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
            overflowY: 'auto' as const,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="demo-modal-container"
          >
            {/* Left Panel: Meeting Info & Host */}
            <div className="demo-left-panel">
              <div>
                {/* Brand Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
                  <span style={{ fontSize: '24px' }}>🧁</span>
                  <span style={{ fontFamily: T.serif, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Muffin Lab
                  </span>
                </div>

                {/* Event Name */}
                <h2 style={{
                  fontFamily: T.serif,
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: '1.25',
                  marginBottom: '16px',
                }}>
                  15-Min Operations Strategy Demo
                </h2>

                {/* Time & Location Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#475569', fontSize: '13px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⏱️</span>
                    <span>15 minutes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📞</span>
                    <span>Google Meet video call</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🌐</span>
                    <span>India Standard Time</span>
                  </div>
                </div>

                <p style={{
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: '1.5',
                  marginTop: '20px',
                  fontWeight: 500,
                }}>
                  Book a quick call with our learning design team to walkthrough custom integrations, course mapping, and pricing plans.
                </p>
              </div>

              {/* Host Profile Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}>
                  AS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Aarav Sharma</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Operations Strategy Lead</span>
                </div>
              </div>
            </div>

            {/* Right Panel: Content Section */}
            <div className="demo-right-panel">
              {/* Close Button top-right */}
              <button
                onClick={() => setShowDemoModal(false)}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  padding: 0,
                  zIndex: 30,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e2e8f0'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9'; }}
              >
                <X size={16} color="#64748b" style={{ strokeWidth: 2.5 }} />
              </button>

              {/* Professional Demo Form */}
              {demoStep === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!demoName || !demoEmail || !demoCourse) {
                      showToast('Please fill out all required fields.');
                      return;
                    }
                    setDemoStep(2);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: '8px',
                    }}>
                      Request a Professional Demo
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                      Fill in your details below and our Operations Strategy team will reach out to schedule your personalized walkthrough.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px', color: '#64748b' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px', color: '#64748b' }}>
                        Work / University Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={demoEmail}
                        onChange={(e) => setDemoEmail(e.target.value)}
                        placeholder="e.g. s.jenkins@university.edu"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px', color: '#64748b' }}>
                        Institution / Company <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={demoCourse}
                        onChange={(e) => setDemoCourse(e.target.value)}
                        placeholder="e.g. Stanford University"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      fontFamily: T.sans,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#4f46e5',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '14px 0',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '30px',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4338ca'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4f46e5'; }}
                  >
                    Request Demo
                  </button>
                </form>
              )}

              {/* Step 2: Success Confirmation */}
              {demoStep === 2 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center' as const,
                }}>
                  {/* Animated green checkmark circle */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#ecfdf5',
                    border: '2px solid #10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                  }}>
                    <span style={{ fontSize: '32px', color: '#10b981' }}>✓</span>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                    Request Received!
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6, maxWidth: '280px' }}>
                    Thank you, <strong>{demoName || 'there'}</strong>. Our team will reach out to <strong>{demoEmail}</strong> shortly to coordinate a time that works best for you.
                  </p>

                  <button
                    onClick={() => setShowDemoModal(false)}
                    style={{
                      fontFamily: T.sans,
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '11px 0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1e293b'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0f172a'; }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ═══ Pulse keyframe injection ═══ */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,160,90,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(37,160,90,0); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700&family=Inconsolata:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${T.greenBg}; color: ${T.green}; }
        input:focus, select:focus { border-color: ${T.green} !important; }

        /* Modern Calendly-style Modal */
        .demo-modal-container {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.02);
          width: 100%;
          max-width: 850px;
          height: 520px;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          font-family: 'Manrope', sans-serif;
          color: #1e293b;
        }
        .demo-left-panel {
          width: 340px;
          background-color: #f8fafc;
          border-right: 1px solid #e2e8f0;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-sizing: border-box;
        }
        .demo-right-panel {
          flex: 1;
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-sizing: border-box;
          overflow-y: hidden;
          position: relative;
        }
        .demo-input {
          font-family: 'Manrope', sans-serif;
          font-size: 13px;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          width: 100%;
          outline: none;
          box-sizing: border-box;
          color: #1e293b;
          background: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .demo-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12) !important;
        }
        @media (max-width: 768px) {
          .demo-modal-container {
            flex-direction: column;
            height: auto;
            max-height: 90vh;
            overflow-y: auto;
            max-width: 480px;
          }
          .demo-left-panel {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            padding: 24px;
            height: auto;
          }
          .demo-right-panel {
            padding: 24px;
            height: auto;
            overflow-y: visible;
          }
        }
      `}</style>
    </div>
  );
}

export default MarketingLandingPage;
