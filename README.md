# Compiler GUI

面向编译原理课程实验的可视化工具。项目使用 React + TypeScript + Vite + Tailwind 构建，核心算法与 UI 展示分离，便于继续扩展新的文法分析模块。

## 功能

- FIRST / FOLLOW 集合计算
  - 展示最终集合
  - 支持逐步查看集合扩展过程
- LL(1) 分析
  - 构造预测分析表
  - 展示用到的 FIRST / FOLLOW
  - 点击表项查看填入依据
  - 展示预测分析栈过程
- LR(0) 项目集族
  - 展示增广文法、closure、goto
  - 构造识别活前缀的 DFA
  - 支持最终结果和逐步构造两种视图
- LR(1) 项目集族与分析表
  - 展示拓展文法及产生式编号
  - 展示 FIRST(βa) 传播过程
  - 构造 LR(1) 项目集族和活前缀 DFA
  - 构造 ACTION / GOTO 表，归约项使用 r1、r2 等编号

## 技术栈

- TypeScript
- React
- Vite
- Tailwind CSS
- Zustand
- React Flow

## 快速开始

```bash
pnpm install
pnpm dev
```

默认开发服务地址：

```text
http://127.0.0.1:5173
```

生产构建：

```bash
pnpm build
```

本地预览构建结果：

```bash
pnpm preview
```

## 文法输入格式

每行输入一条产生式，左部必须是一个非终结符，右部符号用空格分隔。

```text
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id
```

说明：

- 产生式箭头支持 `->` 和 `::=`。
- 多个候选式使用 `|` 分隔。
- 空串使用 `ε`。
- 终结符和非终结符都按空格切分，因此 `id`、`+`、`E'` 等应作为独立符号书写。

## 项目结构

```text
src/
  core/                 # 纯算法实现
    grammar.ts          # 文法解析、FIRST/FOLLOW
    ll1.ts              # LL(1) 构表与预测分析
    lr0.ts              # LR(0) 项目集族与 DFA
    lr1.ts              # LR(1) 项目集族、DFA、ACTION/GOTO 表
  features/             # 功能页面
    firstFollow/
    ll1/
    lr0/
    lr1/
    home/
  components/           # 通用组件
  store/                # Zustand 状态
```

## 设计约定

- 核心算法不依赖 React 组件。
- UI 只消费核心层输出的数据结构。
- 所有算法尽量输出可追踪的步骤数据，用于最终结果和逐步演示两种视图。
- 新功能优先复用 `src/core/grammar.ts` 中的文法解析和集合计算能力。
