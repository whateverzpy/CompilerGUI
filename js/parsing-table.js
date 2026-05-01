var ParsingTable = (function () {

  function buildTable(grammar, first, follow) {
    var table = {};
    var conflicts = [];
    var terminals = grammar.terminals.slice();
    terminals.push(Grammar.END_MARKER);

    grammar.nonTerminals.forEach(function (nt) {
      table[nt] = {};
      terminals.forEach(function (t) {
        table[nt][t] = null;
      });
    });

    grammar.productions.forEach(function (prod) {
      var A = prod.left;
      var alpha = prod.right;

      var alphaFirst = FirstFollow.firstOfString(alpha, first, grammar);

      alphaFirst.forEach(function (terminal) {
        if (terminal !== Grammar.EPSILON) {
          if (table[A][terminal] !== null) {
            conflicts.push({
              nonTerminal: A,
              terminal: terminal,
              existing: table[A][terminal],
              conflict: prod,
              type: 'FIRST/FIRST 冲突'
            });
          }
          table[A][terminal] = prod;
        }
      });

      if (alphaFirst.has(Grammar.EPSILON)) {
        follow[A].forEach(function (terminal) {
          if (table[A][terminal] !== null) {
            conflicts.push({
              nonTerminal: A,
              terminal: terminal,
              existing: table[A][terminal],
              conflict: prod,
              type: 'FIRST/FOLLOW 冲突'
            });
          }
          table[A][terminal] = prod;
        });
      }
    });

    return {
      table: table,
      terminals: terminals,
      conflicts: conflicts,
      isLL1: conflicts.length === 0
    };
  }

  function simulateParse(grammar, table, inputStr) {
    var tokens = inputStr.trim().split(/\s+/);
    tokens.push(Grammar.END_MARKER);

    var stack = [Grammar.END_MARKER, grammar.startSymbol];
    var steps = [];
    var stepNum = 0;
    var maxSteps = 500;
    var treeNodes = [];
    var treeEdges = [];
    var nodeId = 0;
    var parentNodeStack = [];

    var rootNodeId = nodeId++;
    treeNodes.push({ id: rootNodeId, label: grammar.startSymbol, shape: 'box', color: { background: '#6366f1', border: '#4f46e5', font: { color: '#fff' } } });
    parentNodeStack.push({ symbol: grammar.startSymbol, nodeId: rootNodeId, childIndex: 0 });

    while (stack.length > 0 && stepNum < maxSteps) {
      var top = stack[stack.length - 1];
      var currentInput = tokens[0] || Grammar.END_MARKER;

      stepNum++;
      var stackStr = stack.slice().reverse().join(' ');
      var inputStr2 = tokens.join(' ');
      var action = '';
      var error = false;
      var accept = false;

      if (top === Grammar.END_MARKER && currentInput === Grammar.END_MARKER) {
        action = '接受';
        accept = true;
        steps.push({
          step: stepNum,
          stack: stackStr,
          input: inputStr2,
          action: action,
          production: null,
          error: false,
          accept: true
        });
        break;
      }

      if (grammar.isTerminal(top) || top === Grammar.END_MARKER) {
        if (top === currentInput) {
          action = '匹配 ' + top;
          stack.pop();
          tokens.shift();

          if (parentNodeStack.length > 0) {
            var pns = parentNodeStack[parentNodeStack.length - 1];
            var leafId = nodeId++;
            treeNodes.push({ id: leafId, label: top, shape: 'box', color: { background: '#10b981', border: '#059669', font: { color: '#fff' } }, font: { size: 12 } });
            treeEdges.push({ from: pns.nodeId, to: leafId });
            pns.childIndex++;
          }
        } else {
          action = '错误: 栈顶 ' + top + ' 与输入 ' + currentInput + ' 不匹配';
          error = true;
          steps.push({
            step: stepNum,
            stack: stackStr,
            input: inputStr2,
            action: action,
            production: null,
            error: true,
            accept: false
          });
          break;
        }
      } else if (grammar.isNonTerminal(top)) {
        var prod = null;
        if (table[top] && table[top][currentInput]) {
          prod = table[top][currentInput];
        }

        if (prod) {
          stack.pop();

          var pns = parentNodeStack.pop();
          var rhsDisplay = prod.right.join(' ');
          if (rhsDisplay === Grammar.EPSILON) rhsDisplay = Grammar.EPSILON;
          action = top + ' → ' + rhsDisplay;

          if (prod.right.length === 1 && prod.right[0] === Grammar.EPSILON) {
            var epsId = nodeId++;
            treeNodes.push({ id: epsId, label: Grammar.EPSILON, shape: 'box', color: { background: '#f59e0b', border: '#d97706', font: { color: '#fff' } }, font: { size: 11 } });
            treeEdges.push({ from: pns.nodeId, to: epsId });
          } else {
            var childEntries = [];
            for (var ci = prod.right.length - 1; ci >= 0; ci--) {
              var childSym = prod.right[ci];
              var childId = nodeId++;
              var isNT = grammar.isNonTerminal(childSym);
              treeNodes.push({
                id: childId,
                label: childSym,
                shape: 'box',
                color: isNT
                  ? { background: '#6366f1', border: '#4f46e5', font: { color: '#fff' } }
                  : { background: '#10b981', border: '#059669', font: { color: '#fff' } },
                font: { size: isNT ? 14 : 12 }
              });
              treeEdges.push({ from: pns.nodeId, to: childId });
              stack.push(childSym);
              childEntries.push({ symbol: childSym, nodeId: childId, childIndex: 0 });
            }
            for (var ci = childEntries.length - 1; ci >= 0; ci--) {
              parentNodeStack.push(childEntries[ci]);
            }
          }
        } else {
          action = '错误: M[' + top + ', ' + currentInput + '] 为空';
          error = true;
          steps.push({
            step: stepNum,
            stack: stackStr,
            input: inputStr2,
            action: action,
            production: null,
            error: true,
            accept: false
          });
          break;
        }
      }

      steps.push({
        step: stepNum,
        stack: stackStr,
        input: inputStr2,
        action: action,
        production: prod,
        error: false,
        accept: false
      });
    }

    return {
      steps: steps,
      treeNodes: treeNodes,
      treeEdges: treeEdges,
      success: steps.length > 0 && steps[steps.length - 1].accept === true
    };
  }

  return {
    buildTable: buildTable,
    simulateParse: simulateParse
  };
})();
