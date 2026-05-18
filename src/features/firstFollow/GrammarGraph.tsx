import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo } from 'react';
import { type GrammarAnalysis } from '../../core/grammar';
import { classNames } from '../../lib/classNames';

interface GrammarGraphProps {
  analysis: GrammarAnalysis;
  currentStepIndex: number;
}

export const GrammarGraph = ({ analysis, currentStepIndex }: GrammarGraphProps) => {
  const step = analysis.steps[currentStepIndex];

  const { nodes, edges } = useMemo(() => {
    const symbolRows = [
      { symbols: analysis.grammar.nonTerminals, y: 40, type: 'nonterminal' },
      { symbols: analysis.grammar.terminals, y: 200, type: 'terminal' },
    ];
    const nodes: Node[] = [];

    for (const row of symbolRows) {
      row.symbols.forEach((symbol, index) => {
        const isFocus = symbol === step.focusSymbol;
        nodes.push({
          id: symbol,
          position: { x: index * 145, y: row.y },
          data: {
            label: (
              <div
                className={classNames(
                  'min-w-[88px] rounded-md border bg-white px-3 py-2 text-center font-mono text-sm shadow-sm',
                  isFocus
                    ? 'border-ink-950 text-ink-950'
                    : row.type === 'nonterminal'
                      ? 'border-neutral-300 text-ink-950'
                      : 'border-neutral-200 text-ink-600',
                )}
              >
                {symbol}
              </div>
            ),
          },
          draggable: false,
          selectable: false,
        });
      });
    }

    const edges: Edge[] = [];
    for (const production of analysis.grammar.productions) {
      for (const rhsSymbol of production.rhs) {
        if (rhsSymbol === production.lhs) {
          continue;
        }
        const exists = analysis.grammar.nonTerminals.includes(rhsSymbol)
          || analysis.grammar.terminals.includes(rhsSymbol);
        if (!exists) {
          continue;
        }
        const isCurrent = step.production?.id === production.id;
        edges.push({
          id: `${production.id}-${production.lhs}-${rhsSymbol}`,
          source: production.lhs,
          target: rhsSymbol,
          label: production.id,
          animated: false,
          style: {
            stroke: isCurrent ? '#111111' : '#d4d4d4',
            strokeWidth: isCurrent ? 2 : 1,
          },
          labelStyle: {
            fill: isCurrent ? '#111111' : '#737373',
            fontSize: 11,
            fontFamily: 'Consolas, monospace',
          },
        });
      }
    }

    return { nodes, edges };
  }, [analysis, step.focusSymbol, step.production?.id]);

  return (
    <section className="h-[320px] rounded-md border border-neutral-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-ink-950">文法关系图</h3>
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
