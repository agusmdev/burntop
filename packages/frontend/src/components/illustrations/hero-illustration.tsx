import { cn } from '@/lib/utils';

interface HeroIllustrationProps {
  className?: string;
}

export function HeroIllustration({ className }: HeroIllustrationProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes bar-grow {
          0% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }

        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .hero-card {
          animation: hero-float 6s ease-in-out infinite;
        }

        .hero-bar {
          transform-origin: bottom;
          animation: bar-grow 0.8s ease-out forwards;
        }

        .hero-bar-1 { animation-delay: 0.1s; }
        .hero-bar-2 { animation-delay: 0.2s; }
        .hero-bar-3 { animation-delay: 0.3s; }
        .hero-bar-4 { animation-delay: 0.4s; }
        .hero-bar-5 { animation-delay: 0.5s; }
        .hero-bar-6 { animation-delay: 0.6s; }
        .hero-bar-7 { animation-delay: 0.7s; }

        .hero-stat { animation: fade-in 0.5s ease-out forwards; opacity: 0; }
        .hero-stat-1 { animation-delay: 0.2s; }
        .hero-stat-2 { animation-delay: 0.4s; }
        .hero-stat-3 { animation-delay: 0.6s; }

        @keyframes line-draw {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }

        .hero-line {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: line-draw 1.5s ease-out forwards 0.5s;
        }
      `}</style>

      <div className="hero-card relative rounded-2xl bg-gradient-to-br from-bg-elevated to-bg-surface border border-border-subtle shadow-2xl shadow-black/50 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-ember-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle bg-bg-surface/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ember-500/20">
            <svg
              className="w-4 h-4 text-ember-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-text-primary">Dashboard</span>
          <div className="ml-auto flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="hero-stat hero-stat-1 rounded-xl p-4 bg-gradient-to-br from-bg-surface to-ember-500/5 ring-1 ring-ember-500/20">
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
                Total Tokens
              </div>
              <div className="text-xl font-bold text-ember-400 font-mono">1.2M</div>
            </div>

            <div className="hero-stat hero-stat-2 rounded-xl p-4 bg-bg-surface ring-1 ring-border-subtle">
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
                Est. Cost
              </div>
              <div className="text-xl font-bold text-text-primary">$847</div>
            </div>

            <div className="hero-stat hero-stat-3 rounded-xl p-4 bg-bg-surface ring-1 ring-border-subtle">
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
                Streak
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-text-primary">14</span>
                <svg className="w-4 h-4 text-ember-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 bg-bg-surface ring-1 ring-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-primary">Usage Trends</span>
              <span className="text-[10px] text-text-tertiary">Last 7 days</span>
            </div>

            <div className="relative">
              <svg
                className="absolute inset-0 w-full h-20 pointer-events-none"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FF6B00" />
                  </linearGradient>
                </defs>
                <polyline
                  className="hero-line"
                  points="7,24 21,14 36,22 50,8 64,18 79,2 93,12"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="flex items-end justify-between gap-2 h-24 relative z-10">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-1 w-full bg-zinc-700 rounded-sm"
                    style={{ height: '40%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Mon</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-2 w-full bg-zinc-700 rounded-sm"
                    style={{ height: '65%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Tue</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-3 w-full bg-zinc-700 rounded-sm"
                    style={{ height: '45%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Wed</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-4 w-full bg-zinc-700 rounded-sm"
                    style={{ height: '80%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Thu</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-5 w-full bg-zinc-700 rounded-sm"
                    style={{ height: '55%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Fri</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-6 w-full bg-ember-500 rounded-sm"
                    style={{ height: '95%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Sat</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="hero-bar hero-bar-7 w-full bg-zinc-700 rounded-sm"
                    style={{ height: '70%' }}
                  />
                  <span className="text-[9px] text-text-tertiary">Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
