import { EOF_SYMBOL, EPSILON, parseGrammar, type Grammar, type GrammarError, type Production } from './grammar';

export interface LR0Item {
  productionId: string;
  dot: number;
}

export interface LR0ItemView extends LR0Item {
  id: string;
  production: Production;
  nextSymbol?: string;
  display: string;
}

export interface LR0ClosureAddition {
  fromItem: LR0ItemView;
  addedItem: LR0ItemView;
  reason: string;
}

export interface LR0ItemSet {
  id: string;
  index: number;
  items: LR0ItemView[];
  itemKey: string;
}

export interface LR0Transition {
  id: string;
  from: number;
  to: number;
  symbol: string;
}

export interface LR0ConstructionStep {
  index: number;
  type: 'closure' | 'goto' | 'add-state' | 'reuse-state';
  title: string;
  reason: string;
  fromState?: number;
  toState?: number;
  symbol?: string;
  sourceItems: LR0ItemView[];
  kernelItems: LR0ItemView[];
  resultItems: LR0ItemView[];
  additions: LR0ClosureAddition[];
  visibleStateCount: number;
  visibleTransitionCount: number;
}

export type LR0ActionKind = 'shift' | 'reduce' | 'accept';

export interface LR0TableEntry {
  id: string;
  table: 'ACTION' | 'GOTO';
  state: number;
  symbol: string;
  action: LR0ActionKind | 'goto';
  targetState?: number;
  production?: Production;
  item?: LR0ItemView;
  reason: string;
}

export interface LR0Conflict {
  table: 'ACTION' | 'GOTO';
  state: number;
  symbol: string;
  entries: LR0TableEntry[];
}

export interface LR0ParseStep {
  index: number;
  stateStack: number[];
  symbolStack: string[];
  input: string[];
  action: LR0ActionKind | 'goto' | 'error';
  tableEntry?: LR0TableEntry;
  production?: Production;
  message: string;
}

export interface LR0Analysis {
  originalGrammar: Grammar;
  grammar: Grammar;
  augmentedProduction: Production;
  states: LR0ItemSet[];
  transitions: LR0Transition[];
  constructionSteps: LR0ConstructionStep[];
  tableEntries: LR0TableEntry[];
  actionTable: Record<number, Record<string, LR0TableEntry[]>>;
  gotoTable: Record<number, Record<string, LR0TableEntry[]>>;
  conflicts: LR0Conflict[];
}

export interface LR0Result {
  analysis?: LR0Analysis;
  errors: GrammarError[];
}

type ItemMap = Map<string, LR0Item>;

const productionDisplay = (lhs: string, rhs: string[]) =>
  `${lhs} -> ${rhs.length === 0 ? EPSILON : rhs.join(' ')}`;

const productionNumber = (production: Production) => Number(production.id.replace(/^p/, ''));

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

const itemId = (item: LR0Item) => `${item.productionId}@${item.dot}`;

const productionRank = (grammar: Grammar) =>
  new Map(grammar.productions.map((production, index) => [production.id, index]));

const sortItems = (items: Iterable<LR0Item>, grammar: Grammar) => {
  const rank = productionRank(grammar);
  return [...items].sort((a, b) => {
    const productionDelta = (rank.get(a.productionId) ?? 0) - (rank.get(b.productionId) ?? 0);
    return productionDelta === 0 ? a.dot - b.dot : productionDelta;
  });
};

const getProduction = (grammar: Grammar, productionId: string) => {
  const production = grammar.productions.find((candidate) => candidate.id === productionId);
  if (!production) {
    throw new Error(`Missing production ${productionId}`);
  }
  return production;
};

export const formatLR0Item = (production: Production, dot: number) => {
  const rhs = production.rhs.length === 0 ? [] : production.rhs;
  const beforeDot = rhs.slice(0, dot);
  const afterDot = rhs.slice(dot);
  const symbols = [...beforeDot, '·', ...afterDot];
  return `${production.lhs} -> ${symbols.length === 1 ? '·' : symbols.join(' ')}`;
};

const toItemView = (item: LR0Item, grammar: Grammar): LR0ItemView => {
  const production = getProduction(grammar, item.productionId);
  const nextSymbol = production.rhs[item.dot];
  return {
    ...item,
    id: itemId(item),
    production,
    nextSymbol,
    display: formatLR0Item(production, item.dot),
  };
};

const toItemViews = (items: Iterable<LR0Item>, grammar: Grammar) =>
  sortItems(items, grammar).map((item) => toItemView(item, grammar));

const itemSetKey = (items: Iterable<LR0Item>, grammar: Grammar) =>
  sortItems(items, grammar)
    .map(itemId)
    .join('|');

const addItem = (items: ItemMap, item: LR0Item) => {
  const key = itemId(item);
  if (items.has(key)) {
    return false;
  }
  items.set(key, item);
  return true;
};

export const closureLR0Items = (seedItems: LR0Item[], grammar: Grammar) => {
  const nonTerminals = new Set(grammar.nonTerminals);
  const items: ItemMap = new Map();
  const additions: LR0ClosureAddition[] = [];
  const queue: LR0Item[] = [];

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

    for (const production of grammar.productions.filter((candidate) => candidate.lhs === nextSymbol)) {
      const candidate = { productionId: production.id, dot: 0 };
      if (addItem(items, candidate)) {
        queue.push(candidate);
        const addedItem = toItemView(candidate, grammar);
        additions.push({
          fromItem: itemView,
          addedItem,
          reason: `点号后是非终结符 ${nextSymbol}，因此把 ${production.display} 的初始项目加入 closure。`,
        });
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

export const gotoLR0Items = (items: LR0Item[], symbol: string, grammar: Grammar) => {
  const kernelItems = items.flatMap((item) => {
    const production = getProduction(grammar, item.productionId);
    return production.rhs[item.dot] === symbol
      ? [{ productionId: item.productionId, dot: item.dot + 1 }]
      : [];
  });

  const closure = closureLR0Items(kernelItems, grammar);

  return {
    kernelItems,
    kernelViews: toItemViews(kernelItems, grammar),
    ...closure,
  };
};

const nextSymbolsOf = (state: LR0ItemSet, grammar: Grammar) => {
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

const makeState = (index: number, items: LR0Item[], grammar: Grammar): LR0ItemSet => ({
  id: `I${index}`,
  index,
  items: toItemViews(items, grammar),
  itemKey: itemSetKey(items, grammar),
});

const pushStep = (
  steps: LR0ConstructionStep[],
  step: Omit<LR0ConstructionStep, 'index'>,
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
      Object.fromEntries([...terminals, EOF_SYMBOL].map((terminal) => [terminal, [] as LR0TableEntry[]])),
    ]),
  ) as Record<number, Record<string, LR0TableEntry[]>>;

const createEmptyGotoTable = (stateCount: number, nonTerminals: string[]) =>
  Object.fromEntries(
    Array.from({ length: stateCount }, (_, index) => [
      index,
      Object.fromEntries(nonTerminals.map((nonTerminal) => [nonTerminal, [] as LR0TableEntry[]])),
    ]),
  ) as Record<number, Record<string, LR0TableEntry[]>>;

const addTableEntry = (
  tableEntries: LR0TableEntry[],
  entry: Omit<LR0TableEntry, 'id'>,
) => {
  tableEntries.push({
    ...entry,
    id: `lr0-table-${tableEntries.length + 1}`,
  });
};

const buildLR0Table = (
  analysis: Omit<LR0Analysis, 'tableEntries' | 'actionTable' | 'gotoTable' | 'conflicts'>,
) => {
  const terminals = analysis.grammar.terminals;
  const nonTerminals = analysis.originalGrammar.nonTerminals;
  const actionTable = createEmptyActionTable(analysis.states.length, terminals);
  const gotoTable = createEmptyGotoTable(analysis.states.length, nonTerminals);
  const tableEntries: LR0TableEntry[] = [];

  for (const transition of analysis.transitions) {
    if (terminals.includes(transition.symbol)) {
      addTableEntry(tableEntries, {
        table: 'ACTION',
        state: transition.from,
        symbol: transition.symbol,
        action: 'shift',
        targetState: transition.to,
        reason: `DFA 中存在 I${transition.from} -- ${transition.symbol} --> I${transition.to}，因此 ACTION[${transition.from}, ${transition.symbol}] = s${transition.to}。`,
      });
    } else if (nonTerminals.includes(transition.symbol)) {
      addTableEntry(tableEntries, {
        table: 'GOTO',
        state: transition.from,
        symbol: transition.symbol,
        action: 'goto',
        targetState: transition.to,
        reason: `DFA 中存在 I${transition.from} -- ${transition.symbol} --> I${transition.to}，因此 GOTO[${transition.from}, ${transition.symbol}] = ${transition.to}。`,
      });
    }
  }

  for (const state of analysis.states) {
    for (const item of state.items) {
      const completed = item.dot === item.production.rhs.length;
      if (!completed) {
        continue;
      }

      if (item.production.id === analysis.augmentedProduction.id) {
        addTableEntry(tableEntries, {
          table: 'ACTION',
          state: state.index,
          symbol: EOF_SYMBOL,
          action: 'accept',
          item,
          reason: `项目 ${item.display} 表示增广开始产生式已经识别完成，因此 ACTION[${state.index}, ${EOF_SYMBOL}] = acc。`,
        });
        continue;
      }

      for (const symbol of [...terminals, EOF_SYMBOL]) {
        addTableEntry(tableEntries, {
          table: 'ACTION',
          state: state.index,
          symbol,
          action: 'reduce',
          production: item.production,
          item,
          reason: `LR(0) 项目 ${item.display} 已完成，因此对所有终结符填入 ACTION[${state.index}, ${symbol}] = r${productionNumber(item.production)}。`,
        });
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
      entries.length > 1 ? [{ table: 'ACTION' as const, state: Number(state), symbol, entries }] : [],
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

export const buildLR0CanonicalCollection = (originalGrammar: Grammar): LR0Analysis => {
  const augmented = augmentGrammar(originalGrammar);
  const grammar = augmented.grammar;
  const initialKernel = [{ productionId: augmented.augmentedProduction.id, dot: 0 }];
  const initialClosure = closureLR0Items(initialKernel, grammar);
  const states = [makeState(0, initialClosure.items, grammar)];
  const transitions: LR0Transition[] = [];
  const stateByKey = new Map([[states[0].itemKey, 0]]);
  const constructionSteps: LR0ConstructionStep[] = [];
  const queue = [0];

  pushStep(constructionSteps, {
    type: 'closure',
    title: '构造初始项目集 I0',
    reason: `从增广产生式 ${augmented.augmentedProduction.display} 的初始项目开始，计算 closure。`,
    sourceItems: toItemViews(initialKernel, grammar),
    kernelItems: toItemViews(initialKernel, grammar),
    resultItems: states[0].items,
    additions: initialClosure.additions,
    visibleStateCount: states.length,
    visibleTransitionCount: transitions.length,
  });

  while (queue.length > 0) {
    const stateIndex = queue.shift()!;
    const state = states[stateIndex];

    for (const symbol of nextSymbolsOf(state, grammar)) {
      const gotoResult = gotoLR0Items(state.items, symbol, grammar);
      if (gotoResult.items.length === 0) {
        continue;
      }

      pushStep(constructionSteps, {
        type: 'goto',
        title: `计算 GOTO(I${stateIndex}, ${symbol})`,
        reason: `将 I${stateIndex} 中点号后为 ${symbol} 的项目前移点号，再对得到的核心项目计算 closure。`,
        fromState: stateIndex,
        symbol,
        sourceItems: state.items,
        kernelItems: gotoResult.kernelViews,
        resultItems: gotoResult.itemViews,
        additions: gotoResult.additions,
        visibleStateCount: states.length,
        visibleTransitionCount: transitions.length,
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
          title: `新增项目集 I${targetState}`,
          reason: `GOTO(I${stateIndex}, ${symbol}) 得到新的项目集，因此记为 I${targetState}。`,
          fromState: stateIndex,
          toState: targetState,
          symbol,
          sourceItems: state.items,
          kernelItems: gotoResult.kernelViews,
          resultItems: newState.items,
          additions: gotoResult.additions,
          visibleStateCount: states.length,
          visibleTransitionCount: transitions.length,
        });
      } else {
        pushStep(constructionSteps, {
          type: 'reuse-state',
          title: `复用项目集 I${targetState}`,
          reason: `GOTO(I${stateIndex}, ${symbol}) 的项目集已经存在，直接复用 I${targetState}。`,
          fromState: stateIndex,
          toState: targetState,
          symbol,
          sourceItems: state.items,
          kernelItems: gotoResult.kernelViews,
          resultItems: states[targetState].items,
          additions: gotoResult.additions,
          visibleStateCount: states.length,
          visibleTransitionCount: transitions.length,
        });
      }

      const transition: LR0Transition = {
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

  const partialAnalysis = {
    originalGrammar,
    grammar,
    augmentedProduction: augmented.augmentedProduction,
    states,
    transitions,
    constructionSteps,
  };
  const table = buildLR0Table(partialAnalysis);

  return {
    ...partialAnalysis,
    ...table,
  };
};

const normalizeInput = (input: string) => {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  return tokens[tokens.length - 1] === EOF_SYMBOL ? tokens : [...tokens, EOF_SYMBOL];
};

export const runLR0Parser = (analysis: LR0Analysis, rawInput: string) => {
  const inputTokens = normalizeInput(rawInput);
  const stateStack = [0];
  const symbolStack = [EOF_SYMBOL];
  const steps: LR0ParseStep[] = [];
  let cursor = 0;
  let guard = 0;

  while (guard < 300) {
    guard += 1;
    const state = stateStack[stateStack.length - 1];
    const lookahead = inputTokens[cursor] ?? EOF_SYMBOL;
    const snapshot = {
      stateStack: [...stateStack],
      symbolStack: [...symbolStack],
      input: inputTokens.slice(cursor),
    };
    const entries = analysis.actionTable[state]?.[lookahead] ?? [];

    if (entries.length !== 1) {
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'error',
        message:
          entries.length > 1
            ? `ACTION[${state}, ${lookahead}] 存在冲突，无法唯一选择动作。`
            : `ACTION[${state}, ${lookahead}] 为空，分析失败。`,
      });
      break;
    }

    const entry = entries[0];

    if (entry.action === 'shift') {
      symbolStack.push(lookahead);
      stateStack.push(entry.targetState!);
      cursor += 1;
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'shift',
        tableEntry: entry,
        message: `ACTION[${state}, ${lookahead}] = s${entry.targetState}，移进 ${lookahead}。`,
      });
      continue;
    }

    if (entry.action === 'accept') {
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'accept',
        tableEntry: entry,
        message: 'ACTION 表给出 acc，分析成功。',
      });
      break;
    }

    const production = entry.production!;
    for (let index = 0; index < production.rhs.length; index += 1) {
      symbolStack.pop();
      stateStack.pop();
    }

    const gotoState = stateStack[stateStack.length - 1];
    const gotoEntries = analysis.gotoTable[gotoState]?.[production.lhs] ?? [];
    if (gotoEntries.length !== 1) {
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'error',
        tableEntry: entry,
        production,
        message:
          gotoEntries.length > 1
            ? `按 ${production.display} 归约后，GOTO[${gotoState}, ${production.lhs}] 存在冲突。`
            : `按 ${production.display} 归约后，GOTO[${gotoState}, ${production.lhs}] 为空。`,
      });
      break;
    }

    symbolStack.push(production.lhs);
    stateStack.push(gotoEntries[0].targetState!);
    steps.push({
      index: steps.length + 1,
      ...snapshot,
      action: 'reduce',
      tableEntry: entry,
      production,
      message: `ACTION[${state}, ${lookahead}] = r${productionNumber(production)}，按 ${production.display} 归约，转到 I${gotoEntries[0].targetState}。`,
    });
  }

  if (guard >= 300) {
    steps.push({
      index: steps.length + 1,
      stateStack: [...stateStack],
      symbolStack: [...symbolStack],
      input: inputTokens.slice(cursor),
      action: 'error',
      message: '分析步骤超过上限，可能存在异常循环。',
    });
  }

  return { inputTokens, parseSteps: steps };
};

export const analyzeLR0Source = (source: string): LR0Result => {
  const parsed = parseGrammar(source);
  if (!parsed.grammar) {
    return { errors: parsed.errors };
  }

  return {
    errors: [],
    analysis: buildLR0CanonicalCollection(parsed.grammar),
  };
};
