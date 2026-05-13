import React, { useState, useRef } from 'react';
import * as dfjs from 'danfojs';
import Plot from 'react-plotly.js';
import { Upload, Wand2, Database, BarChart3, AlertCircle, Undo2, Check, RefreshCw } from 'lucide-react';

interface Suggestion {
  id: string;
  label: string;
  description: string;
  danfoCode: string;
}

export default function App() {
  const [cleanedDf, setCleanedDf] = useState<dfjs.DataFrame | null>(null);
  const [history, setHistory] = useState<dfjs.DataFrame[]>([]);
  
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setLoading(true);
    
    dfjs.readCSV(file).then((df) => {
      setCleanedDf(df);
      setHistory([df]);
      setSuggestions([]);
      setLoading(false);
    }).catch(err => {
      console.error('Error reading CSV', err);
      setLoading(false);
    });
  };

  const getMetadata = (df: dfjs.DataFrame) => {
    const columns = df.columns;
    const dtypes = df.ctypes.values;
    const nullCounts = df.isNa().sum().values;
    
    const meta: Record<string, any> = {};
    columns.forEach((col, idx) => {
      meta[col] = {
        type: dtypes[idx],
        nullCount: nullCounts[idx]
      };
    });
    
    let description = {};
    try {
      // @ts-ignore
      description = df.describe().toJSON();
    } catch (e) {
      // ignore
    }

    return {
      columns,
      meta,
      description
    };
  };

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
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to get suggestions. View console for details.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyFix = (code: string) => {
    if (!cleanedDf) return;
    
    try {
      // Push current state to history
      setHistory(prev => [...prev, cleanedDf]);
      
      // Execute the danfo operation
      // we use Function constructor to safely evaluate with df in scope
      const transformFn = new Function('df', `return ${code}`);
      const newDf = transformFn(cleanedDf);
      
      setCleanedDf(newDf);
      
      // Remove or update suggestions?
      // Let's just remove the suggestion for now, or the user can re-evaluate
    } catch (err) {
      console.error('Transformation failed', err);
      alert('Failed to apply fix. The generated code might be incompatible.');
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const previousDf = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCleanedDf(previousDf);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          <Database className="w-6 h-6" />
          DataVibe {fileName && <span className="text-sm font-medium text-slate-500 ml-2">/ {fileName}</span>}
        </div>
        
        <div className="flex items-center gap-3">
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
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
        </div>
      </header>

      {/* Main Content */}
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
              <p className="text-slate-500 font-medium">Loading dataset...</p>
            </div>
          ) : cleanedDf && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-500" />
                    Dataset Preview
                  </h2>
                  <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                    {cleanedDf.shape[0]} rows × {cleanedDf.shape[1]} columns
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-200 text-sm">
                        {cleanedDf.columns.map((col, i) => (
                          <th key={i} className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {cleanedDf.head(5).values.map((row: any[], i: number) => (
                        <tr key={i} className="border-b border-slate-100">
                          {row.map((val, j) => (
                            <td key={j} className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {val === null || val === undefined ? (
                                <span className="text-slate-400 italic">null</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cleanedDf.shape[0] > 5 && (
                    <div className="text-center py-3 text-sm text-slate-500 bg-slate-50 border-b border-slate-200">
                      Showing first 5 rows
                    </div>
                  )}
                </div>
              </div>

              {/* Data Visualization */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Data Distribution
                 </h2>
                 <div className="h-[400px] w-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg">
                   {/* We can plot the first numeric column vs index as an example */}
                   {(() => {
                     const numCols = cleanedDf.columns.filter((col, i) => ['int32', 'float32', 'number'].includes(cleanedDf.ctypes.values[i]));
                     if (numCols.length > 0) {
                       const targetCol = numCols[0];
                       const yData = cleanedDf[targetCol].values as number[];
                       return (
                         <Plot
                           data={[
                             {
                               y: yData,
                               type: 'scatter',
                               mode: 'lines+markers',
                               marker: { color: '#6366f1' },
                             }
                           ]}
                           layout={{ 
                             autosize: true,
                             title: `Distribution of ${targetCol}`,
                             paper_bgcolor: 'transparent',
                             plot_bgcolor: 'transparent',
                             margin: { t: 40, r: 20, b: 40, l: 40 }
                           }}
                           useResizeHandler={true}
                           style={{ width: '100%', height: '100%' }}
                         />
                       );
                     } else {
                       return <div className="text-slate-400">No numeric columns found for visualization</div>;
                     }
                   })()}
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI Sidebar */}
      {isSidebarOpen && (
        <aside className="w-80 bg-white border-l border-slate-200 fixed right-0 top-[73px] bottom-0 overflow-y-auto shadow-xl z-20 flex flex-col transform transition-transform">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              AI Consultant
            </h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              ×
            </button>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-4">
            {history.length > 1 && (
              <button 
                onClick={handleUndo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
              >
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
                  <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                    {sugg.description}
                  </p>
                  <code className="text-[10px] bg-slate-800 text-slate-200 p-2 rounded-md font-mono mt-1 overflow-x-auto break-all">
                    {sugg.danfoCode}
                  </code>
                  <button 
                    onClick={() => applyFix(sugg.danfoCode)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg font-medium text-sm transition-all shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Fix
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
