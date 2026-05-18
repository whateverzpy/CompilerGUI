import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { EPSILON, type GrammarAnalysis } from '../../core/grammar';
import { useCompilerStore } from '../../store/useCompilerStore';
import { SetTable } from './SetTable';

interface StepInspectorProps {
  analysis: GrammarAnalysis;
}

export const StepInspector = ({ analysis }: StepInspectorProps) => {
  const currentStepIndex = useCompilerStore((state) => state.currentStepIndex);
  const previousStep = useCompilerStore((state) => state.previousStep);
  const nextStep = useCompilerStore((state) => state.nextStep);
  const step = analysis.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === analysis.steps.length - 1;
  const highlightedSymbols = step.phase === 'first' ? step.addedSymbols : [];
  const highlightedFollowSymbols = step.phase === 'follow' ? step.addedSymbols : [];
  const phaseLabel = step.phase === 'first' ? 'FIRST' : 'FOLLOW';

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section className="rounded-md border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium uppercase tracking-normal text-ink-600">
                {phaseLabel}
              </span>
              <h2 className="text-base font-semibold text-ink-950">{step.title}</h2>
            </div>
            <p className="mt-2 text-sm text-ink-600">
              第 {currentStepIndex + 1} 步 / 共 {analysis.steps.length} 步
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<ChevronLeft size={16} />}
              onClick={previousStep}
              disabled={isFirstStep}
              aria-label="上一步"
              title="上一步"
            />
            <Button
              icon={<ChevronRight size={16} />}
              onClick={nextStep}
              disabled={isLastStep}
              aria-label="下一步"
              title="下一步"
            />
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)]">
          <div>
            <div className="font-mono text-sm font-semibold text-ink-950">
              {step.production?.display ?? `${analysis.grammar.startSymbol} 加入 $`}
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-600">{step.reason}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-normal text-ink-600">
              本步检查
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(step.examinedSymbols.length ? step.examinedSymbols : [EPSILON]).map((symbol) => (
                <span
                  key={symbol}
                  className="rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-ink-800"
                >
                  {symbol}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-h-0 gap-4 xl:grid-cols-2">
        <SetTable
          title="FIRST 集"
          sets={step.firstSets}
          focusSymbol={step.phase === 'first' ? step.focusSymbol : undefined}
          changedSymbols={highlightedSymbols}
        />
        <SetTable
          title="FOLLOW 集"
          sets={step.followSets}
          focusSymbol={step.phase === 'follow' ? step.focusSymbol : undefined}
          changedSymbols={highlightedFollowSymbols}
        />
      </div>
    </div>
  );
};
