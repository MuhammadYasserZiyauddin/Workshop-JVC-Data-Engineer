import React from 'react';
import { AISuggestion } from '../types';
import { Wand2, Code, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AISidebarProps {
  isOpen: boolean;
  isLoading: boolean;
  suggestions: AISuggestion[];
  onApply: (suggestion: AISuggestion) => void;
  onClose: () => void;
}

export function AISidebar({ isOpen, isLoading, suggestions, onApply, onClose }: AISidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
                  <Wand2 size={20} />
                </div>
                <h3 className="font-black text-gray-900 text-xl tracking-tight">AI Agent</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto scroll-smooth">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-4 text-indigo-500">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="font-bold animate-pulse text-sm">Analyzing dataframe...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-4 pb-20">
                  {suggestions.map((s) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={s.id} 
                      className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <h4 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{s.label}</h4>
               <button
                  onClick={() => onApply(s)}
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors"
                  title="Apply Fix"
                >
                  <Play size={14} className="ml-0.5" />
                </button>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-4">{s.description}</p>
                        
                        <div className="mt-4 bg-[#1E1E1E] rounded-xl overflow-hidden shadow-inner">
                          <div className="flex items-center gap-2 px-3 py-2 bg-[#2D2D2D] border-b border-[#404040]">
                            <Code size={14} className="text-gray-400" />
                            <span className="text-xs font-mono font-medium text-gray-400 uppercase">Danfo.js</span>
                          </div>
                          <div className="p-3 overflow-x-auto">
                            <code className="text-xs font-mono text-green-400 whitespace-pre">{s.danfoCode}</code>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <div className="bg-gray-50 p-4 rounded-3xl mb-4 text-gray-300 border border-gray-100">
                    <Wand2 size={32} />
                  </div>
                  <p className="font-bold text-gray-900 mb-1 text-lg">No issues found!</p>
                  <p className="text-sm text-gray-500">Your dataset looks clean and ready for analysis.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
