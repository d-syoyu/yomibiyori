/**
 * InsightsTopWorks Component
 * Displays top performing works for each theme
 */

'use client'

import type { ThemeInsight } from '@/types/sponsor'

interface InsightsTopWorksProps {
  themes: ThemeInsight[]
}

export function InsightsTopWorks({ themes }: InsightsTopWorksProps) {
  const themesWithTopWork = themes.filter((t) => t.top_work)

  if (themesWithTopWork.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
          最も人気の作品
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themesWithTopWork.map((theme) => (
          <div
            key={theme.id}
            className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20"
          >
            <div className="mb-2">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                お題
              </p>
              <p className="font-serif text-sm text-[var(--color-text-primary)]">
                {theme.text_575}
              </p>
            </div>
            <div className="border-t border-[var(--color-border)] pt-3 mt-2">
              <p className="font-serif text-[var(--color-text-primary)] whitespace-pre-line mb-3">
                {theme.top_work!.text}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  by {theme.top_work!.author_name}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded bg-pink-100 text-pink-800 text-xs font-medium">
                  ❤️ {theme.top_work!.likes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
