import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, CheckCircle2, X, Loader2 } from 'lucide-react';
import { AISuggestion } from '../types';

interface AISidebarProps {
  suggestions: AISuggestion[];
  onApply: (suggestion: AISuggestion) => void;
  isLoading: boolean;
  onClose: () => void;
  isOpen: boolean;
}

export function AISidebar({ suggestions, onApply, isLoading, onClose, isOpen }: AISidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-[420px] bg-white shadow-2xl z-50 flex flex-col pt-safe-top"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white pt-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Brain size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">AI Consultant</h2>
                  <p className="text-xs text-indigo-600 font-bold tracking-wider uppercase">Data Intelligence</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors active:scale-95 text-gray-400 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
                  <div className="relative">
                    <div className="absolute inset-0 border-4 border-indigo-200 rounded-full border-t-indigo-600 animate-spin w-16 h-16" />
                    <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Analyzing Metadata</h3>
                    <p className="text-sm text-gray-500 font-medium">Scanning for missing values, duplicates, and type mismatches...</p>
                  </div>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.map((s, idx) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">{s.label}</h4>
                      <p className="text-sm text-gray-600 mb-5 leading-relaxed">{s.description}</p>
                      <button onClick={() => onApply(s)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                        <Sparkles size={18} /> Apply Recommendation
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-70 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                     <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pristine Data!</h3>
                  <p className="text-gray-500">No major issues detected in the metadata.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
