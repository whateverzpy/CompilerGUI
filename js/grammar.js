var Grammar = (function () {
  function Grammar() {
    this.productions = [];
    this.nonTerminals = [];
    this.terminals = [];
    this.startSymbol = null;
    this.symbols = [];
  }

  Grammar.EPSILON = "ε";
  Grammar.END_MARKER = "#";

  Grammar.prototype.parse = function (text) {
    this.productions = [];
    this.nonTerminals = [];
    this.terminals = [];
    this.startSymbol = null;
    this.symbols = [];

    var lines = text.trim().split("\n");
    var nonTerminalSet = new Set();
    var terminalSet = new Set();
    var productionList = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var parts = line.split(/->|→/);
      if (parts.length < 2) {
        throw new Error(
          "第 " + (i + 1) + ' 行格式错误: "' + line + '"\n请使用 A -> α 格式',
        );
      }

      var left = parts[0].trim();
      if (!left) {
        throw new Error("第 " + (i + 1) + " 行: 产生式左部为空");
      }

      nonTerminalSet.add(left);

      var rightPart = parts.slice(1).join("->").trim();
      var alternatives = rightPart.split("|");

      for (var j = 0; j < alternatives.length; j++) {
        var alt = alternatives[j].trim();
        var symbols = alt ? alt.split(/\s+/) : [Grammar.EPSILON];
        productionList.push({
          left: left,
          right: symbols,
          index: productionList.length,
        });
      }
    }

    if (productionList.length === 0) {
      throw new Error("未输入任何产生式");
    }

    this.startSymbol = productionList[0].left;

    for (var i = 0; i < productionList.length; i++) {
      var prod = productionList[i];
      for (var j = 0; j < prod.right.length; j++) {
        var sym = prod.right[j];
        if (sym !== Grammar.EPSILON && !nonTerminalSet.has(sym)) {
          terminalSet.add(sym);
        }
      }
    }

    this.productions = productionList;
    this.nonTerminals = Array.from(nonTerminalSet);
    this.terminals = Array.from(terminalSet);
    this.symbols = this.nonTerminals.concat(this.terminals);

    return this;
  };

  Grammar.prototype.getProductionsOf = function (nonTerminal) {
    var result = [];
    for (var i = 0; i < this.productions.length; i++) {
      if (this.productions[i].left === nonTerminal) {
        result.push(this.productions[i]);
      }
    }
    return result;
  };

  Grammar.prototype.isNonTerminal = function (symbol) {
    return this.nonTerminals.indexOf(symbol) !== -1;
  };

  Grammar.prototype.isTerminal = function (symbol) {
    return this.terminals.indexOf(symbol) !== -1;
  };

  Grammar.prototype.isEpsilon = function (symbol) {
    return symbol === Grammar.EPSILON;
  };

  Grammar.prototype.productionToString = function (prod) {
    var right = prod.right.join(" ");
    if (right === Grammar.EPSILON) right = Grammar.EPSILON;
    return prod.left + " → " + right;
  };

  Grammar.prototype.formatSymbol = function (sym) {
    if (this.isNonTerminal(sym)) {
      return '<span class="nonterminal">' + escapeHtml(sym) + "</span>";
    } else if (sym === Grammar.EPSILON) {
      return '<span class="epsilon">' + Grammar.EPSILON + "</span>";
    } else if (sym === Grammar.END_MARKER) {
      return '<span class="terminal">' + escapeHtml(sym) + "</span>";
    } else {
      return '<span class="terminal">' + escapeHtml(sym) + "</span>";
    }
  };

  Grammar.prototype.formatProduction = function (prod) {
    var left = this.formatSymbol(prod.left);
    var rightParts = prod.right.map(
      function (s) {
        return this.formatSymbol(s);
      }.bind(this),
    );
    return (
      left + ' <span class="production-arrow">→</span> ' + rightParts.join(" ")
    );
  };

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  return Grammar;
})();
