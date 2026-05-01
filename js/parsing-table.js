var ParsingTable = (function () {
  function buildTable(grammar, first, follow) {
    var table = {};
    var tableInfo = {};
    var conflicts = [];
    var terminals = grammar.terminals.slice();
    terminals.push(Grammar.END_MARKER);

    grammar.nonTerminals.forEach(function (nt) {
      table[nt] = {};
      tableInfo[nt] = {};
      terminals.forEach(function (t) {
        table[nt][t] = null;
        tableInfo[nt][t] = null;
      });
    });

    grammar.productions.forEach(function (prod) {
      var A = prod.left;
      var alpha = prod.right;

      var alphaFirst = FirstFollow.firstOfString(alpha, first, grammar);
      var alphaFirstArr = Array.from(alphaFirst);

      alphaFirst.forEach(function (terminal) {
        if (terminal !== Grammar.EPSILON) {
          if (table[A][terminal] !== null) {
            conflicts.push({
              nonTerminal: A,
              terminal: terminal,
              existing: table[A][terminal],
              conflict: prod,
              type: "FIRST/FIRST 冲突",
            });
          }
          table[A][terminal] = prod;
          tableInfo[A][terminal] = {
            production: prod,
            ruleType: "FIRST",
            reason: "FIRST(" + formatRhs(alpha) + ") = { " + alphaFirstArr.filter(function(s) { return s !== Grammar.EPSILON; }).join(", ") + " }",
            detail: "由于 " + terminal + " ∈ FIRST(" + formatRhs(alpha) + ")，根据规则：对产生式 A → α，若 a ∈ FIRST(α) 且 a ≠ ε，则 M[A, a] = A → α",
            firstSet: alphaFirstArr,
            nonTerminal: A,
            terminal: terminal
          };
        }
      });

      if (alphaFirst.has(Grammar.EPSILON)) {
        var followArr = Array.from(follow[A]);
        follow[A].forEach(function (terminal) {
          if (table[A][terminal] !== null) {
            conflicts.push({
              nonTerminal: A,
              terminal: terminal,
              existing: table[A][terminal],
              conflict: prod,
              type: "FIRST/FOLLOW 冲突",
            });
          }
          table[A][terminal] = prod;
          tableInfo[A][terminal] = {
            production: prod,
            ruleType: "FOLLOW",
            reason: "ε ∈ FIRST(" + formatRhs(alpha) + ") 且 " + terminal + " ∈ FOLLOW(" + A + ")",
            detail: "由于 ε ∈ FIRST(" + formatRhs(alpha) + ")，且 " + terminal + " ∈ FOLLOW(" + A + ")，根据规则：若 ε ∈ FIRST(α)，则对每个 b ∈ FOLLOW(A)，M[A, b] = A → α",
            firstSet: alphaFirstArr,
            followSet: followArr,
            nonTerminal: A,
            terminal: terminal
          };
        });
      }
    });

    return {
      table: table,
      tableInfo: tableInfo,
      terminals: terminals,
      conflicts: conflicts,
      isLL1: conflicts.length === 0,
    };
  }

  function formatRhs(rhs) {
    if (rhs.length === 1 && rhs[0] === Grammar.EPSILON) {
      return Grammar.EPSILON;
    }
    return rhs.join(" ");
  }

  function simulateParse(grammar, table, inputStr) {
    var tokens = inputStr.trim().split(/\s+/);
    tokens.push(Grammar.END_MARKER);

    var allTreeNodes = [];
    var allTreeEdges = [];
    var nodeId = 0;
    var steps = [];
    var stepNum = 0;
    var maxSteps = 500;

    var rootId = nodeId++;
    var rootNode = {
      id: rootId,
      label: grammar.startSymbol,
      shape: "box",
      color: { background: "#6366f1", border: "#4f46e5" },
      font: { color: "#fff", size: 16, face: "monospace" },
    };
    allTreeNodes.push(rootNode);

    var stack = [];
    stack.push({ symbol: Grammar.END_MARKER, nodeId: null });
    stack.push({ symbol: grammar.startSymbol, nodeId: rootId });

    steps.push({
      step: 0,
      stack: grammar.startSymbol + " #",
      input: tokens.join(" "),
      action: "初始化",
      production: null,
      error: false,
      accept: false,
      newNodes: [rootNode],
      newEdges: [],
    });

    while (stack.length > 0 && stepNum < maxSteps) {
      var top = stack[stack.length - 1];
      var topSymbol = top.symbol;
      var topNodeId = top.nodeId;
      var currentInput = tokens[0] || Grammar.END_MARKER;

      stepNum++;
      var stackSymbols = [];
      for (var i = stack.length - 1; i >= 0; i--) {
        stackSymbols.push(stack[i].symbol);
      }
      var stackStr = stackSymbols.join(" ");
      var inputStr2 = tokens.join(" ");
      var action = "";
      var prod = null;
      var error = false;
      var accept = false;
      var newNodes = [];
      var newEdges = [];

      if (
        topSymbol === Grammar.END_MARKER &&
        currentInput === Grammar.END_MARKER
      ) {
        action = "接受";
        accept = true;
        steps.push({
          step: stepNum,
          stack: stackStr,
          input: inputStr2,
          action: action,
          production: null,
          error: false,
          accept: true,
          newNodes: newNodes,
          newEdges: newEdges,
        });
        break;
      }

      if (grammar.isTerminal(topSymbol)) {
        if (topSymbol === currentInput) {
          action = "匹配 " + topSymbol;
          stack.pop();
          tokens.shift();
        } else {
          action =
            "错误: 栈顶 " + topSymbol + " 与输入 " + currentInput + " 不匹配";
          error = true;
          steps.push({
            step: stepNum,
            stack: stackStr,
            input: inputStr2,
            action: action,
            production: null,
            error: true,
            accept: false,
            newNodes: newNodes,
            newEdges: newEdges,
          });
          break;
        }
      } else if (grammar.isNonTerminal(topSymbol)) {
        prod = table[topSymbol] && table[topSymbol][currentInput];

        if (prod) {
          stack.pop();

          var rhsDisplay = prod.right.join(" ");
          if (rhsDisplay === Grammar.EPSILON) rhsDisplay = Grammar.EPSILON;
          action = topSymbol + " → " + rhsDisplay;

          if (prod.right.length === 1 && prod.right[0] === Grammar.EPSILON) {
            var epsId = nodeId++;
            var epsNode = {
              id: epsId,
              label: Grammar.EPSILON,
              shape: "box",
              color: { background: "#f59e0b", border: "#d97706" },
              font: { color: "#fff", size: 14, face: "monospace" },
            };
            allTreeNodes.push(epsNode);
            newNodes.push(epsNode);
            var epsEdge = { from: topNodeId, to: epsId };
            allTreeEdges.push(epsEdge);
            newEdges.push(epsEdge);
          } else {
            var childrenToPush = [];
            for (var i = 0; i < prod.right.length; i++) {
              var childSym = prod.right[i];
              var childId = nodeId++;
              var isNT = grammar.isNonTerminal(childSym);
              var childNode = {
                id: childId,
                label: childSym,
                shape: "box",
                color: isNT
                  ? { background: "#6366f1", border: "#4f46e5" }
                  : { background: "#10b981", border: "#059669" },
                font: {
                  color: "#fff",
                  size: isNT ? 16 : 14,
                  face: "monospace",
                },
              };
              allTreeNodes.push(childNode);
              newNodes.push(childNode);
              var childEdge = { from: topNodeId, to: childId };
              allTreeEdges.push(childEdge);
              newEdges.push(childEdge);
              childrenToPush.push({ symbol: childSym, nodeId: childId });
            }
            for (var i = childrenToPush.length - 1; i >= 0; i--) {
              stack.push(childrenToPush[i]);
            }
          }
        } else {
          action = "错误: M[" + topSymbol + ", " + currentInput + "] 为空";
          error = true;
          steps.push({
            step: stepNum,
            stack: stackStr,
            input: inputStr2,
            action: action,
            production: null,
            error: true,
            accept: false,
            newNodes: newNodes,
            newEdges: newEdges,
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
        accept: false,
        newNodes: newNodes,
        newEdges: newEdges,
      });
    }

    return {
      steps: steps,
      treeNodes: allTreeNodes,
      treeEdges: allTreeEdges,
      success: steps.length > 0 && steps[steps.length - 1].accept === true,
    };
  }

  return {
    buildTable: buildTable,
    simulateParse: simulateParse,
  };
})();
