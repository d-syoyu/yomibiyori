/**
 * InsightsSummaryCards Component
 * Displays summary statistics cards for insights page
 */

'use client'

import { InfoTooltip } from './InfoTooltip'
import type { InsightsSummary } from '@/types/sponsor'

interface InsightsSummaryCardsProps {
  summary: InsightsSummary
}

export function InsightsSummaryCards({ summary }: InsightsSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center">
          総表示回数
          <InfoTooltip
            text="ユーザーがお題を閲覧した回数の合計です。アプリ内でお題画面が表示された回数を示します。"
            position="bottom-left"
          />
        </h3>
        <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
          {summary.total_impressions.toLocaleString()}
          <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">
            回
          </span>
        </p>
      </div>
      <div className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center">
          総投稿数
          <InfoTooltip
            text="ユーザーがお題に対して下の句を投稿した回数の合計です。実際にコンテンツが作成された回数を示します。"
            position="bottom-left"
          />
        </h3>
        <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
          {summary.total_submissions.toLocaleString()}
          <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">
            句
          </span>
        </p>
      </div>
      <div className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center">
          平均エンゲージメント率
          <InfoTooltip
            text="表示回数に対する投稿数の割合です。お題を見たユーザーのうち、実際に下の句を投稿した割合を示します。"
            position="bottom-right"
          />
        </h3>
        <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
          {summary.avg_engagement_rate.toFixed(1)}
          <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">
            %
          </span>
        </p>
      </div>
    </section>
  )
}
