import { ArrowLeft, AlertTriangle, RotateCcw, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { EOF_SYMBOL, type GrammarError } from '../../core/grammar';
import {
  analyzeLL1Source,
  type LL1Analysis,
  type LL1TableEntry,
} from '../../core/ll1';
import { classNames } from '../../lib/classNames';
import { SetTable } from '../firstFollow/SetTable';
import { sampleLL1Grammar, sampleLL1Input } from './sample';

interface LL1PageProps {
  onBack: () => void;
}

interface SelectedCell {
  nonTerminal: string;
  terminal: string;
}

const firstFilledCell = (analysis?: LL1Analysis): SelectedCell | undefined => {
  if (!analysis) {
    return undefined;
  }

  for (const nonTerminal of analysis.grammarAnalysis.grammar.nonTerminals) {
    for (const terminal of analysis.terminals) {
      if (analysis.table[nonTerminal][terminal].length > 0) {
        return { nonTerminal, terminal };
      }
    }
  }

  return undefined;
};

const formatSet = (values: string[]) => (values.length ? `{ ${values.join(', ')} }` : '∅');

export const LL1Page = ({ onBack }: LL1PageProps) => {
  const initialResult = useMemo(() => analyzeLL1Source(sampleLL1Grammar, sampleLL1Input), []);
  const [grammarText, setGrammarText] = useState(sampleLL1Grammar);
  const [inputText, setInputText] = useState(sampleLL1Input);
  const [analysis, setAnalysis] = useState(initialResult.analysis);
  const [errors, setErrors] = useState<GrammarError[]>(initialResult.errors);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | undefined>(
    firstFilledCell(initialResult.analysis),
  );

  const runAnalysis = () => {
    const result = analyzeLL1Source(grammarText, inputText);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setSelectedCell(firstFilledCell(result.analysis));
  };

  const resetSample = () => {
    const result = analyzeLL1Source(sampleLL1Grammar, sampleLL1Input);
    setGrammarText(sampleLL1Grammar);
    setInputText(sampleLL1Input);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setSelectedCell(firstFilledCell(result.analysis));
  };

  const selectedEntries =
    analysis && selectedCell
      ? analysis.table[selectedCell.nonTerminal][selectedCell.terminal]
      : [];

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden bg-[#f7f7f5] text-ink-950 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_360px]">
      <section className="flex min-h-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-950">LL(1) 输入</h2>
            <p className="mt-1 text-xs text-ink-600">输入文法和待分析符号串</p>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<RotateCcw size={15} />}
              onClick={resetSample}
              variant="ghost"
              aria-label="恢复示例"
              title="恢复示例"
            />
            <Button icon={<Wand2 size={15} />} onClick={runAnalysis} variant="primary">
              开始分析
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <label className="flex min-h-0 flex-1 flex-col gap-2">
            <span className="text-xs font-semibold text-ink-600">产生式</span>
            <textarea
              className="min-h-[280px] flex-1 resize-none rounded-md border border-neutral-300 bg-neutral-50 p-4 font-mono text-sm leading-6 text-ink-950 outline-none focus:border-ink-950 focus:bg-white focus:shadow-focus"
              spellCheck={false}
              value={grammarText}
              onChange={(event) => setGrammarText(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-600">输入串</span>
            <input
              className="h-10 rounded-md border border-neutral-300 bg-neutral-50 px-3 font-mono text-sm text-ink-950 outline-none focus:border-ink-950 focus:bg-white focus:shadow-focus"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={`例如：id + id * id，可省略结尾 ${EOF_SYMBOL}`}
            />
          </label>

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

      <div className="min-h-0 overflow-y-auto px-5 py-5">
        <header className="mb-5">
          <Button icon={<ArrowLeft size={15} />} variant="ghost" onClick={onBack} className="mb-3 px-0">
            返回主页
          </Button>
          <h1 className="text-2xl font-semibold tracking-normal text-ink-950">
            LL(1) 分析表构造与分析过程
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            基于 FIRST/FOLLOW 构造预测分析表，并用分析栈演示输入串的匹配过程。
          </p>
        </header>

        {analysis ? (
          <div className="grid gap-4">
            <section className="grid gap-4 xl:grid-cols-2">
              <SetTable title="本次使用的 FIRST 集" sets={analysis.grammarAnalysis.firstSets} />
              <SetTable title="本次使用的 FOLLOW 集" sets={analysis.grammarAnalysis.followSets} />
            </section>

            {analysis.conflicts.length > 0 && (
              <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle size={16} />
                  预测分析表存在冲突
                </div>
                <div className="mt-2 leading-6">
                  {analysis.conflicts.map((conflict) => (
                    <div key={`${conflict.nonTerminal}-${conflict.terminal}`}>
                      M[{conflict.nonTerminal}, {conflict.terminal}] 同时包含{' '}
                      {conflict.entries.map((entry) => entry.production.display).join('；')}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <LL1TableView
              analysis={analysis}
              selectedCell={selectedCell}
              onSelectCell={setSelectedCell}
            />

            <ParseProcess
              analysis={analysis}
              onSelectEntry={(entry) =>
                setSelectedCell({ nonTerminal: entry.nonTerminal, terminal: entry.terminal })
              }
            />
          </div>
        ) : (
          <section className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-ink-600">
            当前输入无法完成 LL(1) 分析，请检查左侧文法格式。
          </section>
        )}
      </div>

      <aside className="hidden min-h-0 flex-col border-l border-neutral-200 bg-white xl:flex">
        <CellDetail selectedCell={selectedCell} entries={selectedEntries} />
      </aside>
    </main>
  );
};

interface LL1TableViewProps {
  analysis: LL1Analysis;
  selectedCell?: SelectedCell;
  onSelectCell: (cell: SelectedCell) => void;
}

const LL1TableView = ({ analysis, selectedCell, onSelectCell }: LL1TableViewProps) => {
  const nonTerminals = analysis.grammarAnalysis.grammar.nonTerminals;

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink-950">LL(1) 预测分析表</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-50">
              <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">
                非终结符
              </th>
              {analysis.terminals.map((terminal) => (
                <th
                  key={terminal}
                  className="border-b border-r border-neutral-200 px-3 py-3 font-mono font-semibold text-ink-950 last:border-r-0"
                >
                  {terminal}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonTerminals.map((nonTerminal) => (
              <tr key={nonTerminal}>
                <th className="border-b border-r border-neutral-200 bg-neutral-50 px-3 py-3 font-mono font-semibold text-ink-950">
                  {nonTerminal}
                </th>
                {analysis.terminals.map((terminal) => {
                  const entries = analysis.table[nonTerminal][terminal];
                  const isSelected =
                    selectedCell?.nonTerminal === nonTerminal && selectedCell.terminal === terminal;
                  return (
                    <td
                      key={`${nonTerminal}-${terminal}`}
                      className={classNames(
                        'h-20 cursor-pointer border-b border-r border-neutral-200 p-2 last:border-r-0 hover:bg-neutral-50',
                        isSelected && 'bg-neutral-100 outline outline-1 outline-ink-950',
                      )}
                      onClick={() => onSelectCell({ nonTerminal, terminal })}
                    >
                      {entries.length === 0 ? (
                        <span className="font-mono text-xs text-ink-400">空</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {entries.map((entry) => (
                            <span
                              key={entry.id}
                              className={classNames(
                                'rounded border px-2 py-1 font-mono text-xs',
                                entries.length > 1
                                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                                  : 'border-neutral-200 bg-white text-ink-950',
                              )}
                            >
                              {entry.production.display}
                              <span className="ml-2 text-ink-400">#{entry.stepIndex}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

interface CellDetailProps {
  selectedCell?: SelectedCell;
  entries: LL1TableEntry[];
}

const CellDetail = ({ selectedCell, entries }: CellDetailProps) => (
  <div className="min-h-0 overflow-y-auto">
    <div className="border-b border-neutral-200 px-4 py-4">
      <h2 className="text-sm font-semibold text-ink-950">表项依据</h2>
      <p className="mt-1 text-xs text-ink-600">点击表格单元查看填表来源</p>
    </div>
    <div className="space-y-3 p-4">
      {selectedCell ? (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-xs text-ink-400">当前单元</div>
          <div className="mt-1 font-mono text-sm font-semibold text-ink-950">
            M[{selectedCell.nonTerminal}, {selectedCell.terminal}]
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-ink-600">
          尚未选择表项。
        </div>
      )}

      {entries.length === 0 && selectedCell && (
        <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm leading-6 text-ink-600">
          该单元为空，构表过程中没有产生式填入。
        </div>
      )}

      {entries.map((entry) => (
        <article key={entry.id} className="rounded-md border border-neutral-200 bg-white p-4">
          <div className="text-xs font-semibold text-ink-400">填表步骤 #{entry.stepIndex}</div>
          <div className="mt-2 font-mono text-sm font-semibold text-ink-950">
            {entry.production.display}
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-600">{entry.reason}</p>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="text-ink-400">FIRST(右部)：</span>
              <span className="font-mono text-ink-950">{formatSet(entry.firstOfRhs)}</span>
            </div>
            <div>
              <span className="text-ink-400">FOLLOW(左部)：</span>
              <span className="font-mono text-ink-950">{formatSet(entry.followOfLhs)}</span>
            </div>
            <div>
              <span className="text-ink-400">来源规则：</span>
              <span className="text-ink-950">
                {entry.source === 'first' ? 'FIRST(右部)' : 'ε 与 FOLLOW(左部)'}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
);

interface ParseProcessProps {
  analysis: LL1Analysis;
  onSelectEntry: (entry: LL1TableEntry) => void;
}

const ParseProcess = ({ analysis, onSelectEntry }: ParseProcessProps) => (
  <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-ink-950">预测分析过程</h2>
        <p className="mt-1 text-xs text-ink-600">
          输入：<span className="font-mono">{analysis.inputTokens.join(' ')}</span>
        </p>
      </div>
      <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-ink-600">
        {analysis.parseSteps.length} 步
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-50">
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">步</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">分析栈</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">剩余输入</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">动作</th>
            <th className="border-b border-neutral-200 px-3 py-3 font-semibold text-ink-600">说明</th>
          </tr>
        </thead>
        <tbody>
          {analysis.parseSteps.map((step) => (
            <tr key={step.index} className={step.action === 'error' ? 'bg-red-50' : undefined}>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-400">
                {step.index}
              </td>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-950">
                {step.stack.join(' ')}
              </td>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-950">
                {step.input.join(' ')}
              </td>
              <td className="border-b border-r border-neutral-200 px-3 py-3">
                <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-ink-600">
                  {actionLabel(step.action)}
                </span>
              </td>
              <td className="border-b border-neutral-200 px-3 py-3 text-ink-600">
                {step.tableEntry ? (
                  <button
                    className="text-center text-ink-950 underline decoration-neutral-300 underline-offset-4 hover:decoration-ink-950"
                    onClick={() => onSelectEntry(step.tableEntry!)}
                  >
                    {step.message}
                  </button>
                ) : (
                  step.message
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const actionLabel = (action: 'predict' | 'match' | 'accept' | 'error') => {
  if (action === 'predict') {
    return '推导';
  }
  if (action === 'match') {
    return '匹配';
  }
  if (action === 'accept') {
    return '接受';
  }
  return '错误';
};
