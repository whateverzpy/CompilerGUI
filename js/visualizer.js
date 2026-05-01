var Visualizer = (function () {

  function renderParseTree(containerId, nodes, edges) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (nodes.length === 0) {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-base-content/50">暂无语法树</div>';
      return;
    }

    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };

    var options = {
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          nodeSpacing: 80,
          levelSeparation: 80,
          treeSpacing: 100
        }
      },
      edges: {
        smooth: {
          type: 'cubicBezier',
          forceDirection: 'vertical',
          roundness: 0.4
        },
        arrows: {
          to: false
        },
        color: {
          color: '#6b7280',
          highlight: '#6366f1'
        },
        width: 2
      },
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          size: 14,
          face: 'monospace'
        },
        margin: 8,
        padding: 8
      },
      physics: {
        enabled: false
      },
      interaction: {
        zoomView: true,
        dragView: true,
        hover: true
      }
    };

    var network = new vis.Network(container, data, options);

    setTimeout(function () {
      network.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeInOutQuad'
        }
      });
    }, 100);

    return network;
  }

  function renderSetTable(containerId, sets, grammar, type) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '<table class="table table-zebra table-pin-rows">';
    html += '<thead><tr><th>' + (type === 'FIRST' ? '非终结符' : '非终结符') + '</th><th>' + type + ' 集</th></tr></thead>';
    html += '<tbody>';

    grammar.nonTerminals.forEach(function (nt) {
      var setArr = Array.from(sets[nt] || []);
      var formattedSet = setArr.map(function (s) {
        return grammar.formatSymbol(s);
      }).join(', ');
      html += '<tr>';
      html += '<td class="font-semibold">' + grammar.formatSymbol(nt) + '</td>';
      html += '<td>{ ' + formattedSet + ' }</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderParsingTable(containerId, tableResult, grammar) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var table = tableResult.table;
    var terminals = tableResult.terminals;

    var html = '<table class="table table-zebra table-pin-rows text-sm">';
    html += '<thead><tr><th></th>';
    terminals.forEach(function (t) {
      html += '<th class="text-center">' + escapeHtml(t) + '</th>';
    });
    html += '</tr></thead>';
    html += '<tbody>';

    grammar.nonTerminals.forEach(function (nt) {
      html += '<tr>';
      html += '<td class="font-semibold">' + escapeHtml(nt) + '</td>';
      terminals.forEach(function (t) {
        var prod = table[nt] && table[nt][t];
        var cellClass = '';
        var cellContent = '';

        if (prod) {
          var rhs = prod.right.join(' ');
          if (rhs === Grammar.EPSILON) rhs = Grammar.EPSILON;
          cellContent = escapeHtml(prod.left) + ' → ' + escapeHtml(rhs);
          cellClass = 'bg-primary/10';
        }

        var isConflict = tableResult.conflicts.some(function (c) {
          return c.nonTerminal === nt && c.terminal === t;
        });
        if (isConflict) {
          cellClass = 'table-cell-conflict';
        }

        html += '<td class="text-center ' + cellClass + '">';
        html += '<span class="table-cell-production">' + cellContent + '</span>';
        html += '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderParseSteps(containerId, steps) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '<table class="table table-zebra table-pin-rows text-xs">';
    html += '<thead><tr><th>步骤</th><th>栈</th><th>输入</th><th>动作</th></tr></thead>';
    html += '<tbody>';

    steps.forEach(function (step, idx) {
      var rowClass = '';
      if (step.error) rowClass = 'bg-error/20';
      else if (step.accept) rowClass = 'bg-success/20';
      else if (idx === steps.length - 1) rowClass = 'parse-step-current';

      html += '<tr class="' + rowClass + '">';
      html += '<td>' + step.step + '</td>';
      html += '<td class="font-mono">' + escapeHtml(step.stack) + '</td>';
      html += '<td class="font-mono">' + escapeHtml(step.input) + '</td>';
      html += '<td>' + escapeHtml(step.action) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  return {
    renderParseTree: renderParseTree,
    renderSetTable: renderSetTable,
    renderParsingTable: renderParsingTable,
    renderParseSteps: renderParseSteps
  };
})();
