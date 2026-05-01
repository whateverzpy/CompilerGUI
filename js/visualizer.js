var Visualizer = (function () {

  function renderParseTree(containerId, nodes, edges) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    container.style.height = "600px";
    container.style.minHeight = "600px";

    if (nodes.length === 0) {
      container.innerHTML =
        '<div class="flex items-center justify-center h-full text-base-content/50">暂无语法树</div>';
      return;
    }

    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges),
    };

    var options = {
      layout: {
        hierarchical: {
          direction: "UD",
          sortMethod: "directed",
          nodeSpacing: 120,
          levelSeparation: 100,
          treeSpacing: 150,
        },
      },
      edges: {
        smooth: {
          type: "cubicBezier",
          forceDirection: "vertical",
          roundness: 0.4,
        },
        arrows: {
          to: false,
        },
        color: {
          color: "#6b7280",
          highlight: "#6366f1",
        },
        width: 2,
      },
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          size: 18,
          face: "monospace",
        },
        margin: 12,
        padding: 10,
      },
      physics: {
        enabled: false,
      },
      interaction: {
        zoomView: true,
        dragView: true,
        hover: true,
      },
    };

    var network = new vis.Network(container, data, options);

    setTimeout(function () {
      network.fit({
        animation: {
          duration: 500,
          easingFunction: "easeInOutQuad",
        },
      });
    }, 100);

    return network;
  }

  function renderSetTable(containerId, sets, grammar, type) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '<table class="table table-zebra table-pin-rows">';
    html +=
      "<thead><tr><th>" +
      (type === "FIRST" ? "非终结符" : "非终结符") +
      "</th><th>" +
      type +
      " 集</th></tr></thead>";
    html += "<tbody>";

    grammar.nonTerminals.forEach(function (nt) {
      var setArr = Array.from(sets[nt] || []);
      var formattedSet = setArr
        .map(function (s) {
          return grammar.formatSymbol(s);
        })
        .join(", ");
      html += "<tr>";
      html += '<td class="font-semibold">' + grammar.formatSymbol(nt) + "</td>";
      html += "<td>{ " + formattedSet + " }</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  function renderParsingTable(containerId, tableResult, grammar) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var table = tableResult.table;
    var terminals = tableResult.terminals;

    var html = '<table class="table table-zebra table-pin-rows text-sm">';
    html += "<thead><tr><th></th>";
    terminals.forEach(function (t) {
      html += '<th class="text-center">' + escapeHtml(t) + "</th>";
    });
    html += "</tr></thead>";
    html += "<tbody>";

    grammar.nonTerminals.forEach(function (nt) {
      html += "<tr>";
      html += '<td class="font-semibold">' + escapeHtml(nt) + "</td>";
      terminals.forEach(function (t) {
        var prod = table[nt] && table[nt][t];
        var cellClass = "";
        var cellContent = "";

        if (prod) {
          var rhs = prod.right.join(" ");
          if (rhs === Grammar.EPSILON) rhs = Grammar.EPSILON;
          cellContent = escapeHtml(prod.left) + " → " + escapeHtml(rhs);
          cellClass = "bg-primary/10 cursor-pointer hover:bg-primary/20";
        }

        var isConflict = tableResult.conflicts.some(function (c) {
          return c.nonTerminal === nt && c.terminal === t;
        });
        if (isConflict) {
          cellClass = "table-cell-conflict cursor-pointer hover:bg-error/30";
        }

        html += '<td class="text-center ' + cellClass + '"';
        if (prod) {
          html += ' data-nt="' + escapeAttr(nt) + '" data-t="' + escapeAttr(t) + '"';
        }
        html += ">";
        html +=
          '<span class="table-cell-production">' + cellContent + "</span>";
        html += "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    container.querySelectorAll("td[data-nt]").forEach(function (td) {
      td.addEventListener("click", function () {
        var nt = this.getAttribute("data-nt");
        var t = this.getAttribute("data-t");
        showCellInfo(nt, t);
      });
    });
  }

  function escapeAttr(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showCellInfo(nonTerminal, terminal) {
    var tableInfo = window.currentTableInfo;
    var grammar = window.currentGrammar;
    var firstResult = window.currentFirstResult;
    var followResult = window.currentFollowResult;

    var info = tableInfo && tableInfo[nonTerminal] && tableInfo[nonTerminal][terminal];

    var modal = document.getElementById("cellInfoModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "cellInfoModal";
      modal.className = "modal modal-open";
      modal.innerHTML =
        '<div class="modal-box max-w-2xl">' +
        '<h3 class="font-bold text-lg mb-4"></h3>' +
        '<div id="cellInfoContent"></div>' +
        '<div class="modal-action">' +
        '<button class="btn" onclick="Visualizer.closeCellInfo()">关闭</button>' +
        "</div>" +
        "</div>";
      document.body.appendChild(modal);
    } else {
      modal.classList.add("modal-open");
    }

    modal.querySelector("h3").textContent = "M[" + nonTerminal + ", " + terminal + "] 填表依据";

    var content = document.getElementById("cellInfoContent");

    if (info) {
      renderCellInfoFromTableInfo(content, info, nonTerminal, terminal);
    } else {
      renderCellInfoFromGrammar(content, nonTerminal, terminal, grammar, firstResult, followResult);
    }
  }

  function renderCellInfoFromTableInfo(content, info, nonTerminal, terminal) {
    var prod = info.production;
    var rhs = prod.right.join(" ");
    if (rhs === Grammar.EPSILON) rhs = Grammar.EPSILON;

    var html = '<div class="space-y-4">';

    html += '<div class="alert alert-info">';
    html += '<div class="flex-1">';
    html += '<div class="text-sm opacity-70">产生式</div>';
    html += '<div class="text-lg font-mono font-bold">' + escapeHtml(prod.left) + ' → ' + escapeHtml(rhs) + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="card bg-base-200">';
    html += '<div class="card-body p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">填表规则: <span class="badge badge-' + (info.ruleType === 'FIRST' ? 'secondary' : 'accent') + '">' + info.ruleType + ' 规则</span></h4>';
    html += '<p class="text-sm">' + escapeHtml(info.reason) + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="card bg-base-200">';
    html += '<div class="card-body p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">详细说明</h4>';
    html += '<p class="text-sm">' + escapeHtml(info.detail) + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="grid grid-cols-2 gap-4">';
    html += '<div class="card bg-base-200">';
    html += '<div class="card-body p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">FIRST(' + escapeHtml(prod.right.join(' ')) + ')</h4>';
    html += '<div class="flex flex-wrap gap-1">';
    info.firstSet.forEach(function(s) {
      var badgeClass = s === Grammar.EPSILON ? 'badge-warning' : 'badge-primary';
      html += '<span class="badge badge-sm ' + badgeClass + '">' + escapeHtml(s) + '</span>';
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';

    if (info.followSet) {
      html += '<div class="card bg-base-200">';
      html += '<div class="card-body p-4">';
      html += '<h4 class="font-semibold text-sm mb-2">FOLLOW(' + escapeHtml(nonTerminal) + ')</h4>';
      html += '<div class="flex flex-wrap gap-1">';
      info.followSet.forEach(function(s) {
        html += '<span class="badge badge-sm badge-accent">' + escapeHtml(s) + '</span>';
      });
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '</div>';

    content.innerHTML = html;
  }

  function renderCellInfoFromGrammar(content, nonTerminal, terminal, grammar, firstResult, followResult) {
    var table = window.currentTable;
    var prod = table && table[nonTerminal] && table[nonTerminal][terminal];

    if (!prod) {
      content.innerHTML = '<div class="alert alert-error">无法获取该单元格的信息</div>';
      return;
    }

    var rhs = prod.right.join(" ");
    if (rhs === Grammar.EPSILON) rhs = Grammar.EPSILON;

    var alphaFirst = firstResult && firstResult.first ? FirstFollow.firstOfString(prod.right, firstResult.first, grammar) : new Set();
    var alphaFirstArr = Array.from(alphaFirst);
    var followArr = followResult && followResult.follow && followResult.follow[nonTerminal] ? Array.from(followResult.follow[nonTerminal]) : [];

    var ruleType = "FIRST";
    var reason = "";
    var detail = "";

    if (alphaFirst.has(terminal)) {
      ruleType = "FIRST";
      reason = terminal + " ∈ FIRST(" + rhs + ") = { " + alphaFirstArr.filter(function(s) { return s !== Grammar.EPSILON; }).join(", ") + " }";
      detail = "由于 " + terminal + " ∈ FIRST(" + rhs + ")，根据规则：对产生式 A → α，若 a ∈ FIRST(α) 且 a ≠ ε，则 M[A, a] = A → α";
    } else if (alphaFirst.has(Grammar.EPSILON) && followArr.indexOf(terminal) !== -1) {
      ruleType = "FOLLOW";
      reason = "ε ∈ FIRST(" + rhs + ") 且 " + terminal + " ∈ FOLLOW(" + nonTerminal + ")";
      detail = "由于 ε ∈ FIRST(" + rhs + ")，且 " + terminal + " ∈ FOLLOW(" + nonTerminal + ")，根据规则：若 ε ∈ FIRST(α)，则对每个 b ∈ FOLLOW(A)，M[A, b] = A → α";
    }

    var html = '<div class="space-y-4">';

    html += '<div class="alert alert-info">';
    html += '<div class="flex-1">';
    html += '<div class="text-sm opacity-70">产生式</div>';
    html += '<div class="text-lg font-mono font-bold">' + escapeHtml(prod.left) + ' → ' + escapeHtml(rhs) + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="card bg-base-200">';
    html += '<div class="card-body p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">填表规则: <span class="badge badge-' + (ruleType === 'FIRST' ? 'secondary' : 'accent') + '">' + ruleType + ' 规则</span></h4>';
    html += '<p class="text-sm">' + escapeHtml(reason) + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="card bg-base-200">';
    html += '<div class="card-body p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">详细说明</h4>';
    html += '<p class="text-sm">' + escapeHtml(detail) + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="grid grid-cols-2 gap-4">';
    html += '<div class="card bg-base-200">';
    html += '<div class="card-body p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">FIRST(' + escapeHtml(rhs) + ')</h4>';
    html += '<div class="flex flex-wrap gap-1">';
    alphaFirstArr.forEach(function(s) {
      var badgeClass = s === Grammar.EPSILON ? 'badge-warning' : 'badge-primary';
      html += '<span class="badge badge-sm ' + badgeClass + '">' + escapeHtml(s) + '</span>';
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';

    if (alphaFirst.has(Grammar.EPSILON)) {
      html += '<div class="card bg-base-200">';
      html += '<div class="card-body p-4">';
      html += '<h4 class="font-semibold text-sm mb-2">FOLLOW(' + escapeHtml(nonTerminal) + ')</h4>';
      html += '<div class="flex flex-wrap gap-1">';
      followArr.forEach(function(s) {
        html += '<span class="badge badge-sm badge-accent">' + escapeHtml(s) + '</span>';
      });
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '</div>';

    content.innerHTML = html;
  }

  function closeCellInfo() {
    var modal = document.getElementById("cellInfoModal");
    if (modal) {
      modal.classList.remove("modal-open");
    }
  }

  function renderParseSteps(containerId, steps) {
    renderParseStepsWithHighlight(containerId, steps, -1);
  }

  function renderParseStepsWithHighlight(containerId, steps, highlightIndex) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html =
      '<table class="table table-zebra table-pin-rows text-xs">';
    html += "<thead><tr><th>步骤</th><th>栈</th><th>输入</th><th>动作</th></tr></thead>";
    html += "<tbody>";

    steps.forEach(function (step, idx) {
      var rowClass = "";
      if (step.error) rowClass = "bg-error/20";
      else if (step.accept) rowClass = "bg-success/20";
      else if (idx === highlightIndex) rowClass = "step-row-highlight";

      html += '<tr class="' + rowClass + '">';
      html += "<td>" + step.step + "</td>";
      html += '<td class="font-mono">' + escapeHtml(step.stack) + "</td>";
      html += '<td class="font-mono">' + escapeHtml(step.input) + "</td>";
      html += "<td>" + escapeHtml(step.action) + "</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  return {
    renderParseTree: renderParseTree,
    renderSetTable: renderSetTable,
    renderParsingTable: renderParsingTable,
    renderParseSteps: renderParseSteps,
    renderParseStepsWithHighlight: renderParseStepsWithHighlight,
    showCellInfo: showCellInfo,
    closeCellInfo: closeCellInfo,
  };
})();
