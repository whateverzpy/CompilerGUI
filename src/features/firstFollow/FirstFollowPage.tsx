import { ArrowLeft, BookOpen, ListChecks } from 'lucide-react';
import { Button } from '../../components/Button';
import { classNames } from '../../lib/classNames';
import { useCompilerStore } from '../../store/useCompilerStore';
import { FinalResults } from './FinalResults';
import { GrammarEditor } from './GrammarEditor';
import { GrammarGraph } from './GrammarGraph';
import { StepInspector } from './StepInspector';
import { StepTimeline } from './StepTimeline';

interface FirstFollowPageProps {
  onBack: () => void;
}

export const FirstFollowPage = ({ onBack }: FirstFollowPageProps) => {
  const analysis = useCompilerStore((state) => state.analysis);
  const currentStepIndex = useCompilerStore((state) => state.currentStepIndex);
  const viewMode = useCompilerStore((state) => state.viewMode);
  const setViewMode = useCompilerStore((state) => state.setViewMode);

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden bg-[#f7f7f5] text-ink-950 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)_280px]">
      <GrammarEditor />

      <div className="min-h-0 overflow-y-auto px-5 py-5">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button icon={<ArrowLeft size={15} />} variant="ghost" onClick={onBack} className="mb-3 px-0">
              返回主页
            </Button>
            <h1 className="text-2xl font-semibold tracking-normal text-ink-950">
              FIRST / FOLLOW 可视化
            </h1>
            <p className="mt-1 text-sm text-ink-600">最终集合与逐步推导</p>
          </div>
          {analysis && (
            <div className="flex rounded-md border border-neutral-200 bg-white p-1">
              <Button
                icon={<ListChecks size={15} />}
                variant="ghost"
                onClick={() => setViewMode('result')}
                className={classNames(
                  'h-8 border-0 px-3',
                  viewMode === 'result' && 'bg-neutral-100 text-ink-950',
                )}
              >
                最终结果
              </Button>
              <Button
                icon={<BookOpen size={15} />}
                variant="ghost"
                onClick={() => setViewMode('steps')}
                className={classNames(
                  'h-8 border-0 px-3',
                  viewMode === 'steps' && 'bg-neutral-100 text-ink-950',
                )}
              >
                逐步分析
              </Button>
            </div>
          )}
        </header>

        {analysis ? (
          <div className="grid gap-4">
            {viewMode === 'result' ? (
              <FinalResults analysis={analysis} />
            ) : (
              <StepInspector analysis={analysis} />
            )}
            <GrammarGraph analysis={analysis} currentStepIndex={currentStepIndex} />
          </div>
        ) : (
          <section className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-ink-600">
            当前文法无法分析，请先修正左侧输入。
          </section>
        )}
      </div>

      {analysis && viewMode === 'steps' ? (
        <StepTimeline analysis={analysis} />
      ) : (
        <aside className="hidden border-l border-neutral-200 bg-white xl:block">
          <div className="border-b border-neutral-200 px-4 py-4">
            <h2 className="text-sm font-semibold text-ink-950">分析概览</h2>
            <p className="mt-1 text-xs text-ink-600">切换到逐步分析可查看每一次集合扩展</p>
          </div>
          {analysis && (
            <div className="space-y-3 p-4 text-sm text-ink-600">
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs text-ink-400">开始符号</div>
                <div className="mt-1 font-mono text-ink-950">{analysis.grammar.startSymbol}</div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs text-ink-400">推导步骤</div>
                <div className="mt-1 font-mono text-ink-950">{analysis.steps.length}</div>
              </div>
            </div>
          )}
        </aside>
      )}
    </main>
  );
};
