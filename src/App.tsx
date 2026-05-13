import React, { useState, useCallback } from 'react';
import * as dfd from 'danfojs';
import { Sparkles, RotateCcw, Download, Database, History, Search, Loader2, X, LogOut } from 'lucide-react';
import { Dropzone } from './components/Dropzone';
import { Chart } from './components/Chart';
import { Stats } from './components/Stats';
import { AISidebar } from './components/AISidebar';
import { StoryCard } from './components/StoryCard';
import { AISuggestion, DataFrameMetadata, DataState, VisualizationInsight, NarrativeInsight } from './types';
import { getCleaningSuggestions, generateVisualization, generateNarrative } from './lib/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function App() {
  const [user, authLoading] = useAuthState(auth);

  const [state, setState] = useState<DataState>({
    df: null,
    viewDf: null,
    history: [],
    isLoading: false,
    error: null,
  });

  const [aiState, setAiState] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    suggestions: AISuggestion[];
  }>({
    isOpen: false,
    isLoading: false,
    suggestions: [],
  });

  const [searchState, setSearchState] = useState<{
    query: string;
    isSearching: boolean;
    insight: VisualizationInsight | null;
    error: string | null;
  }>({
    query: '',
    isSearching: false,
    insight: null,
    error: null
  });

  const [narrativeState, setNarrativeState] = useState<{
    narrative: NarrativeInsight | null;
    isLoading: boolean;
  }>({
    narrative: null,
    isLoading: false
  });

  const [currentChartConfig, setCurrentChartConfig] = useState<any>(null);

  const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY || "";

  const extractMetadata = useCallback((df: dfd.DataFrame): DataFrameMetadata => {
    const columns = df.columns;
    const dtypes = df.ctypes.values as string[];
    const nullCounts: Record<string, number> = {};
    try {
      const sumNas = df.isNa().sum().values;
      sumNas.forEach((val: any, idx: number) => {
        nullCounts[columns[idx]] = val as number;
      });
    } catch(e) {}

    return {
      columns,
      dtypes,
      nullCounts,
      description: JSON.stringify((df.describe() as any).toJSON()),
      sampleRows: df.head(3).toJSON() as any[],
    };
  }, []);

  const triggerNarrativeUpdate = useCallback(async (df: dfd.DataFrame, chartConfig?: any) => {
    setNarrativeState(prev => ({ ...prev, isLoading: true }));
    try {
      const metadata = extractMetadata(df);
      const narrative = await generateNarrative(metadata, getApiKey(), chartConfig);
      setNarrativeState({ narrative, isLoading: false });
    } catch (err) {
      console.error("Narrative failed", err);
      setNarrativeState(prev => ({ ...prev, isLoading: false }));
    }
  }, [extractMetadata]);

  const handleDataLoaded = useCallback((df: dfd.DataFrame) => {
    setState({
      df,
      viewDf: df,
      history: [{
        id: Math.random().toString(),
        description: 'Original Dataset loaded',
        timestamp: Date.now(),
        dfSnapshot: df.copy() as any
      }],
      isLoading: false,
      error: null,
    });
    
    triggerNarrativeUpdate(df);
  }, [triggerNarrativeUpdate]);

  const triggerAIScan = useCallback(async () => {
    if (!state.df) return;

    setAiState(prev => ({ ...prev, isOpen: true, isLoading: true }));
    try {
      const metadata = extractMetadata(state.df);
      const suggestions = await getCleaningSuggestions(metadata, getApiKey());
      setAiState(prev => ({ ...prev, isLoading: false, suggestions }));
    } catch (err) {
      console.error(err);
      setAiState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.df, extractMetadata]);

  const applyFix = useCallback((suggestion: AISuggestion) => {
    if (!state.df) return;

    try {
      // @ts-expect-error eval assigns this
      const df = state.df; 
      // eslint-disable-next-line
      const processedDf = eval(suggestion.danfoCode);

      if (processedDf instanceof dfd.DataFrame) {
        setState((prev: any) => ({
          ...prev,
          df: processedDf,
          viewDf: processedDf,
          history: [...prev.history, {
            id: Math.random().toString(),
            description: `: Applied "${suggestion.label}"`,
            timestamp: Date.now(),
            dfSnapshot: processedDf.copy()
          }],
        }));
        setAiState(prev => ({
          ...prev,
          suggestions: prev.suggestions.filter((s: AISuggestion) => s.id !== suggestion.id)
        }));
        setSearchState(prev => ({ ...prev, insight: null, query: '' }));
        triggerNarrativeUpdate(processedDf, currentChartConfig);
      }
    } catch (err) {
      console.error('Error applying fix:', err);
    }
  }, [state.df, currentChartConfig, triggerNarrativeUpdate]);

  const undo = useCallback(() => {
    setState((prev: any) => {
      if (prev.history.length <= 1) return prev;
      const newHistory = [...prev.history];
      newHistory.pop(); 
      const previousState = newHistory[newHistory.length - 1];
      
      triggerNarrativeUpdate(previousState.dfSnapshot, currentChartConfig);
      return {
        ...prev,
        df: previousState.dfSnapshot,
        viewDf: previousState.dfSnapshot,
        history: newHistory,
      };
    });
    setSearchState(prev => ({ ...prev, insight: null, query: '' }));
  }, [currentChartConfig, triggerNarrativeUpdate]);

  const downloadData = useCallback(() => {
    if (state.df) {
      dfd.toCSV(state.df, { fileName: 'cleaned_data.csv', download: true });
    }
  }, [state.df]);

  const handleVibeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchState.query.trim() || !state.df) return;

    setSearchState(prev => ({ ...prev, isSearching: true, error: null }));
    try {
      const metadata = extractMetadata(state.df);
      const insight = await generateVisualization(searchState.query, metadata, getApiKey());
      
      let viewDf = state.df;
      if (insight.filterCode) {
        try {
          // @ts-expect-error eval uses this variable
          const df = state.df; 
          // eslint-disable-next-line
          const result = eval(insight.filterCode);
          if (result instanceof dfd.DataFrame) {
            viewDf = result;
          }
        } catch (evalErr) {
          console.error("Filter eval fail", evalErr);
          throw new Error("Could not evaluate the data filter.");
        }
      }

      setState(prev => ({ ...prev, viewDf }));
      setSearchState(prev => ({ ...prev, insight, isSearching: false }));
      
      triggerNarrativeUpdate(viewDf, insight.plotlyConfig);
    } catch (err: any) {
      console.error(err);
      setSearchState(prev => ({ 
        ...prev, 
        isSearching: false, 
        error: "Failed to generate visualization insights. Try a simpler query." 
      }));
    }
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-6">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">DATAVIBE</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">Sign in with your Google account to unlock AI-powered data analysis and visualization.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-sm"
          >
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const activeDf = state.viewDf || state.df;

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      <nav className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="text-white" size={18} />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">DATAVIBE</span>
          </div>
          
          <div className="flex items-center gap-3">
            {state.df && (
              <>
                <span className="text-sm font-medium text-gray-400 hidden sm:inline-block">Vibe Mode</span>
                <div className="h-4 w-px bg-gray-200 mx-1"></div>
                <button
                  onClick={undo}
                  disabled={state.history.length <= 1}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors"
                  title="Undo last change"
                >
                  <RotateCcw size={16} /> <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  onClick={downloadData}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-sm active:scale-95 ml-2"
                  title="Download CSV"
                >
                  <Download size={16} /> <span className="hidden sm:inline">Export CSV</span>
                </button>
              </>
            )}
            <div className="h-4 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-2">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-8 h-8 rounded-full shadow-sm" />
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 rounded-lg transition-colors" title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        {!state.df ? (
          <div className="max-w-3xl mx-auto mt-16 md:mt-24">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center space-y-8">
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1]">
                Data analysis, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                  perfectly orchestrated.
                </span>
              </h1>
              <p className="text-xl text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
                Clean, analyze, and visualize your datasets instantly with conversational AI and automated insights.
              </p>
              <div className="pt-8">
                <Dropzone onDataLoaded={handleDataLoaded} className="mx-auto" />
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-8 lg:space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Dataset Dashboard</motion.h2>
                <div className="flex items-center gap-5 text-sm font-medium text-gray-500">
                  <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200"><Database size={14} className="text-gray-400"/> CSV Source</span>
                  <span className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100"><History size={14}/> Version {state.history.length}</span>
                </div>
              </div>
              <button
                onClick={triggerAIScan}
                className="group relative px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 overflow-hidden shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <Sparkles size={20} className="relative z-10" />
                <span className="relative z-10">AI Cleansing</span>
              </button>
            </div>

            {/* Vibe Search Bar */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 backdrop-blur-md rounded-3xl p-2.5 shadow-xl shadow-gray-200/50 border border-gray-100 relative max-w-4xl mx-auto focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
              <form onSubmit={handleVibeSearch} className="flex items-center gap-3">
                <div className="pl-4 text-gray-400 shrink-0">
                  {searchState.isSearching ? <Loader2 className="animate-spin text-indigo-500" size={24} /> : <Search size={24} />}
                </div>
                <input 
                  type="text"
                  value={searchState.query}
                  onChange={(e) => setSearchState(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="Ask a question... e.g. 'Show revenue by category as a pie chart'"
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-lg md:text-xl py-3 px-2 text-gray-900 placeholder:text-gray-300 font-medium"
                  disabled={searchState.isSearching}
                />
                <button 
                  type="submit" 
                  disabled={searchState.isSearching || !searchState.query.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 shrink-0 shadow-sm"
                >
                  Ask
                </button>
              </form>
            </motion.div>

            <AnimatePresence>
              {searchState.error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="max-w-4xl mx-auto overflow-hidden">
                   <div className="bg-red-50 text-red-600 px-5 py-4 rounded-2xl flex items-center justify-between text-sm font-bold border border-red-100 mt-4 shadow-sm">
                      <div className="flex items-center gap-2"><X size={16} /> Oops: {searchState.error}</div>
                      <button onClick={() => setSearchState(prev => ({ ...prev, error: null }))} className="p-1 hover:bg-red-100 rounded-md transition-colors"><X size={16}/></button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Stats df={state.df} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-[600px]">
              <div className="lg:col-span-8 flex flex-col h-full rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/5">
                {activeDf ? (
                  <Chart df={activeDf} insight={searchState.insight} onExportConfigChange={setCurrentChartConfig} title={searchState.insight ? "Custom Insight" : "Dataset Overview"} />
                ) : null}
              </div>
              
              <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
                {/* Story Card */}
                <StoryCard narrative={narrativeState.narrative} isLoading={narrativeState.isLoading} />

                {/* Vibe Log (History) */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm flex-1">
                  <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-3 text-lg border-b border-gray-100 pb-4">
                    <History size={20} className="text-gray-400" /> Vibe Log
                  </h4>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                    {state.history.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center">No transformations yet.</p>
                    ) : (
                      state.history.map((item, i) => (
                        <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                           <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                           <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-transform scale-100 hover:scale-105">
                             <div className="flex items-center justify-between space-x-2 text-xs font-bold font-mono text-indigo-500 mb-1">
                                Step {i + 1}
                             </div>
                             <div className="text-sm font-medium text-gray-900">{item.description}</div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <AISidebar
        isOpen={aiState.isOpen}
        isLoading={aiState.isLoading}
        suggestions={aiState.suggestions}
        onApply={applyFix}
        onClose={() => setAiState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
