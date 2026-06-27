import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LoginPage from "./LoginPage";
import {
  FlaskConical,
  Search,
  Dna,
  Beaker,
  Target,
  Scissors,
  ShieldCheck,
  ArrowRight,
  Database,
  Check,
  FileText,
  Activity,
  Award,
  Globe,
  Zap,
  Play,
  Heart,
  Mail,
  ChevronRight,
  Sun,
  Moon,
  Monitor
} from "lucide-react";

// Self-contained animated counter component
function StatCounter({ target, suffix = "", duration = 1500, isDark }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          let startTimestamp = null;
          const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [target, duration]);

  const formattedCount = count >= 1000 ? count.toLocaleString() : count;

  return (
    <span ref={elementRef} className={`font-extrabold text-3xl md:text-4xl tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
      {formattedCount}{suffix}
    </span>
  );
}

export default function HomePage() {
  const { setActiveModule } = useWorkspace();
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const authRef = useRef(null);
  const isDark = resolvedTheme === "dark";

  // Handle transparent to blurred navbar transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignInClick = () => {
    setActiveModule("login");
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun size={15} className="text-amber-500" />;
    if (theme === "dark") return <Moon size={15} className="text-teal-400" />;
    return <Monitor size={15} className={isDark ? "text-slate-400" : "text-slate-500"} />;
  };

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const features = [
    {
      icon: FlaskConical,
      title: "AI Research Assistant",
      desc: "Accelerates scientific discovery with intelligent predictive algorithms and chemical queries.",
      moduleId: "ligand"
    },
    {
      icon: Search,
      title: "Interactive Visualization",
      desc: "Explore proteins and macromolecules in an immersive, high-quality WebGL interface.",
      moduleId: "protein_search"
    },
    {
      icon: ShieldCheck,
      title: "Secure Workspace",
      desc: "Manage research securely with isolated, fully encrypted user project workspaces.",
      moduleId: "user_workspace"
    },
    {
      icon: Dna,
      title: "Comprehensive Library",
      desc: "Access powerful protein and structure database registries containing millions of structures.",
      moduleId: "protein"
    },
    {
      icon: Target,
      title: "High Performance",
      desc: "Optimized computational mechanics pipeline supporting multi-threaded CPU and GPU docking.",
      moduleId: "docking"
    },
    {
      icon: Database,
      title: "Cloud Ready",
      desc: "Access your molecular data, searches, and docking results at any time, from anywhere.",
      moduleId: "user_workspace"
    }
  ];

  const workflowSteps = [
    { number: "01", name: "Input", desc: "Submit target FASTA sequences or chemical SMILES strings." },
    { number: "02", name: "Search", desc: "Simultaneously scan protein databases, structural archives, and ligand databases." },
    { number: "03", name: "Analyze", desc: "Evaluate cleavage points, PTM residues, and pocket features." },
    { number: "04", name: "Visualize", desc: "Observe macromolecular shapes and molecular alignments in 3D." },
    { number: "05", name: "Generate Report", desc: "Export publication-ready scientific PDF summaries and spreadsheets." }
  ];

  const institutions = [
    { name: "Academic Universities", desc: "Providing students and laboratories with intuitive bioinformatics tools." },
    { name: "Private Research Labs", desc: "Accelerating local docking runs and protein pocket characterization." },
    { name: "Pharmaceutical Teams", desc: "Integrating structured pipelines into compound research workflows." },
    { name: "Biotech Startups", desc: "Leveraging cloud-ready APIs for drug discovery projects." }
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0c1322] text-slate-300" : "bg-white text-slate-700"} flex flex-col font-sans overflow-x-hidden selection:bg-teal-100 selection:text-teal-900`}>
      
      {/* ── HEADER NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? isDark
              ? "bg-[#0c1322]/80 backdrop-blur-md border-b border-slate-800 shadow-lg py-3"
              : "bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className={`font-bold text-lg tracking-tight font-head ${isDark ? "text-white" : "text-slate-950"}`}>Spatial Biologics</span>
          </div>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className={`text-sm font-medium ${isDark ? "text-slate-300 hover:text-teal-400" : "text-slate-600 hover:text-teal-600"} transition-colors`}>About</a>
            <a href="#features" className={`text-sm font-medium ${isDark ? "text-slate-300 hover:text-teal-400" : "text-slate-600 hover:text-teal-600"} transition-colors`}>Features</a>
            <a href="#workflow" className={`text-sm font-medium ${isDark ? "text-slate-300 hover:text-teal-400" : "text-slate-600 hover:text-teal-600"} transition-colors`}>Workflow</a>
            <a href="#contact" className={`text-sm font-medium ${isDark ? "text-slate-300 hover:text-teal-400" : "text-slate-600 hover:text-teal-600"} transition-colors`}>Support</a>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            {/* Custom Theme Toggle Switch */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`relative flex items-center justify-between w-28 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 border-none outline-none select-none ${
                isDark ? "bg-[#1f2937]" : "bg-[#e5e7eb]"
              }`}
              title={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
            >
              {isDark ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                    <Moon size={12} className="text-slate-900 fill-slate-900" />
                  </div>
                  <span className="text-[9px] font-black tracking-wider text-white pr-2.5">
                    NIGHTMODE
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-black tracking-wider text-slate-700 pl-2.5">
                    DAYMODE
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                    <Sun size={12} className="text-amber-500 fill-amber-500" />
                  </div>
                </>
              )}
            </button>

            {!user && (
              <button
                onClick={handleSignInClick}
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? "text-slate-300 hover:text-teal-400" : "text-slate-600 hover:text-teal-600"
                }`}
              >
                Sign In
              </button>
            )}
            
            <button
              onClick={() => {
                if (user) {
                  setActiveModule("ligand");
                } else {
                  handleSignInClick();
                }
              }}
              className="text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.03] cursor-pointer"
            >
              {user ? "Go to Workspace" : "Get Started"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className={`relative pt-28 pb-16 md:pt-36 md:pb-24 ${isDark ? "bg-gradient-to-b from-teal-950/20 via-[#0c1322] to-[#0c1322]" : "bg-gradient-to-b from-teal-50/50 via-[#ffffff] to-[#ffffff]"} overflow-hidden`}>
        {/* Decorative vector shape backgrounds */}
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] ${isDark ? "bg-teal-950/20" : "bg-teal-100/30"} rounded-full filter blur-3xl pointer-events-none -mr-48 -mt-20 z-0`} />
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${isDark ? "bg-emerald-950/20" : "bg-emerald-50/30"} rounded-full filter blur-3xl pointer-events-none -ml-40 z-0`} />

        <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 relative z-10">
          
          {/* Left Text */}
          <div className="flex-1 text-left space-y-6 max-w-xl animate-fade-in-up">
            <span className="px-3.5 py-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider shadow-sm">
              ✨ Premium Bioinformatics Platform
            </span>

            <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              The Intelligent Platform for <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">Computational Biology</span>
            </h1>
            
            <p className={`text-base md:text-lg leading-relaxed font-normal ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Unify molecular search, protein analysis, visualization, and AI-assisted scientific workflows inside one modern research platform.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => {
                  if (user) setActiveModule("ligand");
                  else handleSignInClick();
                }}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-sm text-white flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all duration-200 hover:scale-[1.03] cursor-pointer"
              >
                <span>{user ? "Go to Workspace" : "Get Started"}</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Quick trust pill items */}
            <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 border-t ${isDark ? "border-slate-800" : "border-slate-100"} text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <span className="flex items-center gap-1.5">
                Secure & Private
              </span>
              <span className="flex items-center gap-1.5">
                Trusted by Researchers
              </span>
              <span className="flex items-center gap-1.5">
                Built for Science
              </span>
            </div>
          </div>

          {/* Right Banner Graphic */}
          <div className="flex-1 w-full relative max-w-xl animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-500 opacity-20 blur-lg" />
            <div className={`relative rounded-3xl overflow-hidden border ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-200/80 bg-white"} shadow-2xl animate-float`}>
              <img
                src="/landing_page_banner.png"
                alt="Spatial Biologics Protein Visualization"
                className="w-full h-auto object-cover max-h-[380px]"
              />

              {/* Floating Widget 1: Platform Status */}
              <div className={`absolute bottom-4 right-4 backdrop-blur-md border rounded-2xl p-3.5 shadow-2xl max-w-[240px] text-left select-none ${
                isDark ? "bg-slate-900/90 border-slate-800" : "bg-white/95 border-slate-100"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform Status</span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>All Core Services Operational</div>
                <p className="text-[9px] text-slate-400 mt-1">PDB, PubChem, and ADMET clusters fully responsive.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ROW (Animated) ── */}
      <section id="about" className={`py-12 ${isDark ? "bg-[#0a0f1d] border-y border-slate-800" : "bg-white border-y border-slate-100"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div className="space-y-1">
              <div className="block">
                <StatCounter target={250000} suffix="+" isDark={isDark} />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Protein Structures</p>
            </div>
            <div className="space-y-1">
              <div className="block">
                <StatCounter target={1000000} suffix="+" isDark={isDark} />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Computed Models</p>
            </div>
            <div className="space-y-1">
              <div className="block">
                <StatCounter target={10} suffix="X" isDark={isDark} />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Faster Processing</p>
            </div>
            <div className="space-y-1">
              <div className="block">
                <StatCounter target={99} suffix=".9%" isDark={isDark} />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Uptime Reliability</p>
            </div>
            <div className="col-span-2 md:col-span-1 space-y-1">
              <div className="block">
                <StatCounter target={20000} suffix="+" isDark={isDark} />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Researchers</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className={`py-20 ${isDark ? "bg-[#0c1322]" : "bg-slate-50/50"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Powering Research With Intelligence
            </h2>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed font-normal">
              One unified platform for molecular modeling, protein analysis, docking, and computational biology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  onClick={() => {
                    if (user) setActiveModule(feat.moduleId);
                    else handleSignInClick();
                  }}
                  className={`border p-6 rounded-2xl text-left hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1.5 ${
                    isDark 
                      ? "bg-[#111827] border-slate-800 hover:border-teal-500/50" 
                      : "bg-white border-slate-250/60 hover:border-teal-200/80"
                  }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="space-y-4">
                    <h3 className={`font-bold text-lg tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="pt-6 flex items-center text-xs text-teal-600 font-semibold group-hover:text-teal-500 transition-colors">
                    <span>Explore module</span>
                    <ChevronRight size={12} className="ml-0.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── RESEARCH WORKFLOW SECTION ── */}
      <section id="workflow" className={`py-20 ${isDark ? "bg-[#0a0f1d] border-t border-slate-800" : "bg-white border-t border-slate-100"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Simplified Research Workflow
            </h2>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed font-normal">
              Go from raw genomic or chemical inputs to publication-ready structures in 5 simple steps.
            </p>
          </div>

          <div className="relative">
            {/* Desktop progress connector line */}
            <div className={`hidden lg:block absolute top-6 left-12 right-12 h-0.5 z-0 ${
              isDark ? "bg-gradient-to-r from-teal-900/40 via-teal-850/20 to-transparent" : "bg-gradient-to-r from-teal-100 via-teal-50 to-transparent"
            }`} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
              {workflowSteps.map((step, idx) => (
                <div key={step.number} className="text-left space-y-4">
                  <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${
                      isDark 
                        ? "bg-teal-950/40 border border-teal-800 text-teal-400" 
                        : "bg-teal-50 border border-teal-200/50 text-teal-600"
                    }`}>
                      {step.number}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className={`font-bold text-base ${isDark ? "text-white" : "text-slate-900"}`}>{step.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTITUTIONS GRID ── */}
      <section className={`py-20 ${isDark ? "bg-[#0c1322] border-t border-slate-800" : "bg-slate-50/50 border-t border-slate-100"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Built for Scientific Excellence
            </h2>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed">
              Designed to meet the computational standards of modern academic and industrial organizations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {institutions.map((inst) => (
              <div key={inst.name} className={`border p-6 rounded-2xl text-left space-y-3 shadow-sm ${
                isDark ? "bg-[#111827] border-slate-800" : "bg-white border-slate-200/60"
              }`}>
                <h3 className={`font-bold text-base ${isDark ? "text-white" : "text-slate-900"}`}>{inst.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{inst.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION SECTION ── */}
      <section className="py-20 bg-gradient-to-br from-[#05111d] to-[#0c233c] text-white relative overflow-hidden border-t border-slate-800">
        {/* Glow accent */}
        <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(13, 148, 136, 0.15) 0%, transparent 60%) pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
          <div className="text-left space-y-4 max-w-xl">
            <span className="text-[10px] md:text-xs font-bold text-teal-450 tracking-wider uppercase">Ready to accelerate your research?</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Start your journey with Spatial Biologics
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Join thousands of researchers using advanced computing to unlock the future of biology. Launch your workspace today.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => {
                  if (user) setActiveModule("ligand");
                  else handleSignInClick();
                }}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-sm text-white shadow-lg shadow-teal-600/20 transition-all duration-200 hover:scale-[1.03] cursor-pointer"
              >
                {user ? "Go to Workspace" : "Get Started Now"}
              </button>
            </div>
          </div>
          
          {/* Laptop mockup representation */}
          <div className="hidden lg:block w-96 relative">
            <div className="absolute -inset-4 rounded-xl bg-teal-500/10 blur-xl animate-pulse" />
            <div className="border border-white/10 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/5 bg-slate-950">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <div className="p-1 h-32 flex items-center justify-center bg-slate-950 text-teal-500 font-bold text-lg">
                Spatial Biologics
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER / CUSTOMER SUPPORT ── */}
      <footer id="contact" className="bg-[#050914] text-slate-400 py-16 border-t border-slate-950 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            
            {/* Logo column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5 text-white">
                <span className="font-bold text-lg tracking-tight font-head">Spatial Biologics</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-normal">
                An intelligent bioinformatics platform built for researchers, by researchers, running on a resilient, self-healing diagnostic engine.
              </p>
              
              {/* Customer Support Info directly here */}
              <div className="pt-2 space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider">Customer Support</div>
                <div className="flex items-center gap-2.5 text-xs">
                  <a href="mailto:customersupport@spatialbiologics.com" className="text-teal-400 hover:underline font-semibold">
                    customersupport@spatialbiologics.com
                  </a>
                </div>
              </div>
            </div>

            {/* Platform Column */}
            <div className="space-y-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><button onClick={() => setActiveModule("login")} className="hover:text-white text-left transition-colors cursor-pointer bg-transparent border-none p-0">Integrations</button></li>
                <li><a href="#about" className="hover:text-white transition-colors">Uptime Statistics</a></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#workflow" className="hover:text-white transition-colors">Workflow Tutorial</a></li>
                <li><a href="mailto:customersupport@spatialbiologics.com" className="hover:text-white transition-colors">Email Helpdesk</a></li>
                <li><button onClick={() => setActiveModule("contact")} className="hover:text-white text-left transition-colors cursor-pointer bg-transparent border-none p-0">API Reference</button></li>
                <li><a href="mailto:customersupport@spatialbiologics.com" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#data" className="hover:text-white transition-colors">Data Safety Policy</a></li>
                <li><a href="#cookies" className="hover:text-white transition-colors">Cookies Settings</a></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>
              © 2026 Spatial Biologics. All rights reserved.
            </div>
            <div className="flex items-center gap-1">
              <span>Made for the scientific community. Version 1.2.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
