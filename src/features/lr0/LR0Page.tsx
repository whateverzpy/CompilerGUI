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
  analyzeLR0Source,
  runLR0Parser,
  type LR0Analysis,
  type LR0ConstructionStep,
  type LR0ItemView,
  type LR0ParseStep,
  type LR0TableEntry,
} from '../../core/lr0';
import { classNames } from '../../lib/classNames';
import { sampleLR0Grammar, sampleLR0Input } from './sample';

interface LR0PageProps {
  onBack: () => void;
}

type LR0ViewMode = 'result' | 'steps';

interface LR0ParseResult {
  inputTokens: string[];
  parseSteps: LR0ParseStep[];
}

const visibleStates = (analysis: LR0Analysis, step: LR0ConstructionStep) =>
  analysis.states.slice(0, step.visibleStateCount);

const visibleTransitions = (analysis: LR0Analysis, step: LR0ConstructionStep) =>
  analysis.transitions.slice(0, step.visibleTransitionCount);

export const LR0Page = ({ onBack }: LR0PageProps) => {
  const initialResult = useMemo(() => analyzeLR0Source(sampleLR0Grammar), []);
  const [grammarText, setGrammarText] = useState(sampleLR0Grammar);
  const [analysis, setAnalysis] = useState(initialResult.analysis);
  const [errors, setErrors] = useState<GrammarError[]>(initialResult.errors);
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<LR0ParseResult | undefined>();
  const [stepIndex, setStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<LR0ViewMode>('result');
  const step = analysis?.constructionSteps[stepIndex];

  const selectViewMode = (mode: LR0ViewMode) => {
    setViewMode(mode);
    if (mode === 'steps') {
      setStepIndex(0);
    }
  };

  const runAnalysis = () => {
    const result = analyzeLR0Source(grammarText);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setParseResult(undefined);
    setStepIndex(0);
    if (result.analysis) {
      setViewMode('result');
    }
  };

  const resetSample = () => {
    const result = analyzeLR0Source(sampleLR0Grammar);
    setGrammarText(sampleLR0Grammar);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setInputText('');
    setParseResult(undefined);
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

  const runInputAnalysis = () => {
    const result = analyzeLR0Source(grammarText);
    setAnalysis(result.analysis);
    setErrors(result.errors);
    setStepIndex(0);
    if (result.analysis) {
      setViewMode('result');
      setParseResult(inputText.trim() ? runLR0Parser(result.analysis, inputText) : undefined);
    } else {
      setParseResult(undefined);
    }
  };

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden bg-[#f7f7f5] text-ink-950 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <section className="flex min-h-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-950">LR(0) 输入</h2>
            <p className="mt-1 text-xs text-ink-600">输入用于构造项目集族的文法</p>
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
              开始构造
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <textarea
            className="min-h-[280px] flex-1 resize-none rounded-md border border-neutral-300 bg-neutral-50 p-4 font-mono text-sm leading-6 text-ink-950 outline-none focus:border-ink-950 focus:bg-white focus:shadow-focus"
            spellCheck={false}
            value={grammarText}
            onChange={(event) => setGrammarText(event.target.value)}
          />

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-600">输入串</span>
            <input
              className="h-10 rounded-md border border-neutral-300 bg-neutral-50 px-3 font-mono text-sm text-ink-950 outline-none focus:border-ink-950 focus:bg-white focus:shadow-focus"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={`输入后点击分析：${sampleLR0Input}，可省略结尾 ${EOF_SYMBOL}`}
            />
          </label>

          <Button icon={<Wand2 size={15} />} onClick={runInputAnalysis} disabled={!inputText.trim()}>
            分析输入串
          </Button>

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
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button icon={<ArrowLeft size={15} />} variant="ghost" onClick={onBack} className="mb-3 px-0">
              返回主页
            </Button>
            <h1 className="text-2xl font-semibold tracking-normal text-ink-950">
              LR(0) 项目集族构造
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              构造 LR(0) 规范项目集族，并展示识别活前缀的 DFA。
            </p>
          </div>
          {analysis && step && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-neutral-200 bg-white p-1">
                <Button
                  icon={<ListChecks size={15} />}
                  variant="ghost"
                  onClick={() => selectViewMode('result')}
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
                  onClick={() => selectViewMode('steps')}
                  className={classNames(
                    'h-8 border-0 px-3',
                    viewMode === 'steps' && 'bg-neutral-100 text-ink-950',
                  )}
                >
                  逐步构造
                </Button>
              </div>

              {viewMode === 'steps' && (
                <div className="flex items-center gap-2">
                  <Button
                    icon={<ChevronLeft size={16} />}
                    onClick={previousStep}
                    disabled={stepIndex === 0}
                    aria-label="上一步"
                    title="上一步"
                  />
                  <span className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-ink-600">
                    第 {stepIndex + 1} 步 / 共 {analysis.constructionSteps.length} 步
                  </span>
                  <Button
                    icon={<ChevronRight size={16} />}
                    onClick={nextStep}
                    disabled={stepIndex === analysis.constructionSteps.length - 1}
                    aria-label="下一步"
                    title="下一步"
                  />
                </div>
              )}
            </div>
          )}
        </header>

        {analysis && step ? (
          <div className="grid gap-4">
            {viewMode === 'result' ? (
              <LR0FinalResult analysis={analysis} parseResult={parseResult} />
            ) : (
              <>
                <ConstructionStepPanel step={step} />
                <LR0DfaGraph
                  title="DFA 逐步构造"
                  analysis={analysis}
                  states={visibleStates(analysis, step)}
                  transitions={visibleTransitions(analysis, step)}
                  currentStep={step}
                />
                <ItemSetGrid states={visibleStates(analysis, step)} currentStep={step} />
              </>
            )}
          </div>
        ) : (
          <section className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-ink-600">
            当前文法无法构造 LR(0) 项目集族，请检查左侧产生式。
          </section>
        )}
      </div>

      {analysis && step && viewMode === 'steps' ? (
        <StepTimeline
          steps={analysis.constructionSteps}
          currentIndex={stepIndex}
          onSelect={setStepIndex}
        />
      ) : analysis ? (
        <ResultAside analysis={analysis} />
      ) : (
        <aside className="hidden border-l border-neutral-200 bg-white xl:block" />
      )}
    </main>
  );
};

const LR0FinalResult = ({
  analysis,
  parseResult,
}: {
  analysis: LR0Analysis;
  parseResult?: LR0ParseResult;
}) => (
  <div className="grid gap-4">
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={17} className="text-ink-800" />
            <h2 className="text-base font-semibold text-ink-950">构造结果</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            增广产生式为{' '}
            <span className="font-mono text-ink-950">{analysis.augmentedProduction.display}</span>，
            已构造完整 LR(0) 规范项目集族和识别活前缀的 DFA。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-ink-600">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="font-mono text-base font-semibold text-ink-950">{analysis.states.length}</div>
            <div>项目集</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="font-mono text-base font-semibold text-ink-950">{analysis.transitions.length}</div>
            <div>DFA 边</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="font-mono text-base font-semibold text-ink-950">{analysis.constructionSteps.length}</div>
            <div>构造步</div>
          </div>
        </div>
      </div>
    </section>

    <LR0DfaGraph
      title="完整 DFA"
      analysis={analysis}
      states={analysis.states}
      transitions={analysis.transitions}
    />
    <LR0TableView analysis={analysis} />
    {analysis.conflicts.length > 0 && <ConflictNotice conflicts={analysis.conflicts} />}
    {parseResult && <LRParseProcess parseResult={parseResult} />}
    <ItemSetGrid states={analysis.states} />
  </div>
);

const LR0TableView = ({ analysis }: { analysis: LR0Analysis }) => {
  const actionSymbols = [...analysis.grammar.terminals, EOF_SYMBOL];
  const gotoSymbols = analysis.originalGrammar.nonTerminals;
  const actionAt = (state: number, symbol: string) => analysis.actionTable[state][symbol];
  const gotoAt = (state: number, symbol: string) => analysis.gotoTable[state][symbol];

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
        <Table2 size={16} />
        <h3 className="text-sm font-semibold text-ink-950">LR(0) ACTION / GOTO 分析表</h3>
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

const TableCell = ({ entries }: { entries: LR0TableEntry[] }) => (
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

const ConflictNotice = ({ conflicts }: { conflicts: LR0Analysis['conflicts'] }) => (
  <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    LR(0) 分析表存在 {conflicts.length} 处冲突，输入串分析会在冲突单元停止。
  </section>
);

const LRParseProcess = ({ parseResult }: { parseResult: LR0ParseResult }) => (
  <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-ink-950">输入串语法分析过程</h2>
        <p className="mt-1 text-xs text-ink-600">输入：<span className="font-mono">{parseResult.inputTokens.join(' ')}</span></p>
      </div>
      <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-ink-600">{parseResult.parseSteps.length} 步</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-50">
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">步</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">状态栈</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">符号栈</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">剩余输入</th>
            <th className="border-b border-r border-neutral-200 px-3 py-3 font-semibold text-ink-600">动作</th>
            <th className="border-b border-neutral-200 px-3 py-3 font-semibold text-ink-600">说明</th>
          </tr>
        </thead>
        <tbody>
          {parseResult.parseSteps.map((step) => (
            <tr key={step.index} className={step.action === 'error' ? 'bg-red-50' : undefined}>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-400">{step.index}</td>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-950">{step.stateStack.join(' ')}</td>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-950">{step.symbolStack.join(' ')}</td>
              <td className="border-b border-r border-neutral-200 px-3 py-3 font-mono text-xs text-ink-950">{step.input.join(' ')}</td>
              <td className="border-b border-r border-neutral-200 px-3 py-3"><span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-ink-600">{actionLabel(step.action)}</span></td>
              <td className="border-b border-neutral-200 px-3 py-3 text-ink-600">{step.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const formatTableEntry = (entry: LR0TableEntry) => {
  if (entry.action === 'shift') {
    return `s${entry.targetState}`;
  }
  if (entry.action === 'goto') {
    return `${entry.targetState}`;
  }
  if (entry.action === 'accept') {
    return 'acc';
  }
  return `r${entry.production?.id.replace(/^p/, '') ?? ''}`;
};

const actionLabel = (action: LR0ParseStep['action']) => {
  if (action === 'shift') {
    return '移进';
  }
  if (action === 'reduce') {
    return '归约';
  }
  if (action === 'accept') {
    return '接受';
  }
  return '错误';
};

const ResultAside = ({ analysis }: { analysis: LR0Analysis }) => (
  <aside className="hidden border-l border-neutral-200 bg-white xl:block">
    <div className="border-b border-neutral-200 px-4 py-4">
      <h2 className="text-sm font-semibold text-ink-950">构造概览</h2>
      <p className="mt-1 text-xs text-ink-600">切换到逐步构造可查看 closure 与 goto 的每次展开</p>
    </div>
    <div className="space-y-3 p-4 text-sm text-ink-600">
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs text-ink-400">增广产生式</div>
        <div className="mt-1 font-mono text-ink-950">{analysis.augmentedProduction.display}</div>
      </div>
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs text-ink-400">项目集数量</div>
        <div className="mt-1 font-mono text-ink-950">{analysis.states.length}</div>
      </div>
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs text-ink-400">DFA 转移数量</div>
        <div className="mt-1 font-mono text-ink-950">{analysis.transitions.length}</div>
      </div>
    </div>
  </aside>
);

const ConstructionStepPanel = ({ step }: { step: LR0ConstructionStep }) => (
  <section className="rounded-md border border-neutral-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium uppercase tracking-normal text-ink-600">
            {step.type === 'goto' ? 'GOTO' : step.type === 'closure' ? 'CLOSURE' : 'DFA'}
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

    <div className="grid gap-4 p-5 xl:grid-cols-3">
      <ItemList title="函数输入" items={step.sourceItems} />
      <ItemList title={step.type === 'closure' ? '初始核心项目' : 'GOTO 核心项目'} items={step.kernelItems} />
      <ItemList title="closure 结果" items={step.resultItems} highlightIds={step.additions.map((addition) => addition.addedItem.id)} />
    </div>

    <div className="border-t border-neutral-200 px-5 py-4">
      <h3 className="text-sm font-semibold text-ink-950">closure 函数展开</h3>
      {step.additions.length === 0 ? (
        <p className="mt-2 text-sm text-ink-600">没有新的非终结符初始项目需要加入。</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {step.additions.map((addition, index) => (
            <div
              key={`${addition.addedItem.id}-${index}`}
              className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
            >
              <div className="font-mono text-ink-950">{addition.addedItem.display}</div>
              <p className="mt-1 text-ink-600">{addition.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

const ItemList = ({
  title,
  items,
  highlightIds = [],
}: {
  title: string;
  items: LR0ItemView[];
  highlightIds?: string[];
}) => (
  <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50">
    <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold text-ink-600">
      {title}
    </div>
    <div className="space-y-1 p-3">
      {items.length === 0 ? (
        <span className="font-mono text-xs text-ink-400">∅</span>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={classNames(
              'rounded border px-2 py-1 font-mono text-xs',
              highlightIds.includes(item.id)
                ? 'border-ink-950 bg-white text-ink-950'
                : 'border-neutral-200 bg-white text-ink-800',
            )}
          >
            {item.display}
          </div>
        ))
      )}
    </div>
  </div>
);

const LR0DfaGraph = ({
  title,
  analysis,
  states,
  transitions,
  currentStep,
}: {
  title: string;
  analysis: LR0Analysis;
  states: LR0Analysis['states'];
  transitions: LR0Analysis['transitions'];
  currentStep?: LR0ConstructionStep;
}) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = states.map((state) => ({
      id: state.id,
      position: {
        x: (state.index % 4) * 230,
        y: Math.floor(state.index / 4) * 170,
      },
      data: {
        label: (
          <div
            className={classNames(
              'min-w-[190px] rounded-md border bg-white px-3 py-2 text-left shadow-sm',
              currentStep && (currentStep.toState === state.index || currentStep.fromState === state.index)
                ? 'border-ink-950'
                : 'border-neutral-200',
            )}
          >
            <div className="mb-1 font-mono text-sm font-semibold text-ink-950">{state.id}</div>
            <div className="space-y-0.5">
              {state.items.slice(0, 4).map((item) => (
                <div key={item.id} className="truncate font-mono text-[10px] text-ink-600">
                  {item.display}
                </div>
              ))}
              {state.items.length > 4 && (
                <div className="font-mono text-[10px] text-ink-400">+{state.items.length - 4} 项</div>
              )}
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
        stroke:
          currentStep?.fromState === transition.from && currentStep?.toState === transition.to
            ? '#111111'
            : '#d4d4d4',
        strokeWidth:
          currentStep?.fromState === transition.from && currentStep?.toState === transition.to ? 2 : 1,
      },
      labelStyle: {
        fill: '#111111',
        fontSize: 12,
        fontFamily: 'Consolas, monospace',
      },
    }));

    return { nodes, edges };
  }, [states, transitions, currentStep?.fromState, currentStep?.toState]);

  return (
    <section className="h-[380px] rounded-md border border-neutral-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
          <span className="text-xs text-ink-600">
            已显示 {states.length} / {analysis.states.length} 个项目集
          </span>
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

const ItemSetGrid = ({
  states,
  currentStep,
}: {
  states: LR0Analysis['states'];
  currentStep?: LR0ConstructionStep;
}) => (
  <section className="rounded-md border border-neutral-200 bg-white">
    <div className="border-b border-neutral-200 px-4 py-3">
      <h3 className="text-sm font-semibold text-ink-950">项目集族</h3>
    </div>
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {states.map((state) => (
        <article
          key={state.id}
          className={classNames(
            'rounded-md border bg-neutral-50 p-3',
            currentStep && (currentStep.toState === state.index || currentStep.fromState === state.index)
              ? 'border-ink-950'
              : 'border-neutral-200',
          )}
        >
          <h4 className="font-mono text-sm font-semibold text-ink-950">{state.id}</h4>
          <div className="mt-3 space-y-1">
            {state.items.map((item) => (
              <div key={item.id} className="rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-ink-800">
                {item.display}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  </section>
);

const StepTimeline = ({
  steps,
  currentIndex,
  onSelect,
}: {
  steps: LR0ConstructionStep[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) => (
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
            index === currentIndex
              ? 'border-ink-950 bg-neutral-100'
              : 'border-transparent hover:bg-neutral-50',
          )}
        >
          <span className="font-mono text-xs text-ink-400">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold uppercase tracking-normal text-ink-600">
              {step.type === 'goto' ? 'GOTO' : step.type === 'closure' ? 'CLOSURE' : 'DFA'}
            </span>
            <span className="mt-1 block truncate text-xs text-ink-950">{step.title}</span>
            {step.symbol && (
              <span className="mt-1 block truncate font-mono text-xs text-ink-600">
                I{step.fromState}, {step.symbol}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  </aside>
);
