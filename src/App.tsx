import React, { useState, useRef } from 'react';
import * as dfjs from 'danfojs';
import Plot from 'react-plotly.js';
import { 
  Upload, Wand2, Database, BarChart3, AlertCircle, Undo2, Check, 
  RefreshCw, Search, Download, Copy, Info, ArrowRight,
  TrendingUp
} from 'lucide-react';

interface Suggestion {
  id: string;
  label: string;
  description: string;
  danfoCode: string;
}

interface PlotConfig {
  chartType: string;
  mappings: { xColumn?: string; yColumn?: string; valuesColumn?: string; labelsColumn?: string; };
  plotlyConfigLayout: any;
  insight?: string;
}

interface Narrative {
  vibe: string;
  outlier: string;
  action: string;
  recommendationOverlay: {
    show: boolean;
    type: "warning" | "success" | "info";
    message: string;
  };
}

interface HistoryLog {
  action: string;
  df: any; 
  timestamp: Date;
}

export default function App() {
  const [cleanedDf, setCleanedDf] = useState<any>(null);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Phase 2 state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Phase 3 state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [plotConfig, setPlotConfig] = useState<PlotConfig | null>(null);
  const [viewDf, setViewDf] = useState<any>(null); // For visualizing subset
  
  // Phase 4 state
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);

  // Helper metadata extractor
  const getMetadata = (df: any) => {
    const columns = df.columns;
    const dtypes = df.ctypes.values;
    const nullCounts = df.isNa().sum().values;
    
    const meta: Record<string, any> = {};
    columns.forEach((col: string, idx: number) => {
      meta[col] = { type: dtypes[idx], nullCount: nullCounts[idx] };
    });
    
    return { columns, meta };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setLoading(true);
    
    try {
      const df = await dfjs.readCSV(file);
      setCleanedDf(df);
      setViewDf(df);
      setHistory([{ action: 'Ingested data', df, timestamp: new Date() }]);
      setSuggestions([]);
      setPlotConfig(null);
      setNarrative(null);
      generateNarrative(df, null);
    } catch (err) {
      console.error('Error reading CSV', err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Suggestions
  const handleMagicWand = async () => {
    if (!cleanedDf) return;
    setIsSidebarOpen(true);
    setAiLoading(true);
    
    const metadata = getMetadata(cleanedDf);
    const sampleData = cleanedDf.head(3).toJSON();
    
    try {
      const response = await fetch('/api/clean-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata, sampleData })
      });
      const data = await response.json();
      if (data.suggestions) setSuggestions(data.suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const applyFix = (code: string, label: string) => {
    if (!cleanedDf) return;
    try {
      const transformFn = new Function('df', `return ${code}`);
      const newDf = transformFn(cleanedDf);
      
      setHistory(prev => [...prev, { action: `Applied: ${label}`, df: newDf, timestamp: new Date() }]);
      setCleanedDf(newDf);
      setViewDf(newDf);
      setSuggestions(prev => prev.filter(s => s.danfoCode !== code));
      generateNarrative(newDf, plotConfig);
    } catch (err) {
      console.error('Transformation failed', err);
      alert('Failed to apply fix.');
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const previousState = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCleanedDf(previousState.df);
      setViewDf(previousState.df);
      generateNarrative(previousState.df, plotConfig);
    }
  };

  // Phase 3: Vibe Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !cleanedDf) return;
    
    setIsSearching(true);
    const schema = getMetadata(cleanedDf);

    try {
      const response = await fetch('/api/vibe-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, schema })
      });
      const data = await response.json();
      
      let newViewDf = cleanedDf;
      if (data.filterCode && data.filterCode !== 'df') {
        const transformFn = new Function('df', `return ${data.filterCode}`);
        newViewDf = transformFn(cleanedDf);
        setViewDf(newViewDf);
        // Only log filter actions visually but don't override the cleaned base data
        setHistory(prev => [...prev, { action: `Filtered: ${searchQuery}`, df: cleanedDf, timestamp: new Date() }]);
      }
      
      setPlotConfig(data);
      generateNarrative(newViewDf, data);
    } catch (err) {
      console.error('Search failed', err);
      alert("I couldn't process this query. Try a different phrasing.");
    } finally {
      setIsSearching(false);
    }
  };

  // Phase 4: Narrative
  const generateNarrative = async (currentDf: any, config: any) => {
    if (!currentDf) return;
    setNarrativeLoading(true);
    let desc = {};
    try { desc = currentDf.describe().toJSON(); } catch(e){
       // ignore
    }
    
    const dataSummary = {
      shape: currentDf.shape,
      description: desc
    };
    
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSummary, chartDetails: config })
      });
      const data = await response.json();
      setNarrative(data);
    } catch (err) {
      console.error('Narrative gen failed', err);
    } finally {
      setNarrativeLoading(false);
    }
  };

  // Phase 4: Exports
  const handleDownloadCSV = () => {
    if (!cleanedDf) return;
    // @ts-ignore
    dfjs.toCSV(cleanedDf, { fileName: 'datavibe_cleaned.csv', download: true });
  };
  
  const handleCopyReport = () => {
    if (!narrative) return;
    const text = `DataVibe Report\n\n1. The Vibe: ${narrative.vibe}\n2. The Outlier: ${narrative.outlier}\n3. The Action: ${narrative.action}`;
    navigator.clipboard.writeText(text);
    alert('Report copied to clipboard!');
  };

  const renderPlot = () => {
    if (!viewDf || !plotConfig) {
      // Default basic plot
      if (!viewDf) return null;
      let targetCol: string | null = null;
      const numCols = viewDf.columns.filter((c: string, i: number) => ['int32', 'float32', 'number'].includes(viewDf.ctypes.values[i]));
      if (numCols.length > 0) targetCol = numCols[0];
      
      if (!targetCol) return <div className="p-8 text-center text-slate-400">No numeric columns to plot automatically. Ask a question!</div>;
      
      return (
        <Plot
          data={[{ y: viewDf[targetCol].values, type: 'scatter', mode: 'lines+markers', marker: { color: '#6366f1' } }]}
          layout={{ autosize: true, title: `Distribution of ${targetCol}`, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', margin: { t: 40, r: 20, b: 40, l: 40 } }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      );
    }

    const { chartType, mappings, plotlyConfigLayout } = plotConfig;
    const trace: any = { type: chartType };

    if (chartType === 'pie') {
      if (mappings.labelsColumn && viewDf.columns.includes(mappings.labelsColumn)) trace.labels = viewDf[mappings.labelsColumn].values;
      if (mappings.valuesColumn && viewDf.columns.includes(mappings.valuesColumn)) trace.values = viewDf[mappings.valuesColumn].values;
    } else {
      if (mappings.xColumn && viewDf.columns.includes(mappings.xColumn)) trace.x = viewDf[mappings.xColumn].values;
      if (mappings.yColumn && viewDf.columns.includes(mappings.yColumn)) trace.y = viewDf[mappings.yColumn].values;
    }

    if (chartType === 'bar' || chartType === 'scatter') {
      trace.marker = { color: '#6366f1' };
    }

    return (
      <Plot
        data={[trace]}
        layout={{ ...plotlyConfigLayout, autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', margin: { t: 40, r: 20, b: 40, l: 40 } }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          <Database className="w-6 h-6" />
          DataVibe {fileName && <span className="text-sm font-medium text-slate-500 ml-2">/ {fileName}</span>}
        </div>
        
        {/* Phase 3: Vibe Search */}
        {cleanedDf && (
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ask a question about your data (e.g. 'Show me a pie chart of categories')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
            />
            {isSearching && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
            )}
          </form>
        )}
        
        <div className="flex items-center gap-3">
          {cleanedDf && (
            <button
              onClick={handleDownloadCSV}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Download Data CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {cleanedDf && (
            <button
              onClick={handleMagicWand}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              AI Consultant
            </button>
          )}
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`flex-1 p-6 overflow-auto transition-all ${isSidebarOpen ? 'pr-80' : ''}`}>
          {!cleanedDf && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 text-slate-300" />
              <h2 className="text-xl font-medium text-slate-600 mb-2">No Data Uploaded</h2>
              <p>Upload a CSV file to start analyzing and cleaning your data.</p>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p className="text-slate-500 font-medium">Processing dataset...</p>
            </div>
          ) : cleanedDf && (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
              
              {/* Phase 4: Warning Overlay */}
              {narrative?.recommendationOverlay?.show && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  narrative.recommendationOverlay.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  narrative.recommendationOverlay.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">AI Data Alert</h4>
                    <p className="text-sm font-medium">{narrative.recommendationOverlay.message}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6">
                {/* Left col: Visualization */}
                <div className="col-span-2 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        {plotConfig?.insight || 'Data Overview'}
                      </h2>
                      <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                        {viewDf?.shape[0]} rows visible
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg" ref={plotContainerRef}>
                      {renderPlot()}
                    </div>
                  </div>
                  
                  {/* Phase 4: Narrative Panel */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-500" />
                        AI Data Story
                      </h2>
                      <div className="flex gap-2">
                        <button onClick={handleCopyReport} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors">
                          <Copy className="w-4 h-4" /> Copy
                        </button>
                      </div>
                    </div>
                    {narrativeLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                        <div className="h-4 bg-slate-100 rounded w-4/6"></div>
                      </div>
                    ) : narrative ? (
                      <div className="space-y-4">
                        <div className="flex gap-3 items-start">
                          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg shrink-0">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm">The Vibe</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">{narrative.vibe}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="bg-amber-100 text-amber-600 p-2 rounded-lg shrink-0">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm">The Outlier</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">{narrative.outlier}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg shrink-0">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm">Actionable Insight</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">{narrative.action}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm italic">Analyze data to generate a story.</p>
                    )}
                  </div>
                </div>

                {/* Right col: Session History & Dataset state */}
                <div className="col-span-1 space-y-6">
                  {/* Session History Log */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" /> Vibe Log (History)
                    </h2>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {history.map((h, i) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-slate-200 text-slate-500 group-[.is-active]:bg-indigo-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-slate-100 bg-slate-50 shadow-sm text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-700">{h.action}</span>
                            </div>
                            <div className="text-xs text-slate-500">{h.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* AI Sidebar (Phase 2) */}
      {isSidebarOpen && (
        <aside className="w-80 bg-white border-l border-slate-200 fixed right-0 top-[73px] bottom-0 overflow-y-auto shadow-xl z-30 flex flex-col transform transition-transform">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              AI Consultant
            </h3>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              ×
            </button>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-4">
            {history.length > 1 && (
              <button onClick={handleUndo} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">
                <Undo2 className="w-4 h-4" />
                Undo Last Action
              </button>
            )}

            {aiLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex flex-col gap-2 p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-200 rounded w-full"></div>
                    <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                    <div className="h-8 bg-slate-200 rounded w-full mt-2"></div>
                  </div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map(sugg => (
                <div key={sugg.id} className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/50 flex flex-col gap-2 shadow-sm">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <h4 className="font-semibold text-sm text-slate-800">{sugg.label}</h4>
                  </div>
                  <p className="text-xs text-slate-600 pl-6 leading-relaxed">{sugg.description}</p>
                  <code className="text-[10px] bg-slate-800 text-slate-200 p-2 rounded-md font-mono mt-1 overflow-x-auto break-all">
                    {sugg.danfoCode}
                  </code>
                  <button onClick={() => applyFix(sugg.danfoCode, sugg.label)} className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg font-medium text-sm transition-all shadow-sm">
                    <Check className="w-3.5 h-3.5" /> Apply Fix
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Wand2 className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                No suggestions found or data looks clean!
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
