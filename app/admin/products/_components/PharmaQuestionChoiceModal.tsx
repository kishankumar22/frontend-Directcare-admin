'use client';

import { useEffect } from 'react';
import { X, FileQuestion, Ban } from 'lucide-react';

interface PharmaQuestionChoiceModalProps {
  isOpen: boolean;
  onSelect: (withQuestions: boolean) => void;
  onCancel: () => void;
}

export default function PharmaQuestionChoiceModal({
  isOpen,
  onSelect,
  onCancel,
}: PharmaQuestionChoiceModalProps) {
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl max-w-xl w-full animate-slideUp overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <FileQuestion className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pharma Product Setup</h3>
              <p className="text-xs text-slate-400">Configure how customers purchase this product</p>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm">
            Please choose how you want to set up this pharmaceutical product:
          </p>

          <div className="grid grid-cols-1 gap-3">
            {/* WITH QUESTIONS */}
            <button
              type="button"
              onClick={() => onSelect(true)}
              className="group p-4 bg-slate-800/40 hover:bg-violet-500/5 border border-slate-700 hover:border-violet-500/50 text-left rounded-xl transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-violet-500/10 group-hover:bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                  <FileQuestion className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm mb-0.5">With Questions</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Assign pharmacy questions that customers must answer when purchasing this product.
                  </p>
                </div>
              </div>
            </button>

            {/* WITHOUT QUESTIONS */}
            <button
              type="button"
              onClick={() => onSelect(false)}
              className="group p-4 bg-slate-800/40 hover:bg-cyan-500/5 border border-slate-700 hover:border-cyan-500/50 text-left rounded-xl transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 group-hover:bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                  <Ban className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm mb-0.5">Without Questions</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Set up as a pharma product but do not require any customer questionnaire.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all text-xs font-semibold"
          >
            Cancel Setup
          </button>
        </div>

      </div>
    </div>
  );
}
