import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  ListChecks,
  RotateCcw,
  Table2,
  Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { EOF_SYMBOL, type GrammarError } from '../../core/grammar';
import {
  analyzeLR1Source,
  type LR1Analysis,
  type LR1ConstructionStep,
  type LR1ItemView,
  type LR1TableEntry,
} from '../../core/lr1';
import { classNames } from '../../lib/classNames';
import { sampleLR1Grammar } from './sample';

interface LR1PageProps {
  onBack: () => void;
}

type LR1ViewMode = 'result' | 'steps';

const visibleStates = (analysis: LR1Analysis, step: LR1ConstructionStep) =>
  analysis.states.slice(0, step.visibleStateCount);

const visibleTransitions = (analysis: LR1Analysis, step: LR1ConstructionStep) =>
  analysis.transitions.slice(0, step.visibleTransitionCount);

const visibleTableEntries = (analysis: LR1Analysis, step: LR1ConstructionStep) =>
  analysis.tableEntries.slice(0, step.visibleTableEntryCount);

export const LR1Page = ({ onBack }: LR1PageProps) => {
  const initialResult = useMemo(() => analyzeLR1Source(sampleLR1Grammar), []);
  const [grammarText, setGrammarText] = useState(sampleLR1Grammar);
  const [analysis, setAnalysis] = useState(initialResult.analysis);
  const [errors, setErrors] = useState<GrammarError[]>(initialResult.errors);
  const [stepIndex, setStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<LR1ViewMode>('result');
  const step = analysis?.constructionSteps[stepIndex];

  const selectViewMode = (mode: LR1ViewMode) => {
    setViewMode(mode);
    if (mode === 'steps') {
      setStepIndex(0);
    }
  };

  const runAnalysis = () => {
    const result = analyzeLR1Source(grammarText);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setStepIndex(0);
    if (result.analysis) {
      setViewMode('result');
    }
  };

  const resetSample = () => {
    const result = analyzeLR1Source(sampleLR1Grammar);
    setGrammarText(sampleLR1Grammar);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setStepIndex(0);
    setViewMode('result');
  };

  const previousStep = () => setStepIndex((current) => Math.max(current - 1, 0));
  const nextStep = () => {
    if (!analysis) {
      return;
    }
    setStepIndex((current) => Math.min(current + 1, analysis.constructionSteps.length - 1));
  };

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden bg-[#f7f7f5] text-ink-950 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <section className="flex min-h-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-950">LR(1) 输入</h2>
            <p className="mt-1 text-xs text-ink-600">输入用于构造 LR(1) 自动机的文法</p>
          </div>
          <div className="flex gap-2">
            <Button icon={<RotateCcw size={15} />} onClick={resetSample} variant="ghost" aria-label="恢复示例" title="恢复示例" />
            <Button icon={<Wand2 size={15} />} onClick={runAnalysis} variant="primary">开始构造</Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <textarea
            className="min-h-[360px] flex-1 resize-none rounded-md border border-neutral-300 bg-neutral-50 p-4 font-mono text-sm leading-6 text-ink-950 outline-none focus:border-ink-950 focus:bg-white focus:shadow-focus"
            spellCheck={false}
            value={grammarText}
            onChange={(event) => setGrammarText(event.target.value)}
          />

          {errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {errors.map((error) => (
                <div key={`${error.line}-${error.message}`}>第 {error.line} 行：{error.message}</div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="min-h-0 overflow-y-auto px-5 py-5">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button icon={<ArrowLeft size={15} />} variant="ghost" onClick={onBack} className="mb-3 px-0">
              返回主页
            </Button>
            <h1 className="text-2xl font-semibold tracking-normal text-ink-950">
              LR(1) 项目集族与分析表
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              展示 FIRST(βa) 传播、closure、goto、活前缀 DFA 和 ACTION/GOTO 表构造。
            </p>
          </div>

          {analysis && step && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-neutral-200 bg-white p-1">
                <Button
                  icon={<ListChecks size={15} />}
                  variant="ghost"
                  onClick={() => selectViewMode('result')}
                  className={classNames('h-8 border-0 px-3', viewMode === 'result' && 'bg-neutral-100 text-ink-950')}
                >
                  最终结果
                </Button>
                <Button
                  icon={<BookOpen size={15} />}
                  variant="ghost"
                  onClick={() => selectViewMode('steps')}
                  className={classNames('h-8 border-0 px-3', viewMode === 'steps' && 'bg-neutral-100 text-ink-950')}
                >
                  逐步构造
                </Button>
              </div>

              {viewMode === 'steps' && (
                <div className="flex items-center gap-2">
                  <Button icon={<ChevronLeft size={16} />} onClick={previousStep} disabled={stepIndex === 0} aria-label="上一步" title="上一步" />
                  <span className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-ink-600">
                    第 {stepIndex + 1} 步 / 共 {analysis.constructionSteps.length} 步
                  </span>
                  <Button icon={<ChevronRight size={16} />} onClick={nextStep} disabled={stepIndex === analysis.constructionSteps.length - 1} aria-label="下一步" title="下一步" />
                </div>
              )}
            </div>
          )}
        </header>

        {analysis && step ? (
          <div className="grid gap-4">
            {viewMode === 'result' ? (
              <LR1FinalResult analysis={analysis} />
            ) : (
              <>
                <NumberedGrammar analysis={analysis} />
                <LR1StepPanel step={step} />
                <LR1DfaGraph
                  title="识别活前缀的 DFA 逐步构造"
                  analysis={analysis}
                  states={visibleStates(analysis, step)}
                  transitions={visibleTransitions(analysis, step)}
                  currentStep={step}
                />
                <ItemSetGrid states={visibleStates(analysis, step)} currentStep={step} />
                <LR1TableView analysis={analysis} entries={visibleTableEntries(analysis, step)} />
              </>
            )}
          </div>
        ) : (
          <section className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-ink-600">
            当前文法无法构造 LR(1) 项目集族，请检查左侧产生式。
          </section>
        )}
      </div>

      {analysis && step && viewMode === 'steps' ? (
        <StepTimeline steps={analysis.constructionSteps} currentIndex={stepIndex} onSelect={setStepIndex} />
      ) : analysis ? (
        <ResultAside analysis={analysis} />
      ) : (
        <aside className="hidden border-l border-neutral-200 bg-white xl:block" />
      )}
    </main>
  );
};

const LR1FinalResult = ({ analysis }: { analysis: LR1Analysis }) => (
  <div className="grid gap-4">
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={17} className="text-ink-800" />
            <h2 className="text-base font-semibold text-ink-950">构造结果</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            增广产生式为 <span className="font-mono text-ink-950">{analysis.augmentedProduction.display}</span>，
            已构造完整 LR(1) 项目集族、识别活前缀的 DFA 和 LR(1) ACTION/GOTO 表。
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs text-ink-600">
          <Stat value={analysis.states.length} label="项目集" />
          <Stat value={analysis.transitions.length} label="DFA 边" />
          <Stat value={analysis.tableEntries.length} label="表项" />
          <Stat value={analysis.conflicts.length} label="冲突" />
        </div>
      </div>
    </section>

    <NumberedGrammar analysis={analysis} />
    <LR1DfaGraph title="识别活前缀的完整 DFA" analysis={analysis} states={analysis.states} transitions={analysis.transitions} />
    <ItemSetGrid states={analysis.states} />
    <LR1TableView analysis={analysis} entries={analysis.tableEntries} />
  </div>
);

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
    <div className="font-mono text-base font-semibold text-ink-950">{value}</div>
    <div>{label}</div>
  </div>
);

const ResultAside = ({ analysis }: { analysis: LR1Analysis }) => (
  <aside className="hidden border-l border-neutral-200 bg-white xl:block">
    <div className="border-b border-neutral-200 px-4 py-4">
      <h2 className="text-sm font-semibold text-ink-950">构造概览</h2>
      <p className="mt-1 text-xs text-ink-600">切换到逐步构造可查看 FIRST(βa) 传播、closure、goto 和填表过程</p>
    </div>
    <div className="space-y-3 p-4 text-sm text-ink-600">
      <AsideMetric label="增广产生式" value={analysis.augmentedProduction.display} />
      <AsideMetric label="项目集数量" value={String(analysis.states.length)} />
      <AsideMetric label="DFA 转移数量" value={String(analysis.transitions.length)} />
      <AsideMetric label="分析表项数量" value={String(analysis.tableEntries.length)} />
    </div>
  </aside>
);

const NumberedGrammar = ({ analysis }: { analysis: LR1Analysis }) => (
  <section className="rounded-md border border-neutral-200 bg-white">
    <div className="border-b border-neutral-200 px-4 py-3">
      <h3 className="text-sm font-semibold text-ink-950">拓展文法及产生式编号</h3>
    </div>
    <div className="grid gap-2 p-4 md:grid-cols-2">
      {analysis.grammar.productions.map((production) => (
        <div
          key={production.id}
          className="grid grid-cols-[52px_1fr] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
        >
          <span className="rounded border border-neutral-200 bg-white px-2 py-1 text-center font-mono text-xs text-ink-600">
            {productionLabel(production)}
          </span>
          <span className="font-mono text-sm text-ink-950">{production.display}</span>
        </div>
      ))}
    </div>
  </section>
);

const AsideMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
    <div className="text-xs text-ink-400">{label}</div>
    <div className="mt-1 font-mono text-ink-950">{value}</div>
  </div>
);

const LR1StepPanel = ({ step }: { step: LR1ConstructionStep }) => (
  <section className="rounded-md border border-neutral-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium uppercase tracking-normal text-ink-600">
            {step.type === 'goto' ? 'GOTO' : step.type === 'closure' ? 'CLOSURE' : step.type === 'table' ? 'TABLE' : 'DFA'}
          </span>
          <h2 className="text-base font-semibold text-ink-950">{step.title}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-600">{step.reason}</p>
      </div>
      {step.fromState !== undefined && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          <span className="font-mono text-ink-950">I{step.fromState}</span>
          {step.symbol && <span className="mx-2 text-ink-400">-- {step.symbol} --&gt;</span>}
          {step.toState !== undefined && <span className="font-mono text-ink-950">I{step.toState}</span>}
        </div>
      )}
    </div>

    {step.tableEntries.length > 0 ? (
      <div className="p-5">
        <TableEntryCards entries={step.tableEntries} />
      </div>
    ) : (
      <>
        <div className="grid gap-4 p-5 xl:grid-cols-3">
          <ItemList title="函数输入" items={step.sourceItems} />
          <ItemList title={step.type === 'closure' ? '初始核心项目' : 'GOTO 核心项目'} items={step.kernelItems} />
          <ItemList title="closure 结果" items={step.resultItems} highlightIds={step.additions.map((addition) => addition.addedItem.id)} />
        </div>

        <div className="border-t border-neutral-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-ink-950">closure 与 FIRST(βa) 传播</h3>
          {step.additions.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">没有新的 LR(1) 项目需要加入。</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {step.additions.map((addition, index) => (
                <div key={`${addition.addedItem.id}-${index}`} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                  <div className="font-mono text-ink-950">{addition.addedItem.display}</div>
                  <p className="mt-1 text-ink-600">{addition.reason}</p>
                  <div className="mt-2 font-mono text-xs text-ink-600">
                    β = {addition.beta.length ? addition.beta.join(' ') : 'ε'}，a = {addition.lookahead}，FIRST(βa) = {'{ '}
                    {addition.firstBetaLookahead.join(', ')}
                    {' }'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )}
  </section>
);

const ItemList = ({ title, items, highlightIds = [] }: { title: string; items: LR1ItemView[]; highlightIds?: string[] }) => (
  <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50">
    <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold text-ink-600">{title}</div>
    <div className="space-y-1 p-3">
      {items.length === 0 ? (
        <span className="font-mono text-xs text-ink-400">∅</span>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={classNames(
              'rounded border px-2 py-1 font-mono text-xs',
              highlightIds.includes(item.id) ? 'border-ink-950 bg-white text-ink-950' : 'border-neutral-200 bg-white text-ink-800',
            )}
          >
            {item.display}
          </div>
        ))
      )}
    </div>
  </div>
);

const LR1DfaGraph = ({
  title,
  analysis,
  states,
  transitions,
  currentStep,
}: {
  title: string;
  analysis: LR1Analysis;
  states: LR1Analysis['states'];
  transitions: LR1Analysis['transitions'];
  currentStep?: LR1ConstructionStep;
}) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = states.map((state) => ({
      id: state.id,
      position: { x: (state.index % 4) * 230, y: Math.floor(state.index / 4) * 180 },
      data: {
        label: (
          <div className={classNames(
            'min-w-[195px] rounded-md border bg-white px-3 py-2 text-left shadow-sm',
            currentStep && (currentStep.toState === state.index || currentStep.fromState === state.index) ? 'border-ink-950' : 'border-neutral-200',
          )}>
            <div className="mb-1 font-mono text-sm font-semibold text-ink-950">{state.id}</div>
            <div className="space-y-0.5">
              {state.items.slice(0, 4).map((item) => (
                <div key={item.id} className="truncate font-mono text-[10px] text-ink-600">{item.display}</div>
              ))}
              {state.items.length > 4 && <div className="font-mono text-[10px] text-ink-400">+{state.items.length - 4} 项</div>}
            </div>
          </div>
        ),
      },
      draggable: false,
      selectable: false,
    }));

    const edges: Edge[] = transitions.map((transition) => ({
      id: transition.id,
      source: `I${transition.from}`,
      target: `I${transition.to}`,
      label: transition.symbol,
      animated: currentStep?.fromState === transition.from && currentStep?.toState === transition.to,
      style: {
        stroke: currentStep?.fromState === transition.from && currentStep?.toState === transition.to ? '#111111' : '#d4d4d4',
        strokeWidth: currentStep?.fromState === transition.from && currentStep?.toState === transition.to ? 2 : 1,
      },
      labelStyle: { fill: '#111111', fontSize: 12, fontFamily: 'Consolas, monospace' },
    }));

    return { nodes, edges };
  }, [states, transitions, currentStep?.fromState, currentStep?.toState]);

  return (
    <section className="h-[390px] rounded-md border border-neutral-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
          <span className="text-xs text-ink-600">已显示 {states.length} / {analysis.states.length} 个项目集</span>
        </div>
        <div className="min-h-0 flex-1">
          <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false}>
            <Background color="#eeeeee" gap={18} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </section>
  );
};

const ItemSetGrid = ({ states, currentStep }: { states: LR1Analysis['states']; currentStep?: LR1ConstructionStep }) => (
  <section className="rounded-md border border-neutral-200 bg-white">
    <div className="border-b border-neutral-200 px-4 py-3">
      <h3 className="text-sm font-semibold text-ink-950">LR(1) 项目集族</h3>
    </div>
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {states.map((state) => (
        <article
          key={state.id}
          className={classNames(
            'rounded-md border bg-neutral-50 p-3',
            currentStep && (currentStep.toState === state.index || currentStep.fromState === state.index) ? 'border-ink-950' : 'border-neutral-200',
          )}
        >
          <h4 className="font-mono text-sm font-semibold text-ink-950">{state.id}</h4>
          <div className="mt-3 space-y-1">
            {state.items.map((item) => (
              <div key={item.id} className="rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-ink-800">{item.display}</div>
            ))}
          </div>
        </article>
      ))}
    </div>
  </section>
);

const LR1TableView = ({ analysis, entries }: { analysis: LR1Analysis; entries: LR1TableEntry[] }) => {
  const actionSymbols = [...analysis.grammar.terminals, EOF_SYMBOL];
  const gotoSymbols = analysis.originalGrammar.nonTerminals;
  const actionAt = (state: number, symbol: string) => entries.filter((entry) => entry.table === 'ACTION' && entry.state === state && entry.symbol === symbol);
  const gotoAt = (state: number, symbol: string) => entries.filter((entry) => entry.table === 'GOTO' && entry.state === state && entry.symbol === symbol);

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
        <Table2 size={16} />
        <h3 className="text-sm font-semibold text-ink-950">LR(1) ACTION / GOTO 分析表</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-50">
              <th className="border-b border-r border-neutral-200 px-3 py-3 text-ink-600" rowSpan={2}>状态</th>
              <th className="border-b border-r border-neutral-200 px-3 py-3 text-center text-ink-600" colSpan={actionSymbols.length}>ACTION</th>
              <th className="border-b border-neutral-200 px-3 py-3 text-center text-ink-600" colSpan={gotoSymbols.length}>GOTO</th>
            </tr>
            <tr className="bg-neutral-50">
              {actionSymbols.map((symbol) => <th key={symbol} className="border-b border-r border-neutral-200 px-3 py-2 font-mono text-ink-950">{symbol}</th>)}
              {gotoSymbols.map((symbol) => <th key={symbol} className="border-b border-r border-neutral-200 px-3 py-2 font-mono text-ink-950 last:border-r-0">{symbol}</th>)}
            </tr>
          </thead>
          <tbody>
            {analysis.states.map((state) => (
              <tr key={state.id}>
                <th className="border-b border-r border-neutral-200 bg-neutral-50 px-3 py-3 font-mono text-ink-950">{state.id}</th>
                {actionSymbols.map((symbol) => <TableCell key={`${state.id}-a-${symbol}`} entries={actionAt(state.index, symbol)} />)}
                {gotoSymbols.map((symbol) => <TableCell key={`${state.id}-g-${symbol}`} entries={gotoAt(state.index, symbol)} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const TableCell = ({ entries }: { entries: LR1TableEntry[] }) => (
  <td className={classNames('min-w-[88px] border-b border-r border-neutral-200 px-2 py-2 last:border-r-0', entries.length > 1 && 'bg-amber-50')}>
    {entries.length === 0 ? (
      <span className="font-mono text-xs text-ink-400">空</span>
    ) : (
      <div className="flex flex-col items-center gap-1">
        {entries.map((entry) => (
          <span key={entry.id} className="rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-ink-950" title={entry.reason}>
            {formatTableEntry(entry)}
          </span>
        ))}
      </div>
    )}
  </td>
);

const TableEntryCards = ({ entries }: { entries: LR1TableEntry[] }) => (
  <div className="grid gap-3 md:grid-cols-2">
    {entries.map((entry) => (
      <article key={entry.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-xs text-ink-400">填表步骤 #{entry.stepIndex}</div>
        <div className="mt-2 font-mono text-sm font-semibold text-ink-950">
          {entry.table}[{entry.state}, {entry.symbol}] = {formatTableEntry(entry)}
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-600">{entry.reason}</p>
        {entry.item && <div className="mt-3 rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-ink-800">{entry.item.display}</div>}
      </article>
    ))}
  </div>
);

const formatTableEntry = (entry: LR1TableEntry) => {
  if (entry.action === 'shift') {
    return `s${entry.targetState}`;
  }
  if (entry.action === 'goto') {
    return `${entry.targetState}`;
  }
  if (entry.action === 'accept') {
    return 'acc';
  }
  return `r${entry.production ? productionNumber(entry.production.id) : ''}`;
};

const productionNumber = (productionId: string) => productionId.replace(/^p/, '');

const productionLabel = (production: { id: string }) => `(${productionNumber(production.id)})`;

const StepTimeline = ({ steps, currentIndex, onSelect }: { steps: LR1ConstructionStep[]; currentIndex: number; onSelect: (index: number) => void }) => (
  <aside className="hidden min-h-0 flex-col border-l border-neutral-200 bg-white xl:flex">
    <div className="border-b border-neutral-200 px-4 py-4">
      <h2 className="text-sm font-semibold text-ink-950">构造步骤</h2>
      <p className="mt-1 text-xs text-ink-600">共 {steps.length} 步</p>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {steps.map((step, index) => (
        <button
          key={`${step.type}-${index}`}
          onClick={() => onSelect(index)}
          className={classNames(
            'mb-1 grid w-full grid-cols-[34px_1fr] gap-2 rounded-md border px-2 py-2 text-left transition-colors',
            index === currentIndex ? 'border-ink-950 bg-neutral-100' : 'border-transparent hover:bg-neutral-50',
          )}
        >
          <span className="font-mono text-xs text-ink-400">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold uppercase tracking-normal text-ink-600">
              {step.type === 'goto' ? 'GOTO' : step.type === 'closure' ? 'CLOSURE' : step.type === 'table' ? 'TABLE' : 'DFA'}
            </span>
            <span className="mt-1 block truncate text-xs text-ink-950">{step.title}</span>
            {step.symbol && <span className="mt-1 block truncate font-mono text-xs text-ink-600">I{step.fromState}, {step.symbol}</span>}
          </span>
        </button>
      ))}
    </div>
  </aside>
);
