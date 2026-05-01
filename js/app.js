(function () {
  var grammar = null;
  var firstResult = null;
  var followResult = null;
  var tableResult = null;
  var parseResult = null;
  var parseStepIndex = -1;
  var parseTimer = null;

  var elGrammarInput = document.getElementById('grammarInput');
  var elBtnAnalyze = document.getElementById('btnAnalyze');
  var elBtnExample = document.getElementById('btnExample');
  var elBtnClear = document.getElementById('btnClear');
  var elBtnFirst = document.getElementById('btnFirst');
  var elBtnFollow = document.getElementById('btnFollow');
  var elBtnTable = document.getElementById('btnTable');
  var elBtnAll = document.getElementById('btnAll');
  var elInputString = document.getElementById('inputString');
  var elBtnParse = document.getElementById('btnParse');
  var elBtnParseStep = document.getElementById('btnParseStep');
  var elBtnParseReset = document.getElementById('btnParseReset');
  var elThemeToggle = document.getElementById('themeToggle');

  var elGrammarDisplay = document.getElementById('grammarDisplay');
  var elFirstSteps = document.getElementById('firstSteps');
  var elFirstResult = document.getElementById('firstResult');
  var elFollowSteps = document.getElementById('followSteps');
  var elFollowResult = document.getElementById('followResult');
  var elTableResult = document.getElementById('tableResult');
  var elTableConflict = document.getElementById('tableConflict');
  var elParseSteps = document.getElementById('parseSteps');
  var elParseTree = document.getElementById('parseTree');

  var sectionGrammar = document.getElementById('sectionGrammar');
  var sectionFirst = document.getElementById('sectionFirst');
  var sectionFollow = document.getElementById('sectionFollow');
  var sectionTable = document.getElementById('sectionTable');
  var sectionParse = document.getElementById('sectionParse');

  var exampleGrammars = [
    "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
    "S -> A a | b\nA -> b d A' | ε\nA' -> c A' | ε",
    "E -> T E'\nE' -> + E | ε\nT -> F T'\nT' -> T | ε\nF -> ( E ) | id"
  ];
  var currentExample = 0;

  elBtnExample.addEventListener('click', function () {
    elGrammarInput.value = exampleGrammars[currentExample];
    currentExample = (currentExample + 1) % exampleGrammars.length;
    showToast('已加载示例文法', 'info');
  });

  elBtnClear.addEventListener('click', function () {
    elGrammarInput.value = '';
    resetAll();
  });

  elBtnAnalyze.addEventListener('click', function () {
    analyzeGrammar();
  });

  elBtnFirst.addEventListener('click', function () {
    openSection(sectionFirst);
  });

  elBtnFollow.addEventListener('click', function () {
    openSection(sectionFollow);
  });

  elBtnTable.addEventListener('click', function () {
    openSection(sectionTable);
  });

  elBtnAll.addEventListener('click', function () {
    openSection(sectionGrammar);
    openSection(sectionFirst);
    openSection(sectionFollow);
    openSection(sectionTable);
  });

  elBtnParse.addEventListener('click', function () {
    startParse(false);
  });

  elBtnParseStep.addEventListener('click', function () {
    startParse(true);
  });

  elBtnParseReset.addEventListener('click', function () {
    resetParse();
  });

  elThemeToggle.addEventListener('change', function () {
    var html = document.documentElement;
    if (this.checked) {
      html.setAttribute('data-theme', 'light');
    } else {
      html.setAttribute('data-theme', 'dark');
    }
  });

  function analyzeGrammar() {
    try {
      grammar = new Grammar();
      grammar.parse(elGrammarInput.value);
    } catch (e) {
      showToast(e.message, 'error');
      return;
    }

    renderGrammarDisplay();

    firstResult = FirstFollow.computeFirst(grammar);
    renderFirstSteps();
    Visualizer.renderSetTable('firstResult', firstResult.first, grammar, 'FIRST');

    followResult = FirstFollow.computeFollow(grammar, firstResult.first);
    renderFollowSteps();
    Visualizer.renderSetTable('followResult', followResult.follow, grammar, 'FOLLOW');

    tableResult = ParsingTable.buildTable(grammar, firstResult.first, followResult.follow);
    Visualizer.renderParsingTable('tableResult', tableResult, grammar);
    renderConflictInfo();

    elBtnFirst.disabled = false;
    elBtnFollow.disabled = false;
    elBtnTable.disabled = false;
    elBtnAll.disabled = false;
    elInputString.disabled = false;
    elBtnParse.disabled = false;
    elBtnParseStep.disabled = false;
    elBtnParseReset.disabled = false;

    openSection(sectionGrammar);

    resetParse();

    showToast('文法分析完成！', 'success');
  }

  function renderGrammarDisplay() {
    var html = '<table class="table table-zebra">';
    html += '<thead><tr><th>编号</th><th>产生式</th></tr></thead>';
    html += '<tbody>';
    grammar.productions.forEach(function (prod) {
      html += '<tr>';
      html += '<td class="font-mono text-sm">(' + prod.index + ')</td>';
      html += '<td class="production-rule">' + grammar.formatProduction(prod) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    html += '<div class="mt-3 flex flex-wrap gap-2">';
    html += '<span class="badge badge-outline badge-primary">非终结符: ' + grammar.nonTerminals.map(function (nt) { return escapeHtml(nt); }).join(', ') + '</span>';
    html += '<span class="badge badge-outline badge-secondary">终结符: ' + grammar.terminals.map(function (t) { return escapeHtml(t); }).join(', ') + '</span>';
    html += '<span class="badge badge-outline badge-accent">开始符号: ' + escapeHtml(grammar.startSymbol) + '</span>';
    html += '</div>';

    elGrammarDisplay.innerHTML = html;
  }

  function renderFirstSteps() {
    var steps = firstResult.steps;
    var html = '';

    steps.forEach(function (step) {
      html += '<div class="collapse collapse-arrow bg-base-200">';
      html += '<input type="checkbox" />';
      html += '<div class="collapse-title text-sm font-medium">';
      html += '第 ' + step.round + ' 轮迭代';
      html += ' <span class="badge badge-sm badge-ghost">' + step.changes.length + ' 处变更</span>';
      html += '</div>';
      html += '<div class="collapse-content">';

      step.changes.forEach(function (change) {
        html += '<div class="mb-2 p-2 rounded-lg bg-base-100 step-highlight">';
        html += '<div class="text-sm">';
        html += '<span class="nonterminal">' + escapeHtml(change.nonTerminal) + '</span>: ';
        html += '应用产生式 <span class="production-rule">' + grammar.formatProduction(change.production) + '</span>';
        html += '</div>';
        html += '<div class="text-xs mt-1">';
        html += '新增: ';
        change.added.forEach(function (sym) {
          html += '<span class="set-tag set-tag-new">' + escapeHtml(sym) + '</span>';
        });
        html += '</div>';
        html += '<div class="text-xs mt-1 text-base-content/60">';
        html += 'FIRST(' + escapeHtml(change.nonTerminal) + ') = { ' + change.currentFirst.map(function (s) { return escapeHtml(s); }).join(', ') + ' }';
        html += '</div>';
        html += '</div>';
      });

      html += '<div class="mt-2 p-2 rounded bg-base-300/50">';
      html += '<div class="text-xs font-semibold mb-1">本轮快照</div>';
      html += '<div class="grid grid-cols-2 gap-1 text-xs">';
      for (var nt in step.snapshot) {
        html += '<div>FIRST(' + escapeHtml(nt) + ') = { ' + step.snapshot[nt].map(function (s) { return escapeHtml(s); }).join(', ') + ' }</div>';
      }
      html += '</div></div>';

      html += '</div></div>';
    });

    elFirstSteps.innerHTML = html;
  }

  function renderFollowSteps() {
    var steps = followResult.steps;
    var html = '';

    steps.forEach(function (step) {
      html += '<div class="collapse collapse-arrow bg-base-200">';
      html += '<input type="checkbox" />';
      html += '<div class="collapse-title text-sm font-medium">';
      if (step.round === 0) {
        html += '初始化';
      } else {
        html += '第 ' + step.round + ' 轮迭代';
      }
      html += ' <span class="badge badge-sm badge-ghost">' + step.changes.length + ' 处变更</span>';
      html += '</div>';
      html += '<div class="collapse-content">';

      step.changes.forEach(function (change) {
        html += '<div class="mb-2 p-2 rounded-lg bg-base-100 step-highlight">';
        html += '<div class="text-sm">';
        html += '<span class="nonterminal">' + escapeHtml(change.nonTerminal) + '</span>: ';
        html += escapeHtml(change.reason);
        html += '</div>';
        html += '<div class="text-xs mt-1">';
        html += '新增: ';
        change.added.forEach(function (sym) {
          html += '<span class="set-tag set-tag-new">' + escapeHtml(sym) + '</span>';
        });
        html += '</div>';
        html += '<div class="text-xs mt-1 text-base-content/60">';
        html += 'FOLLOW(' + escapeHtml(change.nonTerminal) + ') = { ' + change.currentFollow.map(function (s) { return escapeHtml(s); }).join(', ') + ' }';
        html += '</div>';
        html += '</div>';
      });

      html += '<div class="mt-2 p-2 rounded bg-base-300/50">';
      html += '<div class="text-xs font-semibold mb-1">本轮快照</div>';
      html += '<div class="grid grid-cols-2 gap-1 text-xs">';
      for (var nt in step.snapshot) {
        html += '<div>FOLLOW(' + escapeHtml(nt) + ') = { ' + step.snapshot[nt].map(function (s) { return escapeHtml(s); }).join(', ') + ' }</div>';
      }
      html += '</div></div>';

      html += '</div></div>';
    });

    elFollowSteps.innerHTML = html;
  }

  function renderConflictInfo() {
    var conflicts = tableResult.conflicts;
    if (conflicts.length === 0) {
      elTableConflict.innerHTML = '<div class="alert alert-success"><span>✓ 该文法是 LL(1) 文法，无冲突</span></div>';
    } else {
      var html = '<div class="alert alert-error"><span>✗ 该文法不是 LL(1) 文法，存在 ' + conflicts.length + ' 处冲突</span></div>';
      html += '<div class="mt-2 space-y-1">';
      conflicts.forEach(function (c) {
        var existingRhs = c.existing.right.join(' ');
        if (existingRhs === Grammar.EPSILON) existingRhs = Grammar.EPSILON;
        var conflictRhs = c.conflict.right.join(' ');
        if (conflictRhs === Grammar.EPSILON) conflictRhs = Grammar.EPSILON;
        html += '<div class="text-sm p-2 rounded bg-error/10">';
        html += '<span class="font-semibold">' + c.type + '</span>: M[' + escapeHtml(c.nonTerminal) + ', ' + escapeHtml(c.terminal) + ']';
        html += '<br>已有: ' + escapeHtml(c.existing.left) + ' → ' + escapeHtml(existingRhs);
        html += '<br>冲突: ' + escapeHtml(c.conflict.left) + ' → ' + escapeHtml(conflictRhs);
        html += '</div>';
      });
      html += '</div>';
      elTableConflict.innerHTML = html;
    }
  }

  function startParse(stepping) {
    var inputStr = elInputString.value.trim();
    if (!inputStr) {
      showToast('请输入要分析的字符串', 'warning');
      return;
    }

    if (!tableResult) {
      showToast('请先进行文法分析', 'warning');
      return;
    }

    openSection(sectionParse);

    parseResult = ParsingTable.simulateParse(grammar, tableResult.table, inputStr);

    if (stepping) {
      parseStepIndex = -1;
      elParseSteps.innerHTML = '';
      Visualizer.renderParseTree('parseTree', [], []);
      stepForward();
    } else {
      Visualizer.renderParseSteps('parseSteps', parseResult.steps);
      Visualizer.renderParseTree('parseTree', parseResult.treeNodes, parseResult.treeEdges);

      if (parseResult.success) {
        showToast('分析成功！输入串被接受', 'success');
      } else {
        showToast('分析失败！输入串被拒绝', 'error');
      }
    }
  }

  function stepForward() {
    if (!parseResult || parseStepIndex >= parseResult.steps.length - 1) {
      showToast('分析已完成', 'info');
      return;
    }

    parseStepIndex++;
    var stepsToShow = parseResult.steps.slice(0, parseStepIndex + 1);
    Visualizer.renderParseSteps('parseSteps', stepsToShow);

    var currentStep = parseResult.steps[parseStepIndex];
    var partialNodes = parseResult.treeNodes.slice();
    var partialEdges = parseResult.treeEdges.slice();

    Visualizer.renderParseTree('parseTree', partialNodes, partialEdges);

    if (parseStepIndex >= parseResult.steps.length - 1) {
      if (parseResult.success) {
        showToast('分析成功！输入串被接受', 'success');
      } else {
        showToast('分析失败！输入串被拒绝', 'error');
      }
    }
  }

  elBtnParseStep.addEventListener('click', function () {
    if (parseResult && parseStepIndex < parseResult.steps.length - 1) {
      stepForward();
    } else {
      startParse(true);
    }
  });

  function resetParse() {
    parseResult = null;
    parseStepIndex = -1;
    if (parseTimer) {
      clearInterval(parseTimer);
      parseTimer = null;
    }
    elParseSteps.innerHTML = '<div class="text-center text-base-content/50 py-4">输入字符串后点击"开始分析"</div>';
    elParseTree.innerHTML = '<div class="flex items-center justify-center h-full text-base-content/50">暂无语法树</div>';
  }

  function resetAll() {
    grammar = null;
    firstResult = null;
    followResult = null;
    tableResult = null;

    elBtnFirst.disabled = true;
    elBtnFollow.disabled = true;
    elBtnTable.disabled = true;
    elBtnAll.disabled = true;
    elInputString.disabled = true;
    elBtnParse.disabled = true;
    elBtnParseStep.disabled = true;
    elBtnParseReset.disabled = true;

    elGrammarDisplay.innerHTML = '';
    elFirstSteps.innerHTML = '';
    elFirstResult.innerHTML = '';
    elFollowSteps.innerHTML = '';
    elFollowResult.innerHTML = '';
    elTableResult.innerHTML = '';
    elTableConflict.innerHTML = '';

    closeSection(sectionGrammar);
    closeSection(sectionFirst);
    closeSection(sectionFollow);
    closeSection(sectionTable);
    closeSection(sectionParse);

    resetParse();
  }

  function openSection(section) {
    var checkbox = section.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      section.classList.add('collapse-open');
    }
  }

  function closeSection(section) {
    var checkbox = section.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      checkbox.checked = false;
      section.classList.remove('collapse-open');
    }
  }

  function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    var alertClass = 'alert-info';
    if (type === 'success') alertClass = 'alert-success';
    else if (type === 'error') alertClass = 'alert-error';
    else if (type === 'warning') alertClass = 'alert-warning';

    var toast = document.createElement('div');
    toast.className = 'alert ' + alertClass + ' shadow-lg text-sm';
    toast.innerHTML = '<span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
})();
