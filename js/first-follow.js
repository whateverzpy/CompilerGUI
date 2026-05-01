var FirstFollow = (function () {
  function computeFirst(grammar) {
    var first = {};
    var steps = [];
    var i, j, k;

    for (i = 0; i < grammar.nonTerminals.length; i++) {
      first[grammar.nonTerminals[i]] = new Set();
    }

    for (i = 0; i < grammar.terminals.length; i++) {
      first[grammar.terminals[i]] = new Set();
      first[grammar.terminals[i]].add(grammar.terminals[i]);
    }
    first[Grammar.EPSILON] = new Set();
    first[Grammar.EPSILON].add(Grammar.EPSILON);

    var changed = true;
    var round = 0;

    while (changed) {
      changed = false;
      round++;
      var roundChanges = [];

      for (i = 0; i < grammar.productions.length; i++) {
        var prod = grammar.productions[i];
        var A = prod.left;
        var oldSize = first[A].size;

        var rhsFirst = firstOfString(prod.right, first, grammar);
        var added = new Set();
        rhsFirst.forEach(function (sym) {
          if (!first[A].has(sym)) {
            first[A].add(sym);
            added.add(sym);
          }
        });

        if (first[A].size > oldSize) {
          changed = true;
          roundChanges.push({
            production: prod,
            nonTerminal: A,
            added: Array.from(added),
            currentFirst: Array.from(first[A]),
          });
        }
      }

      if (roundChanges.length > 0) {
        steps.push({
          round: round,
          changes: roundChanges,
          snapshot: deepCopyFirst(first, grammar),
        });
      }
    }

    return { first: first, steps: steps };
  }

  function firstOfString(symbols, first, grammar) {
    var result = new Set();

    if (symbols.length === 1 && symbols[0] === Grammar.EPSILON) {
      result.add(Grammar.EPSILON);
      return result;
    }

    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      var symFirst = first[sym] || new Set();

      symFirst.forEach(function (s) {
        if (s !== Grammar.EPSILON) {
          result.add(s);
        }
      });

      if (!symFirst.has(Grammar.EPSILON)) {
        break;
      }

      if (i === symbols.length - 1) {
        result.add(Grammar.EPSILON);
      }
    }

    return result;
  }

  function computeFollow(grammar, first) {
    var follow = {};
    var steps = [];
    var i;

    for (i = 0; i < grammar.nonTerminals.length; i++) {
      follow[grammar.nonTerminals[i]] = new Set();
    }

    follow[grammar.startSymbol].add(Grammar.END_MARKER);

    steps.push({
      round: 0,
      changes: [
        {
          nonTerminal: grammar.startSymbol,
          reason:
            "开始符号 " + grammar.startSymbol + " 的 FOLLOW 集初始化为 { # }",
          added: [Grammar.END_MARKER],
          currentFollow: Array.from(follow[grammar.startSymbol]),
        },
      ],
      snapshot: deepCopyFollow(follow, grammar),
    });

    var changed = true;
    var round = 0;

    while (changed) {
      changed = false;
      round++;
      var roundChanges = [];

      for (i = 0; i < grammar.productions.length; i++) {
        var prod = grammar.productions[i];
        var A = prod.left;

        for (var j = 0; j < prod.right.length; j++) {
          var B = prod.right[j];

          if (!grammar.isNonTerminal(B)) continue;

          var beta = prod.right.slice(j + 1);
          var betaFirst = new Set();

          if (beta.length === 0) {
            betaFirst.add(Grammar.EPSILON);
          } else {
            betaFirst = firstOfString(beta, first, grammar);
          }

          var oldSize = follow[B].size;
          var added = new Set();

          betaFirst.forEach(function (sym) {
            if (sym !== Grammar.EPSILON && !follow[B].has(sym)) {
              follow[B].add(sym);
              added.add(sym);
            }
          });

          if (betaFirst.has(Grammar.EPSILON)) {
            follow[A].forEach(function (sym) {
              if (!follow[B].has(sym)) {
                follow[B].add(sym);
                added.add(sym);
              }
            });
          }

          if (follow[B].size > oldSize) {
            changed = true;
            var reason;
            if (beta.length === 0) {
              reason =
                grammar.productionToString(prod) +
                " 中 " +
                B +
                " 后无符号，FOLLOW(" +
                A +
                ") ⊆ FOLLOW(" +
                B +
                ")";
            } else if (betaFirst.has(Grammar.EPSILON)) {
              reason =
                grammar.productionToString(prod) +
                " 中 FIRST(" +
                beta.join(" ") +
                ") 含 ε，FOLLOW(" +
                A +
                ") ⊆ FOLLOW(" +
                B +
                ")";
            } else {
              reason =
                grammar.productionToString(prod) +
                " 中 FIRST(" +
                beta.join(" ") +
                ") \\ {ε} ⊆ FOLLOW(" +
                B +
                ")";
            }
            roundChanges.push({
              production: prod,
              nonTerminal: B,
              reason: reason,
              added: Array.from(added),
              currentFollow: Array.from(follow[B]),
            });
          }
        }
      }

      if (roundChanges.length > 0) {
        steps.push({
          round: round,
          changes: roundChanges,
          snapshot: deepCopyFollow(follow, grammar),
        });
      }
    }

    return { follow: follow, steps: steps };
  }

  function deepCopyFirst(first, grammar) {
    var copy = {};
    grammar.nonTerminals.forEach(function (nt) {
      copy[nt] = Array.from(first[nt]);
    });
    return copy;
  }

  function deepCopyFollow(follow, grammar) {
    var copy = {};
    grammar.nonTerminals.forEach(function (nt) {
      copy[nt] = Array.from(follow[nt]);
    });
    return copy;
  }

  return {
    computeFirst: computeFirst,
    computeFollow: computeFollow,
    firstOfString: firstOfString,
  };
})();
