import {
  EOF_SYMBOL,
  EPSILON,
  analyzeGrammarSource,
  getFirstOfSequence,
  symbolOrder,
  toSortedArray,
  type GrammarAnalysis,
  type GrammarError,
  type Production,
} from './grammar';

export interface LL1TableEntry {
  id: string;
  production: Production;
  nonTerminal: string;
  terminal: string;
  source: 'first' | 'follow';
  firstOfRhs: string[];
  followOfLhs: string[];
  reason: string;
  stepIndex: number;
}

export interface LL1ConstructionStep {
  id: string;
  index: number;
  production: Production;
  nonTerminal: string;
  terminal: string;
  source: 'first' | 'follow';
  firstOfRhs: string[];
  followOfLhs: string[];
  reason: string;
}

export interface LL1Conflict {
  nonTerminal: string;
  terminal: string;
  entries: LL1TableEntry[];
}

export interface LL1ParseStep {
  index: number;
  stack: string[];
  input: string[];
  action: 'predict' | 'match' | 'accept' | 'error';
  production?: Production;
  tableEntry?: LL1TableEntry;
  message: string;
}

export interface LL1Analysis {
  grammarAnalysis: GrammarAnalysis;
  terminals: string[];
  table: Record<string, Record<string, LL1TableEntry[]>>;
  constructionSteps: LL1ConstructionStep[];
  conflicts: LL1Conflict[];
}

export interface LL1Result {
  analysis?: LL1Analysis;
  errors: GrammarError[];
}

const createTable = (analysis: GrammarAnalysis, terminals: string[]) =>
  Object.fromEntries(
    analysis.grammar.nonTerminals.map((nonTerminal) => [
      nonTerminal,
      Object.fromEntries(terminals.map((terminal) => [terminal, [] as LL1TableEntry[]])),
    ]),
  ) as Record<string, Record<string, LL1TableEntry[]>>;

const normalizeInput = (input: string) => {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  return tokens[tokens.length - 1] === EOF_SYMBOL ? tokens : [...tokens, EOF_SYMBOL];
};

const rhsDisplay = (production: Production) =>
  production.rhs.length === 0 ? EPSILON : production.rhs.join(' ');

const addTableEntry = (
  table: Record<string, Record<string, LL1TableEntry[]>>,
  steps: LL1ConstructionStep[],
  production: Production,
  terminal: string,
  source: 'first' | 'follow',
  firstOfRhs: string[],
  followOfLhs: string[],
) => {
  const stepIndex = steps.length + 1;
  const reason =
    source === 'first'
      ? `因为 ${terminal} 属于 FIRST(${rhsDisplay(production)})，所以 M[${production.lhs}, ${terminal}] 填入 ${production.display}。`
      : `因为 ${EPSILON} 属于 FIRST(${rhsDisplay(production)})，且 ${terminal} 属于 FOLLOW(${production.lhs})，所以 M[${production.lhs}, ${terminal}] 填入 ${production.display}。`;

  const step: LL1ConstructionStep = {
    id: `ll1-table-${stepIndex}`,
    index: stepIndex,
    production,
    nonTerminal: production.lhs,
    terminal,
    source,
    firstOfRhs,
    followOfLhs,
    reason,
  };
  const entry: LL1TableEntry = {
    ...step,
    stepIndex,
  };

  steps.push(step);
  table[production.lhs][terminal].push(entry);
};

export const buildLL1Table = (grammarAnalysis: GrammarAnalysis) => {
  const grammar = grammarAnalysis.grammar;
  const terminals = [...grammar.terminals, EOF_SYMBOL];
  const table = createTable(grammarAnalysis, terminals);
  const constructionSteps: LL1ConstructionStep[] = [];
  const order = symbolOrder(grammar);

  for (const production of grammar.productions) {
    const sequenceFirst = getFirstOfSequence(production.rhs, grammar, grammarAnalysis.firstSets);
    const firstOfRhs = toSortedArray(sequenceFirst.symbols, order);
    const followOfLhs = grammarAnalysis.followSets[production.lhs] ?? [];

    for (const terminal of firstOfRhs) {
      if (terminal === EPSILON) {
        continue;
      }
      addTableEntry(table, constructionSteps, production, terminal, 'first', firstOfRhs, followOfLhs);
    }

    if (sequenceFirst.nullable) {
      for (const terminal of followOfLhs) {
        addTableEntry(table, constructionSteps, production, terminal, 'follow', firstOfRhs, followOfLhs);
      }
    }
  }

  const conflicts = grammar.nonTerminals.flatMap((nonTerminal) =>
    terminals.flatMap((terminal) => {
      const entries = table[nonTerminal][terminal];
      return entries.length > 1 ? [{ nonTerminal, terminal, entries }] : [];
    }),
  );

  return { terminals, table, constructionSteps, conflicts };
};

const isTerminal = (symbol: string, analysis: GrammarAnalysis) =>
  symbol === EOF_SYMBOL || analysis.grammar.terminals.includes(symbol);

export const runLL1Parser = (
  grammarAnalysis: GrammarAnalysis,
  table: Record<string, Record<string, LL1TableEntry[]>>,
  rawInput: string,
) => {
  const inputTokens = normalizeInput(rawInput);
  const stack = [EOF_SYMBOL, grammarAnalysis.grammar.startSymbol];
  const steps: LL1ParseStep[] = [];
  let cursor = 0;
  let guard = 0;

  while (guard < 200) {
    guard += 1;
    const top = stack[stack.length - 1];
    const lookahead = inputTokens[cursor] ?? EOF_SYMBOL;
    const snapshot = {
      stack: [...stack].reverse(),
      input: inputTokens.slice(cursor),
    };

    if (!top) {
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'error',
        message: '分析栈为空，但输入尚未完成。',
      });
      break;
    }

    if (top === EOF_SYMBOL && lookahead === EOF_SYMBOL) {
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'accept',
        message: '栈顶和输入均为 $，分析成功。',
      });
      break;
    }

    if (isTerminal(top, grammarAnalysis)) {
      if (top === lookahead) {
        stack.pop();
        cursor += 1;
        steps.push({
          index: steps.length + 1,
          ...snapshot,
          action: 'match',
          message: `匹配终结符 ${top}。`,
        });
      } else {
        steps.push({
          index: steps.length + 1,
          ...snapshot,
          action: 'error',
          message: `栈顶终结符 ${top} 与当前输入 ${lookahead} 不匹配。`,
        });
        break;
      }
      continue;
    }

    const entries = table[top]?.[lookahead] ?? [];
    if (entries.length !== 1) {
      steps.push({
        index: steps.length + 1,
        ...snapshot,
        action: 'error',
        message:
          entries.length > 1
            ? `M[${top}, ${lookahead}] 存在冲突，无法唯一选择产生式。`
            : `M[${top}, ${lookahead}] 为空，分析失败。`,
      });
      break;
    }

    const entry = entries[0];
    stack.pop();
    for (const symbol of [...entry.production.rhs].reverse()) {
      stack.push(symbol);
    }

    steps.push({
      index: steps.length + 1,
      ...snapshot,
      action: 'predict',
      production: entry.production,
      tableEntry: entry,
      message: `查表 M[${top}, ${lookahead}]，使用 ${entry.production.display}。`,
    });
  }

  if (guard >= 200) {
    steps.push({
      index: steps.length + 1,
      stack: [...stack].reverse(),
      input: inputTokens.slice(cursor),
      action: 'error',
      message: '分析步骤超过上限，可能存在异常循环。',
    });
  }

  return { inputTokens, parseSteps: steps };
};

export const analyzeLL1Source = (grammarSource: string): LL1Result => {
  const grammarResult = analyzeGrammarSource(grammarSource);
  if (!grammarResult.analysis) {
    return { errors: grammarResult.errors };
  }

  const tableResult = buildLL1Table(grammarResult.analysis);

  return {
    errors: [],
    analysis: {
      grammarAnalysis: grammarResult.analysis,
      ...tableResult,
    },
  };
};
