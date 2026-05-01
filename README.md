# CompilerGUI - 编译原理可视化演示工具

一个基于 HTML + Tailwind CSS + DaisyUI + Vis.js 构建的编译原理关键过程可视化演示工具。

## 功能演示

### LL(1) 预测分析表构造

本项目第一个演示模块，完整展示 LL(1) 分析法的核心构造过程：

- **文法解析** - 支持标准产生式格式输入
- **FIRST 集计算** - 逐步展示迭代过程
- **FOLLOW 集计算** - 详细展示推导规则
- **LL(1) 分析表** - 可视化表格展示，冲突高亮
- **预测分析模拟** - 自动/单步执行模式
- **语法树可视化** - 交互式语法树绘制

## 技术栈

| 技术 | 用途 |
|------|------|
| HTML5 | 页面结构 |
| Tailwind CSS | 原子化 CSS 框架 |
| DaisyUI | UI 组件库 |
| Vis.js | 网络图可视化 |
| 原生 JavaScript | 核心逻辑实现 |

## 快速开始

### 方式一：直接打开

由于项目纯前端实现，直接在浏览器中打开 `index.html` 即可运行。

### 方式二：本地服务器

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js
npx http-server -p 8080

# 使用 PHP
php -S localhost:8080
```

然后访问 http://localhost:8080

## 使用说明

### 文法输入格式

```
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id
```

- 每行一条产生式
- 使用 `->` 或 `→` 分隔左右部
- 使用 `|` 分隔同一左部的多个候选式
- 使用 `ε` 表示空串

### 操作流程

1. **输入文法** - 在文本框中输入产生式规则
2. **开始分析** - 点击按钮进行文法分析
3. **查看步骤** - 依次展开 FIRST 集、FOLLOW 集、分析表
4. **模拟分析** - 输入测试串，观察预测分析过程

### 示例文法

项目内置三个示例文法，点击"示例文法"按钮循环切换：

1. 经典表达式文法（含左递归消除）
2. 简单 LL(1) 文法
3. 含公共左因子的文法

## 项目结构

```
CompilerGUI/
├── index.html           # 主页面
├── README.md            # 项目说明
├── css/
│   └── style.css        # 自定义样式
└── js/
    ├── grammar.js       # 文法解析与数据结构
    ├── first-follow.js  # FIRST/FOLLOW 集算法
    ├── parsing-table.js # LL(1) 分析表构造
    ├── visualizer.js    # 可视化渲染模块
    └── app.js           # 主应用逻辑
```

## 核心算法

### FIRST 集计算

```
对于终结符 a: FIRST(a) = {a}
对于非终结符 A:
  对每条产生式 A → α:
    将 FIRST(α) \ {ε} 加入 FIRST(A)
    若 ε ∈ FIRST(α)，继续处理下一符号
    若所有符号都可推导 ε，将 ε 加入 FIRST(A)
```

### FOLLOW 集计算

```
1. 将 $ 加入 FOLLOW(S)，S 为开始符号
2. 对每条产生式 A → αBβ:
   将 FIRST(β) \ {ε} 加入 FOLLOW(B)
3. 对每条产生式 A → αB 或 A → αBβ (ε ∈ FIRST(β)):
   将 FOLLOW(A) 加入 FOLLOW(B)
```

### LL(1) 分析表构造

```
对每条产生式 A → α:
  对每个终结符 a ∈ FIRST(α):
    M[A, a] = A → α
  若 ε ∈ FIRST(α):
    对每个终结符 b ∈ FOLLOW(A):
      M[A, b] = A → α
```

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 后续计划

- [ ] LR(0) 分析法演示
- [ ] SLR(1) 分析法演示
- [ ] LR(1) / LALR(1) 分析法演示
- [ ] 正则表达式到 NFA/DFA 转换
- [ ] 语法树抽象与中间代码生成

## 许可证

MIT License
