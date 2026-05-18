import { CheckCircle2 } from 'lucide-react';
import { type GrammarAnalysis } from '../../core/grammar';
import { SetTable } from './SetTable';

interface FinalResultsProps {
  analysis: GrammarAnalysis;
}

export const FinalResults = ({ analysis }: FinalResultsProps) => (
  <div className="grid gap-4">
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="text-ink-800" />
            <h2 className="text-base font-semibold text-ink-950">分析结果</h2>
          </div>
          <p className="mt-2 text-sm text-ink-600">
            已完成固定点迭代，共记录 {analysis.steps.length} 个推导步骤；开始符号为{' '}
            <span className="font-mono text-ink-950">{analysis.grammar.startSymbol}</span>。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-ink-600">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="font-mono text-base font-semibold text-ink-950">
              {analysis.grammar.productions.length}
            </div>
            <div>产生式</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="font-mono text-base font-semibold text-ink-950">
              {analysis.grammar.nonTerminals.length}
            </div>
            <div>非终结符</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="font-mono text-base font-semibold text-ink-950">
              {analysis.grammar.terminals.length}
            </div>
            <div>终结符</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-2">
        <SetTable title="FIRST 集" sets={analysis.firstSets} />
        <SetTable title="FOLLOW 集" sets={analysis.followSets} />
      </div>
    </section>

    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-ink-950">输入产生式</h3>
      </div>
      <div className="grid gap-2 p-5 md:grid-cols-2">
        {analysis.grammar.productions.map((production) => (
          <div
            key={production.id}
            className="flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
          >
            <span className="font-mono text-xs text-ink-400">{production.id}</span>
            <span className="font-mono text-sm text-ink-950">{production.display}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);
