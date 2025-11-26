/**
 * InsightsTable Component
 * Displays theme performance data in a table format
 */

'use client'

import { InfoTooltip } from './InfoTooltip'
import type { ThemeInsight } from '@/types/sponsor'

interface InsightsTableProps {
  themes: ThemeInsight[]
  selectedThemeId: string | null
  onSelectTheme: (theme: ThemeInsight) => void
  onExportCsv: () => void
}

export function InsightsTable({
  themes,
  selectedThemeId,
  onSelectTheme,
  onExportCsv,
}: InsightsTableProps) {
  return (
    <section className="card p-0 relative hover:z-20">
      <div className="p-6 border-b border-[var(--color-border)] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          お題別パフォーマンス
        </h2>
      </div>
      <div className="px-6 pb-4 flex justify-end">
        <button
          onClick={onExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-igusa)] text-[var(--color-igusa)] hover:bg-[var(--color-igusa)] hover:text-white transition-colors text-sm font-medium shadow-sm bg-white cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          CSVエクスポート
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-washi)] text-[var(--color-text-secondary)] text-sm">
              <th className="p-4 font-medium text-left">お題 (上の句)</th>
              <th className="p-4 font-medium text-left">配信日</th>
              <th className="p-4 font-medium text-left">
                <span className="inline-flex items-center">
                  表示数
                  <InfoTooltip
                    text="お題が表示された回数です。"
                    position="bottom-left"
                  />
                </span>
              </th>
              <th className="p-4 font-medium text-left">
                <span className="inline-flex items-center">
                  投稿数
                  <InfoTooltip
                    text="お題に対して投稿された俳句の数です。"
                    position="bottom-left"
                  />
                </span>
              </th>
              <th className="p-4 font-medium text-left">
                <span className="inline-flex items-center">
                  エンゲージメント
                  <InfoTooltip
                    text="表示数に対する提出率（投稿数 ÷ 表示数 × 100）です。"
                    position="bottom-right"
                  />
                </span>
              </th>
              <th className="p-4 font-medium text-left">
                <span className="inline-flex items-center">
                  合計いいね
                  <InfoTooltip
                    text="投稿に付いたいいねの合計です。"
                    position="bottom-left"
                  />
                </span>
              </th>
              <th className="p-4 font-medium text-left">
                <span className="inline-flex items-center">
                  平均いいね
                  <InfoTooltip
                    text="1作品あたりの平均いいね数です。"
                    position="bottom-right"
                  />
                </span>
              </th>
              <th className="p-4 font-medium text-left">
                <span className="inline-flex items-center">
                  リンククリック
                  <InfoTooltip
                    text="スポンサー公式URLがクリックされた回数です。"
                    position="bottom-right"
                  />
                </span>
              </th>
              <th className="p-4 font-medium text-left">分析</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {themes.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-[var(--color-text-muted)]"
                >
                  データがありません。投稿が反映され次第表示されます。
                </td>
              </tr>
            ) : (
              themes.map((theme) => (
                <tr
                  key={theme.id}
                  className={`hover:bg-[var(--color-washi)]/50 transition-colors cursor-default ${
                    selectedThemeId === theme.id ? 'bg-[var(--color-washi)]' : ''
                  }`}
                >
                  <td className="p-4 font-medium text-left text-[var(--color-text-primary)] font-serif">
                    {theme.text_575}
                  </td>
                  <td className="p-4 text-left text-sm text-[var(--color-text-secondary)]">
                    {new Date(theme.date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="p-4 text-left text-[var(--color-text-primary)]">
                    {theme.impressions.toLocaleString()}
                  </td>
                  <td className="p-4 text-left text-[var(--color-text-primary)]">
                    {theme.submissions.toLocaleString()}
                  </td>
                  <td className="p-4 text-left">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        theme.engagement_rate >= 10
                          ? 'bg-emerald-100 text-emerald-800'
                          : theme.engagement_rate >= 5
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {theme.engagement_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 text-left text-[var(--color-text-primary)]">
                    {theme.total_likes.toLocaleString()}
                  </td>
                  <td className="p-4 text-left text-[var(--color-text-secondary)]">
                    {theme.avg_likes_per_work.toFixed(1)}
                  </td>
                  <td className="p-4 text-left text-[var(--color-text-primary)]">
                    {theme.sponsor_link_clicks?.toLocaleString() ?? '-'}
                  </td>
                  <td className="p-4 text-left">
                    <button
                      className="text-[var(--color-igusa)] hover:underline text-sm font-medium cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectTheme(theme)
                      }}
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
