import { RotateCcw, Wand2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { useCompilerStore } from '../../store/useCompilerStore';

export const GrammarEditor = () => {
  const grammarText = useCompilerStore((state) => state.grammarText);
  const errors = useCompilerStore((state) => state.errors);
  const setGrammarText = useCompilerStore((state) => state.setGrammarText);
  const runAnalysis = useCompilerStore((state) => state.runAnalysis);
  const resetSample = useCompilerStore((state) => state.resetSample);

  return (
    <section className="flex min-h-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-950">文法输入</h2>
          <p className="mt-1 text-xs text-ink-600">每行一个产生式，多个候选式使用 | 分隔</p>
        </div>
        <div className="flex gap-2">
          <Button
            icon={<RotateCcw size={15} />}
            onClick={resetSample}
            variant="ghost"
            aria-label="恢复示例文法"
            title="恢复示例文法"
          />
          <Button icon={<Wand2 size={15} />} onClick={runAnalysis} variant="primary">
            开始分析
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
        <textarea
          className="min-h-[300px] flex-1 resize-none rounded-md border border-neutral-300 bg-neutral-50 p-4 font-mono text-sm leading-6 text-ink-950 outline-none focus:border-ink-950 focus:bg-white focus:shadow-focus"
          spellCheck={false}
          value={grammarText}
          onChange={(event) => setGrammarText(event.target.value)}
        />

        {errors.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {errors.map((error) => (
              <div key={`${error.line}-${error.message}`}>
                第 {error.line} 行：{error.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
