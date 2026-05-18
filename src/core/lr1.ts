import {
  EOF_SYMBOL,
  EPSILON,
  analyzeGrammar,
  getFirstOfSequence,
  parseGrammar,
  type Grammar,
  type GrammarAnalysis,
  type GrammarError,
  type Production,
} from './grammar';
import { formatLR0Item } from './lr0';

export interface LR1Item {
  productionId: string;
  dot: number;
  lookahead: string;
}

export interface LR1ItemView extends LR1Item {
  id: string;
  production: Production;
  nextSymbol?: string;
  beta: string[];
  display: string;
}

export interface LR1ClosureAddition {
  fromItem: LR1ItemView;
  beta: string[];
  lookahead: string;
  firstBetaLookahead: string[];
  addedItem: LR1ItemView;
  reason: string;
}

export interface LR1ItemSet {
  id: string;
  index: number;
  items: LR1ItemView[];
  itemKey: string;
}

export interface LR1Transition {
  id: string;
  from: number;
  to: number;
  symbol: string;
}

export interface LR1ConstructionStep {
  index: number;
  type: 'closure' | 'goto' | 'add-state' | 'reuse-state' | 'table';
  title: string;
  reason: string;
  fromState?: number;
  toState?: number;
  symbol?: string;
  sourceItems: LR1ItemView[];
  kernelItems: LR1ItemView[];
  resultItems: LR1ItemView[];
  additions: LR1ClosureAddition[];
  tableEntries: LR1TableEntry[];
  visibleStateCount: number;
  visibleTransitionCount: number;
  visibleTableEntryCount: number;
}

export type LR1ActionKind = 'shift' | 'reduce' | 'accept';

export interface LR1TableEntry {
  id: string;
  stepIndex: number;
  table: 'ACTION' | 'GOTO';
  state: number;
  symbol: string;
  action: LR1ActionKind | 'goto';
  targetState?: number;
  production?: Production;
  item?: LR1ItemView;
  reason: string;
}

export interface LR1Conflict {
  table: 'ACTION' | 'GOTO';
  state: number;
  symbol: string;
  entries: LR1TableEntry[];
}

export interface LR1Analysis {
  originalGrammar: Grammar;
  grammar: Grammar;
  grammarAnalysis: GrammarAnalysis;
  augmentedProduction: Production;
  states: LR1ItemSet[];
  transitions: LR1Transition[];
  constructionSteps: LR1ConstructionStep[];
  tableEntries: LR1TableEntry[];
  actionTable: Record<number, Record<string, LR1TableEntry[]>>;
  gotoTable: Record<number, Record<string, LR1TableEntry[]>>;
  conflicts: LR1Conflict[];
}

export interface LR1Result {
  analysis?: LR1Analysis;
  errors: GrammarError[];
}

type ItemMap = Map<string, LR1Item>;

const productionDisplay = (lhs: string, rhs: string[]) =>
  `${lhs} -> ${rhs.length === 0 ? EPSILON : rhs.join(' ')}`;

const productionNumber = (production: Production) =>
  Number(production.id.replace(/^p/, ''));

const createAugmentedStart = (grammar: Grammar) => {
  let candidate = `${grammar.startSymbol}'`;
  while (grammar.nonTerminals.includes(candidate)) {
    candidate += "'";
  }
  return candidate;
};

const augmentGrammar = (grammar: Grammar) => {
  const augmentedStart = createAugmentedStart(grammar);
  const augmentedProduction: Production = {
    id: 'p0',
    lhs: augmentedStart,
    rhs: [grammar.startSymbol],
    display: productionDisplay(augmentedStart, [grammar.startSymbol]),
  };

  return {
    augmentedProduction,
    grammar: {
      startSymbol: augmentedStart,
      nonTerminals: [augmentedStart, ...grammar.nonTerminals],
      terminals: grammar.terminals,
      productions: [augmentedProduction, ...grammar.productions],
    },
  };
};

const itemId = (item: LR1Item) => `${item.productionId}@${item.dot},${item.lookahead}`;

const productionRank = (grammar: Grammar) =>
  new Map(grammar.productions.map((production, index) => [production.id, index]));

const sortItems = (items: Iterable<LR1Item>, grammar: Grammar) => {
  const rank = productionRank(grammar);
  return [...items].sort((a, b) => {
    const productionDelta = (rank.get(a.productionId) ?? 0) - (rank.get(b.productionId) ?? 0);
    if (productionDelta !== 0) {
      return productionDelta;
    }
    if (a.dot !== b.dot) {
      return a.dot - b.dot;
    }
    return a.lookahead.localeCompare(b.lookahead);
  });
};

const getProduction = (grammar: Grammar, productionId: string) => {
  const production = grammar.productions.find((candidate) => candidate.id === productionId);
  if (!production) {
    throw new Error(`Missing production ${productionId}`);
  }
  return production;
};

const toItemView = (item: LR1Item, grammar: Grammar): LR1ItemView => {
  const production = getProduction(grammar, item.productionId);
  const nextSymbol = production.rhs[item.dot];
  return {
    ...item,
    id: itemId(item),
    production,
    nextSymbol,
    beta: production.rhs.slice(item.dot + 1),
    display: `[${formatLR0Item(production, item.dot)}, ${item.lookahead}]`,
  };
};

const toItemViews = (items: Iterable<LR1Item>, grammar: Grammar) =>
  sortItems(items, grammar).map((item) => toItemView(item, grammar));

const itemSetKey = (items: Iterable<LR1Item>, grammar: Grammar) =>
  sortItems(items, grammar)
    .map(itemId)
    .join('|');

const addItem = (items: ItemMap, item: LR1Item) => {
  const key = itemId(item);
  if (items.has(key)) {
    return false;
  }
  items.set(key, item);
  return true;
};

export const closureLR1Items = (
  seedItems: LR1Item[],
  grammar: Grammar,
  grammarAnalysis: GrammarAnalysis,
) => {
  const nonTerminals = new Set(grammar.nonTerminals);
  const items: ItemMap = new Map();
  const additions: LR1ClosureAddition[] = [];
  const queue: LR1Item[] = [];

  for (const item of seedItems) {
    if (addItem(items, item)) {
      queue.push(item);
    }
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    const itemView = toItemView(item, grammar);
    const nextSymbol = itemView.nextSymbol;

    if (!nextSymbol || !nonTerminals.has(nextSymbol)) {
      continue;
    }

    const betaLookahead = [...itemView.beta, item.lookahead];
    const firstResult = getFirstOfSequence(betaLookahead, grammar, grammarAnalysis.firstSets);
    const lookaheads = firstResult.symbols.filter((symbol) => symbol !== EPSILON);

    for (const production of grammar.productions.filter((candidate) => candidate.lhs === nextSymbol)) {
      for (const lookahead of lookaheads) {
        const candidate = { productionId: production.id, dot: 0, lookahead };
        if (addItem(items, candidate)) {
          queue.push(candidate);
          const addedItem = toItemView(candidate, grammar);
          additions.push({
            fromItem: itemView,
            beta: itemView.beta,
            lookahead: item.lookahead,
            firstBetaLookahead: lookaheads,
            addedItem,
            reason: `点号后为 ${nextSymbol}，计算 FIRST(${[...itemView.beta, item.lookahead].join(' ')}) = { ${lookaheads.join(', ')} }，因此加入 ${addedItem.display}。`,
          });
        }
      }
    }
  }

  const resultItems = [...items.values()];

  return {
    items: resultItems,
    itemViews: toItemViews(resultItems, grammar),
    additions,
    itemKey: itemSetKey(resultItems, grammar),
  };
};

export const gotoLR1Items = (
  items: LR1Item[],
  symbol: string,
  grammar: Grammar,
  grammarAnalysis: GrammarAnalysis,
) => {
  const kernelItems = items.flatMap((item) => {
    const production = getProduction(grammar, item.productionId);
    return production.rhs[item.dot] === symbol
      ? [{ productionId: item.productionId, dot: item.dot + 1, lookahead: item.lookahead }]
      : [];
  });

  const closure = closureLR1Items(kernelItems, grammar, grammarAnalysis);

  return {
    kernelItems,
    kernelViews: toItemViews(kernelItems, grammar),
    ...closure,
  };
};

const nextSymbolsOf = (state: LR1ItemSet, grammar: Grammar) => {
  const symbols: string[] = [];

  for (const item of state.items) {
    const production = getProduction(grammar, item.productionId);
    const symbol = production.rhs[item.dot];
    if (symbol && !symbols.includes(symbol)) {
      symbols.push(symbol);
    }
  }

  const order = [...grammar.nonTerminals, ...grammar.terminals];
  return symbols.sort((a, b) => order.indexOf(a) - order.indexOf(b));
};

const makeState = (index: number, items: LR1Item[], grammar: Grammar): LR1ItemSet => ({
  id: `I${index}`,
  index,
  items: toItemViews(items, grammar),
  itemKey: itemSetKey(items, grammar),
});

const pushStep = (
  steps: LR1ConstructionStep[],
  step: Omit<LR1ConstructionStep, 'index'>,
) => {
  steps.push({
    ...step,
    index: steps.length + 1,
  });
};

const createEmptyActionTable = (stateCount: number, terminals: string[]) =>
  Object.fromEntries(
    Array.from({ length: stateCount }, (_, index) => [
      index,
      Object.fromEntries([...terminals, EOF_SYMBOL].map((terminal) => [terminal, [] as LR1TableEntry[]])),
    ]),
  ) as Record<number, Record<string, LR1TableEntry[]>>;

const createEmptyGotoTable = (stateCount: number, nonTerminals: string[]) =>
  Object.fromEntries(
    Array.from({ length: stateCount }, (_, index) => [
      index,
      Object.fromEntries(nonTerminals.map((nonTerminal) => [nonTerminal, [] as LR1TableEntry[]])),
    ]),
  ) as Record<number, Record<string, LR1TableEntry[]>>;

const addTableEntry = (
  tableEntries: LR1TableEntry[],
  constructionSteps: LR1ConstructionStep[],
  state: number,
  entry: Omit<LR1TableEntry, 'id' | 'stepIndex'>,
  visibleStateCount: number,
  visibleTransitionCount: number,
) => {
  const stepIndex = constructionSteps.length + 1;
  const tableEntry: LR1TableEntry = {
    ...entry,
    id: `lr1-table-${tableEntries.length + 1}`,
    stepIndex,
  };
  tableEntries.push(tableEntry);

  pushStep(constructionSteps, {
    type: 'table',
    title:
      entry.table === 'ACTION'
        ? `填入 ACTION[${state}, ${entry.symbol}]`
        : `填入 GOTO[${state}, ${entry.symbol}]`,
    reason: entry.reason,
    fromState: state,
    toState: entry.targetState,
    symbol: entry.symbol,
    sourceItems: entry.item ? [entry.item] : [],
    kernelItems: [],
    resultItems: entry.item ? [entry.item] : [],
    additions: [],
    tableEntries: [tableEntry],
    visibleStateCount,
    visibleTransitionCount,
    visibleTableEntryCount: tableEntries.length,
  });
};

const buildLR1Table = (
  analysis: Omit<LR1Analysis, 'tableEntries' | 'actionTable' | 'gotoTable' | 'conflicts'>,
) => {
  const terminals = analysis.grammar.terminals;
  const nonTerminals = analysis.originalGrammar.nonTerminals;
  const actionTable = createEmptyActionTable(analysis.states.length, terminals);
  const gotoTable = createEmptyGotoTable(analysis.states.length, nonTerminals);
  const tableEntries: LR1TableEntry[] = [];
  const constructionSteps = analysis.constructionSteps;

  for (const transition of analysis.transitions) {
    if (terminals.includes(transition.symbol)) {
      addTableEntry(
        tableEntries,
        constructionSteps,
        transition.from,
        {
          table: 'ACTION',
          state: transition.from,
          symbol: transition.symbol,
          action: 'shift',
          targetState: transition.to,
          reason: `DFA 中存在 I${transition.from} -- ${transition.symbol} --> I${transition.to}，因此 ACTION[${transition.from}, ${transition.symbol}] = s${transition.to}。`,
        },
        analysis.states.length,
        analysis.transitions.length,
      );
    } else if (nonTerminals.includes(transition.symbol)) {
      addTableEntry(
        tableEntries,
        constructionSteps,
        transition.from,
        {
          table: 'GOTO',
          state: transition.from,
          symbol: transition.symbol,
          action: 'goto',
          targetState: transition.to,
          reason: `DFA 中存在 I${transition.from} -- ${transition.symbol} --> I${transition.to}，因此 GOTO[${transition.from}, ${transition.symbol}] = ${transition.to}。`,
        },
        analysis.states.length,
        analysis.transitions.length,
      );
    }
  }

  for (const state of analysis.states) {
    for (const item of state.items) {
      const completed = item.dot === item.production.rhs.length;
      if (!completed) {
        continue;
      }

      if (item.production.id === analysis.augmentedProduction.id && item.lookahead === EOF_SYMBOL) {
        addTableEntry(
          tableEntries,
          constructionSteps,
          state.index,
          {
            table: 'ACTION',
            state: state.index,
            symbol: EOF_SYMBOL,
            action: 'accept',
            item,
            reason: `项目 ${item.display} 表示增广开始产生式已经识别完成，因此 ACTION[${state.index}, ${EOF_SYMBOL}] = acc。`,
          },
          analysis.states.length,
          analysis.transitions.length,
        );
      } else {
        addTableEntry(
          tableEntries,
          constructionSteps,
          state.index,
          {
            table: 'ACTION',
            state: state.index,
            symbol: item.lookahead,
            action: 'reduce',
            production: item.production,
            item,
            reason: `项目 ${item.display} 已完成，展望符为 ${item.lookahead}，因此 ACTION[${state.index}, ${item.lookahead}] = r${productionNumber(item.production)}。`,
          },
          analysis.states.length,
          analysis.transitions.length,
        );
      }
    }
  }

  for (const entry of tableEntries) {
    if (entry.table === 'ACTION') {
      actionTable[entry.state][entry.symbol].push(entry);
    } else {
      gotoTable[entry.state][entry.symbol].push(entry);
    }
  }

  const actionConflicts = Object.entries(actionTable).flatMap(([state, row]) =>
    Object.entries(row).flatMap(([symbol, entries]) =>
      entries.length > 1
        ? [{ table: 'ACTION' as const, state: Number(state), symbol, entries }]
        : [],
    ),
  );
  const gotoConflicts = Object.entries(gotoTable).flatMap(([state, row]) =>
    Object.entries(row).flatMap(([symbol, entries]) =>
      entries.length > 1 ? [{ table: 'GOTO' as const, state: Number(state), symbol, entries }] : [],
    ),
  );

  return {
    tableEntries,
    actionTable,
    gotoTable,
    conflicts: [...actionConflicts, ...gotoConflicts],
  };
};

export const buildLR1CanonicalCollection = (originalGrammar: Grammar): LR1Analysis => {
  const augmented = augmentGrammar(originalGrammar);
  const grammar = augmented.grammar;
  const grammarAnalysis = analyzeGrammar(grammar);
  const initialKernel = [{ productionId: augmented.augmentedProduction.id, dot: 0, lookahead: EOF_SYMBOL }];
  const initialClosure = closureLR1Items(initialKernel, grammar, grammarAnalysis);
  const states = [makeState(0, initialClosure.items, grammar)];
  const transitions: LR1Transition[] = [];
  const stateByKey = new Map([[states[0].itemKey, 0]]);
  const constructionSteps: LR1ConstructionStep[] = [];
  const queue = [0];

  pushStep(constructionSteps, {
    type: 'closure',
    title: '构造初始 LR(1) 项目集 I0',
    reason: `从增广产生式 ${augmented.augmentedProduction.display} 的初始项目和展望符 ${EOF_SYMBOL} 开始，计算 closure。`,
    sourceItems: toItemViews(initialKernel, grammar),
    kernelItems: toItemViews(initialKernel, grammar),
    resultItems: states[0].items,
    additions: initialClosure.additions,
    tableEntries: [],
    visibleStateCount: states.length,
    visibleTransitionCount: transitions.length,
    visibleTableEntryCount: 0,
  });

  while (queue.length > 0) {
    const stateIndex = queue.shift()!;
    const state = states[stateIndex];

    for (const symbol of nextSymbolsOf(state, grammar)) {
      const gotoResult = gotoLR1Items(state.items, symbol, grammar, grammarAnalysis);
      if (gotoResult.items.length === 0) {
        continue;
      }

      pushStep(constructionSteps, {
        type: 'goto',
        title: `计算 GOTO(I${stateIndex}, ${symbol})`,
        reason: `将 I${stateIndex} 中点号后为 ${symbol} 的 LR(1) 项目前移点号，并对得到的核心项目计算 closure。`,
        fromState: stateIndex,
        symbol,
        sourceItems: state.items,
        kernelItems: gotoResult.kernelViews,
        resultItems: gotoResult.itemViews,
        additions: gotoResult.additions,
        tableEntries: [],
        visibleStateCount: states.length,
        visibleTransitionCount: transitions.length,
        visibleTableEntryCount: 0,
      });

      const existingState = stateByKey.get(gotoResult.itemKey);
      let targetState = existingState;

      if (targetState === undefined) {
        targetState = states.length;
        const newState = makeState(targetState, gotoResult.items, grammar);
        states.push(newState);
        stateByKey.set(newState.itemKey, targetState);
        queue.push(targetState);

        pushStep(constructionSteps, {
          type: 'add-state',
          title: `新增 LR(1) 项目集 I${targetState}`,
          reason: `GOTO(I${stateIndex}, ${symbol}) 得到新的 LR(1) 项目集，因此记为 I${targetState}。`,
          fromState: stateIndex,
          toState: targetState,
          symbol,
          sourceItems: state.items,
          kernelItems: gotoResult.kernelViews,
          resultItems: newState.items,
          additions: gotoResult.additions,
          tableEntries: [],
          visibleStateCount: states.length,
          visibleTransitionCount: transitions.length,
          visibleTableEntryCount: 0,
        });
      } else {
        pushStep(constructionSteps, {
          type: 'reuse-state',
          title: `复用 LR(1) 项目集 I${targetState}`,
          reason: `GOTO(I${stateIndex}, ${symbol}) 的项目集已经存在，直接复用 I${targetState}。`,
          fromState: stateIndex,
          toState: targetState,
          symbol,
          sourceItems: state.items,
          kernelItems: gotoResult.kernelViews,
          resultItems: states[targetState].items,
          additions: gotoResult.additions,
          tableEntries: [],
          visibleStateCount: states.length,
          visibleTransitionCount: transitions.length,
          visibleTableEntryCount: 0,
        });
      }

      const transition: LR1Transition = {
        id: `I${stateIndex}-${symbol}-I${targetState}`,
        from: stateIndex,
        to: targetState,
        symbol,
      };
      if (!transitions.some((candidate) => candidate.id === transition.id)) {
        transitions.push(transition);
      }

      const lastStep = constructionSteps[constructionSteps.length - 1];
      lastStep.visibleTransitionCount = transitions.length;
    }
  }

  for (const step of constructionSteps) {
    step.visibleTableEntryCount = 0;
  }

  const partialAnalysis = {
    originalGrammar,
    grammar,
    grammarAnalysis,
    augmentedProduction: augmented.augmentedProduction,
    states,
    transitions,
    constructionSteps,
  };
  const table = buildLR1Table(partialAnalysis);

  return {
    ...partialAnalysis,
    ...table,
  };
};

export const analyzeLR1Source = (source: string): LR1Result => {
  const parsed = parseGrammar(source);
  if (!parsed.grammar) {
    return { errors: parsed.errors };
  }

  return {
    errors: [],
    analysis: buildLR1CanonicalCollection(parsed.grammar),
  };
};
