import { ArrowRight, Braces, GitBranch, Table2 } from 'lucide-react';
import { Button } from '../../components/Button';

export type PageKey = 'first-follow' | 'll1' | 'lr0' | 'lr1';

interface HomePageProps {
  onOpen: (page: PageKey) => void;
}

const features = [
  {
    id: 'first-follow' as const,
    title: 'FIRST / FOLLOW 可视化',
    description: '从产生式出发计算 FIRST 与 FOLLOW，支持最终结果总览和逐步推导回放。',
    icon: Braces,
    status: '已完成',
  },
  {
    id: 'll1' as const,
    title: 'LL(1) 分析表与分析过程',
    description: '复用 FIRST/FOLLOW 构造预测分析表，并追踪每个表项的填入依据。',
    icon: Table2,
    status: '新增',
  },
  {
    id: 'lr0' as const,
    title: 'LR(0) 项目集族构造',
    description: '构造 LR(0) 规范项目集族，展示 closure、goto 与活前缀 DFA。',
    icon: GitBranch,
    status: '新增',
  },
  {
    id: 'lr1' as const,
    title: 'LR(1) 项目集族与分析表',
    description: '展示 FIRST(βa) 传播、LR(1) 项目集族、活前缀 DFA 与 ACTION/GOTO 表。',
    icon: GitBranch,
    status: '新增',
  },
];

export const HomePage = ({ onOpen }: HomePageProps) => (
  <main className="min-h-screen bg-[#f7f7f5] px-6 py-8 text-ink-950">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="border-b border-neutral-200 pb-8">
        <div className="text-sm text-ink-600">Compiler GUI</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink-950">
          编译原理可视化实验台
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-600">
          面向文法集合、预测分析表、项目集族和语法分析过程的可视化工具。核心算法独立实现，界面负责展示、定位依据和逐步回放。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.id}
              className="flex min-h-[220px] flex-col justify-between rounded-md border border-neutral-200 bg-white p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                    <Icon size={19} />
                  </div>
                  <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-ink-600">
                    {feature.status}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-normal text-ink-950">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-600">{feature.description}</p>
              </div>
              <div className="mt-6">
                <Button icon={<ArrowRight size={15} />} variant="primary" onClick={() => onOpen(feature.id)}>
                  进入
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  </main>
);
