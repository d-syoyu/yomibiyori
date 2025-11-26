/**
 * InsightsDemographics Component
 * Displays user demographics analysis for a selected theme
 */

'use client'

import { DemographicsChart } from '../charts/DemographicsChart'
import type { ThemeInsight } from '@/types/sponsor'

interface InsightsDemographicsProps {
  selectedTheme: ThemeInsight
}

export function InsightsDemographics({ selectedTheme }: InsightsDemographicsProps) {
  if (!selectedTheme.demographics) {
    return null
  }

  return (
    <section className="card p-0 relative hover:z-20 animate-fade-in">
      <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          ユーザー属性分析:{' '}
          <span className="font-serif ml-2">{selectedTheme.text_575}</span>
        </h2>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Age Groups */}
        <div>
          <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-4">
            年代別投稿数
          </h3>
          <div className="h-[300px]">
            {Object.entries(selectedTheme.demographics.age_groups).length ===
            0 ? (
              <p className="text-[var(--color-text-muted)] text-sm">
                データがありません
              </p>
            ) : (
              <DemographicsChart
                type="pie"
                data={Object.entries(selectedTheme.demographics.age_groups)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, value]) => ({ name, value }))}
              />
            )}
          </div>
        </div>

        {/* Regions */}
        <div>
          <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-4">
            地域別投稿数 (Top 5)
          </h3>
          <div className="h-[300px]">
            {Object.entries(selectedTheme.demographics.regions).length === 0 ? (
              <p className="text-[var(--color-text-muted)] text-sm">
                データがありません
              </p>
            ) : (
              <DemographicsChart
                type="pie"
                data={Object.entries(selectedTheme.demographics.regions)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, value]) => ({ name, value }))}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
