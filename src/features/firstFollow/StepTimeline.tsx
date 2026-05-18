import { classNames } from '../../lib/classNames';
import { type GrammarAnalysis } from '../../core/grammar';
import { useCompilerStore } from '../../store/useCompilerStore';

interface StepTimelineProps {
  analysis: GrammarAnalysis;
}

export const StepTimeline = ({ analysis }: StepTimelineProps) => {
  const currentStepIndex = useCompilerStore((state) => state.currentStepIndex);
  const selectStep = useCompilerStore((state) => state.selectStep);

  return (
    <section className="hidden min-h-0 flex-col border-l border-neutral-200 bg-white xl:flex">
      <div className="border-b border-neutral-200 px-4 py-4">
        <h2 className="text-sm font-semibold text-ink-950">推导步骤</h2>
        <p className="mt-1 text-xs text-ink-600">共 {analysis.steps.length} 步</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {analysis.steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => selectStep(index)}
            className={classNames(
              'mb-1 grid w-full grid-cols-[34px_1fr] gap-2 rounded-md border px-2 py-2 text-left transition-colors',
              index === currentStepIndex
                ? 'border-ink-950 bg-neutral-100'
                : 'border-transparent hover:bg-neutral-50',
            )}
          >
            <span className="font-mono text-xs text-ink-400">{index + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold uppercase tracking-normal text-ink-600">
                {step.phase === 'first' ? 'FIRST' : 'FOLLOW'} {step.pass > 0 ? `第 ${step.pass} 轮` : ''}
              </span>
              <span className="mt-1 block truncate font-mono text-xs text-ink-950">
                {step.production?.display ?? `${analysis.grammar.startSymbol} 加入 $`}
              </span>
              {step.addedSymbols.length > 0 && (
                <span className="mt-1 block truncate text-xs text-ink-600">
                  + {step.addedSymbols.join(', ')}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
