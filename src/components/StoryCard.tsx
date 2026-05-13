import React from 'react';
import { NarrativeInsight } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryCardProps {
  narrative: NarrativeInsight | null;
  isLoading: boolean;
}

export function StoryCard({ narrative, isLoading }: StoryCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!narrative) return;
    const text = `Data Story:\n\n• The Vibe: ${narrative.vibe}\n• The Outlier: ${narrative.outlier}\n• The Action: ${narrative.action}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {narrative?.isWarning ? (
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          ) : (
             <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
               <Sparkles size={18} />
             </div>
          )}
          AI Insights
        </h3>
        
        {narrative && !isLoading && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors active:scale-95"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Report'}
          </button>
        )}
      </div>

      <div className="min-h-[150px] relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col gap-4"
            >
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  <div className="w-full space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : narrative ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="flex gap-3 items-start">
                <div className="mt-1 text-blue-500 bg-blue-50 p-1.5 rounded-lg shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">The Vibe</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{narrative.vibe}</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-1 text-amber-500 bg-amber-50 p-1.5 rounded-lg shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">The Outlier</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{narrative.outlier}</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-1 text-emerald-500 bg-emerald-50 p-1.5 rounded-lg shrink-0">
                  <Lightbulb size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">The Action</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{narrative.action}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center text-center px-4"
            >
              <div className="text-gray-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Load data or run a search to generate insights.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {narrative?.isWarning && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
      )}
    </div>
  );
}
