export const EPSILON = 'ε';
export const EOF_SYMBOL = '$';

export type Phase = 'first' | 'follow';

export interface Production {
  id: string;
  lhs: string;
  rhs: string[];
  display: string;
}

export interface Grammar {
  startSymbol: string;
  nonTerminals: string[];
  terminals: string[];
  productions: Production[];
}

export interface TraceStep {
  id: string;
  phase: Phase;
  pass: number;
  title: string;
  production?: Production;
  focusSymbol: string;
  examinedSymbols: string[];
  addedSymbols: string[];
  reason: string;
  firstSets: Record<string, string[]>;
  followSets: Record<string, string[]>;
}

export interface GrammarAnalysis {
  grammar: Grammar;
  firstSets: Record<string, string[]>;
  followSets: Record<string, string[]>;
  steps: TraceStep[];
}

export interface GrammarError {
  line: number;
  message: string;
}

export interface ParseResult {
  grammar?: Grammar;
  errors: GrammarError[];
}

type MutableSets = Record<string, Set<string>>;

export const symbolOrder = (grammar: Grammar) => [
  ...grammar.terminals,
  ...grammar.nonTerminals,
  EPSILON,
  EOF_SYMBOL,
];

export const toSortedArray = (symbols: Iterable<string>, order: string[]) => {
  const rank = new Map(order.map((symbol, index) => [symbol, index]));
  return [...symbols].sort((a, b) => {
    const aRank = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aRank === bRank ? a.localeCompare(b) : aRank - bRank;
  });
};

const snapshotSets = (sets: MutableSets, order: string[]) =>
  Object.fromEntries(
    Object.entries(sets).map(([symbol, values]) => [symbol, toSortedArray(values, order)]),
  );

const createEmptySets = (nonTerminals: string[]): MutableSets =>
  Object.fromEntries(nonTerminals.map((symbol) => [symbol, new Set<string>()]));

const addMany = (target: Set<string>, symbols: Iterable<string>) => {
  const added: string[] = [];

  for (const symbol of symbols) {
    if (!target.has(symbol)) {
      target.add(symbol);
      added.push(symbol);
    }
  }

  return added;
};

const productionDisplay = (lhs: string, rhs: string[]) =>
  `${lhs} -> ${rhs.length === 0 ? EPSILON : rhs.join(' ')}`;

export const parseGrammar = (source: string): ParseResult => {
  const rawLines = source
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line.replace(/#.*/, '').trim() }))
    .filter(({ text }) => text.length > 0);

  const errors: GrammarError[] = [];
  const lhsSymbols: string[] = [];
  const productionDrafts: Array<{ line: number; lhs: string; rhs: string[] }> = [];

  for (const { line, text } of rawLines) {
    const arrow = text.includes('->') ? '->' : text.includes('::=') ? '::=' : null;

    if (!arrow) {
      errors.push({ line, message: '需要使用 -> 或 ::= 书写产生式' });
      continue;
    }

    const [lhsRaw, rhsRaw, ...rest] = text.split(arrow);
    const lhs = lhsRaw.trim();

    if (!lhs || /\s/.test(lhs)) {
      errors.push({ line, message: '产生式左部必须是单个非终结符' });
      continue;
    }

    if (rest.length > 0) {
      errors.push({ line, message: '一条产生式中只能包含一个箭头' });
      continue;
    }

    if (!lhsSymbols.includes(lhs)) {
      lhsSymbols.push(lhs);
    }

    const alternatives = rhsRaw.split('|');
    for (const alternative of alternatives) {
      const tokens = alternative.trim().split(/\s+/).filter(Boolean);
      const rhs = tokens.length === 0 || (tokens.length === 1 && tokens[0] === EPSILON) ? [] : tokens;
      productionDrafts.push({ line, lhs, rhs });
    }
  }

  if (productionDrafts.length === 0) {
    errors.push({ line: 1, message: '至少需要输入一条产生式' });
  }

  const nonTerminals = lhsSymbols;
  const nonTerminalSet = new Set(nonTerminals);
  const terminals = productionDrafts.reduce<string[]>((acc, production) => {
    for (const symbol of production.rhs) {
      if (symbol !== EPSILON && !nonTerminalSet.has(symbol) && !acc.includes(symbol)) {
        acc.push(symbol);
      }
    }

    return acc;
  }, []);

  const productions = productionDrafts.map(({ lhs, rhs }, index) => ({
    id: `p${index + 1}`,
    lhs,
    rhs,
    display: productionDisplay(lhs, rhs),
  }));

  return {
    grammar: errors.length
      ? undefined
      : {
          startSymbol: nonTerminals[0],
          nonTerminals,
          terminals,
          productions,
        },
    errors,
  };
};

const firstOfSequence = (
  sequence: string[],
  grammar: Grammar,
  firstSets: MutableSets,
): { symbols: Set<string>; nullable: boolean; examined: string[] } => {
  const result = new Set<string>();
  const examined: string[] = [];

  if (sequence.length === 0) {
    result.add(EPSILON);
    return { symbols: result, nullable: true, examined };
  }

  const nonTerminals = new Set(grammar.nonTerminals);

  for (const symbol of sequence) {
    examined.push(symbol);

    if (!nonTerminals.has(symbol)) {
      result.add(symbol);
      return { symbols: result, nullable: false, examined };
    }

    for (const value of firstSets[symbol]) {
      if (value !== EPSILON) {
        result.add(value);
      }
    }

    if (!firstSets[symbol].has(EPSILON)) {
      return { symbols: result, nullable: false, examined };
    }
  }

  result.add(EPSILON);
  return { symbols: result, nullable: true, examined };
};

export const getFirstOfSequence = (
  sequence: string[],
  grammar: Grammar,
  firstSets: Record<string, string[]>,
) => {
  const mutableSets = Object.fromEntries(
    grammar.nonTerminals.map((symbol) => [symbol, new Set(firstSets[symbol] ?? [])]),
  );
  const result = firstOfSequence(sequence, grammar, mutableSets);

  return {
    symbols: toSortedArray(result.symbols, symbolOrder(grammar)),
    nullable: result.nullable,
    examined: result.examined,
  };
};

export const analyzeGrammar = (grammar: Grammar): GrammarAnalysis => {
  const order = symbolOrder(grammar);
  const firstSets = createEmptySets(grammar.nonTerminals);
  const followSets = createEmptySets(grammar.nonTerminals);
  const steps: TraceStep[] = [];
  const nonTerminals = new Set(grammar.nonTerminals);

  const pushStep = (
    phase: Phase,
    pass: number,
    title: string,
    focusSymbol: string,
    examinedSymbols: string[],
    addedSymbols: string[],
    reason: string,
    production?: Production,
  ) => {
    steps.push({
      id: `${phase}-${steps.length + 1}`,
      phase,
      pass,
      title,
      production,
      focusSymbol,
      examinedSymbols,
      addedSymbols: toSortedArray(addedSymbols, order),
      reason,
      firstSets: snapshotSets(firstSets, order),
      followSets: snapshotSets(followSets, order),
    });
  };

  let changed = true;
  let pass = 0;

  while (changed && pass < 100) {
    changed = false;
    pass += 1;

    for (const production of grammar.productions) {
      const sequenceFirst = firstOfSequence(production.rhs, grammar, firstSets);
      const added = addMany(firstSets[production.lhs], sequenceFirst.symbols);
      changed = changed || added.length > 0;

      pushStep(
        'first',
        pass,
        `FIRST 第 ${pass} 轮`,
        production.lhs,
        sequenceFirst.examined,
        added,
        explainFirstStep(production, sequenceFirst.nullable, added),
        production,
      );
    }
  }

  const startAdded = addMany(followSets[grammar.startSymbol], [EOF_SYMBOL]);
  pushStep(
    'follow',
    0,
    'FOLLOW 初始化',
    grammar.startSymbol,
    [grammar.startSymbol],
    startAdded,
    `开始符号 ${grammar.startSymbol} 的 FOLLOW 集加入输入结束符 ${EOF_SYMBOL}。`,
  );

  changed = true;
  pass = 0;

  while (changed && pass < 100) {
    changed = false;
    pass += 1;

    for (const production of grammar.productions) {
      for (let index = 0; index < production.rhs.length; index += 1) {
        const symbol = production.rhs[index];

        if (!nonTerminals.has(symbol)) {
          continue;
        }

        const beta = production.rhs.slice(index + 1);
        const betaFirst = firstOfSequence(beta, grammar, firstSets);
        const fromBeta = [...betaFirst.symbols].filter((value) => value !== EPSILON);
        const fromLhs = betaFirst.nullable ? [...followSets[production.lhs]] : [];
        const added = addMany(followSets[symbol], [...fromBeta, ...fromLhs]);

        changed = changed || added.length > 0;

        pushStep(
          'follow',
          pass,
          `FOLLOW 第 ${pass} 轮`,
          symbol,
          betaFirst.examined.length ? betaFirst.examined : [production.lhs],
          added,
          explainFollowStep(production, symbol, beta, betaFirst.nullable, fromBeta, fromLhs, added),
          production,
        );
      }
    }
  }

  return {
    grammar,
    firstSets: snapshotSets(firstSets, order),
    followSets: snapshotSets(followSets, order),
    steps,
  };
};

const explainFirstStep = (production: Production, nullable: boolean, added: string[]) => {
  if (production.rhs.length === 0) {
    return added.length
      ? `${production.lhs} 存在空产生式，因此加入 ${EPSILON}。`
      : `${production.lhs} 已经包含 ${EPSILON}。`;
  }

  if (added.length === 0) {
    return `由 ${production.display} 没有推出新的 FIRST 符号。`;
  }

  const suffix = nullable ? `，并且右部整体可以推出 ${EPSILON}` : '';
  return `根据 ${production.display}，将 ${added.join(', ')} 加入 FIRST(${production.lhs})${suffix}。`;
};

const explainFollowStep = (
  production: Production,
  symbol: string,
  beta: string[],
  betaNullable: boolean,
  fromBeta: string[],
  fromLhs: string[],
  added: string[],
) => {
  if (added.length === 0) {
    return `在 ${production.display} 中，FOLLOW(${symbol}) 没有新增符号。`;
  }

  const reasons: string[] = [];
  if (fromBeta.length > 0) {
    reasons.push(`来自 FIRST(${beta.join(' ')}) 的 ${fromBeta.join(', ')}`);
  }
  if (betaNullable && fromLhs.length > 0) {
    reasons.push(`后缀可空，因此继承 FOLLOW(${production.lhs})`);
  }

  return `将 ${added.join(', ')} 加入 FOLLOW(${symbol})，依据是${reasons.join('，以及')}。`;
};

export const analyzeGrammarSource = (source: string) => {
  const parsed = parseGrammar(source);

  if (!parsed.grammar) {
    return { errors: parsed.errors, analysis: undefined };
  }

  return { errors: parsed.errors, analysis: analyzeGrammar(parsed.grammar) };
};
