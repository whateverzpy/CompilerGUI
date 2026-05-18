import { create } from 'zustand';
import {
  analyzeGrammarSource,
  type GrammarAnalysis,
  type GrammarError,
} from '../core/grammar';
import { sampleGrammar } from '../features/firstFollow/sample';

export type ViewMode = 'result' | 'steps';

interface CompilerState {
  grammarText: string;
  analysis?: GrammarAnalysis;
  errors: GrammarError[];
  currentStepIndex: number;
  viewMode: ViewMode;
  setGrammarText: (grammarText: string) => void;
  setViewMode: (viewMode: ViewMode) => void;
  runAnalysis: () => void;
  resetSample: () => void;
  nextStep: () => void;
  previousStep: () => void;
  selectStep: (index: number) => void;
}

const initialAnalysis = analyzeGrammarSource(sampleGrammar);

export const useCompilerStore = create<CompilerState>((set, get) => ({
  grammarText: sampleGrammar,
  analysis: initialAnalysis.analysis,
  errors: initialAnalysis.errors,
  currentStepIndex: Math.max((initialAnalysis.analysis?.steps.length ?? 1) - 1, 0),
  viewMode: 'result',
  setGrammarText: (grammarText) => set({ grammarText }),
  setViewMode: (viewMode) => {
    const { analysis } = get();
    set({
      viewMode,
      currentStepIndex: viewMode === 'steps' && analysis ? 0 : get().currentStepIndex,
    });
  },
  runAnalysis: () => {
    const result = analyzeGrammarSource(get().grammarText);
    set({
      analysis: result.analysis,
      errors: result.errors,
      currentStepIndex: Math.max((result.analysis?.steps.length ?? 1) - 1, 0),
      viewMode: result.analysis ? 'result' : get().viewMode,
    });
  },
  resetSample: () => {
    const result = analyzeGrammarSource(sampleGrammar);
    set({
      grammarText: sampleGrammar,
      analysis: result.analysis,
      errors: result.errors,
      currentStepIndex: Math.max((result.analysis?.steps.length ?? 1) - 1, 0),
      viewMode: 'result',
    });
  },
  nextStep: () => {
    const { analysis, currentStepIndex } = get();
    if (!analysis) {
      return;
    }
    set({
      currentStepIndex: Math.min(currentStepIndex + 1, analysis.steps.length - 1),
      viewMode: 'steps',
    });
  },
  previousStep: () => {
    const { currentStepIndex } = get();
    set({ currentStepIndex: Math.max(currentStepIndex - 1, 0), viewMode: 'steps' });
  },
  selectStep: (index) => {
    const { analysis } = get();
    if (!analysis) {
      return;
    }
    set({
      currentStepIndex: Math.min(Math.max(index, 0), analysis.steps.length - 1),
      viewMode: 'steps',
    });
  },
}));
