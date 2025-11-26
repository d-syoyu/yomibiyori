/**
 * Skeleton Loading Components
 * Provides various skeleton loaders for improved UX during data fetching
 */

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
}

/**
 * Basic skeleton element
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />
}

/**
 * Text line skeleton
 */
export function SkeletonText({ className = '', lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

/**
 * Title skeleton
 */
export function SkeletonTitle({ className = '' }: SkeletonProps) {
  return <div className={`skeleton skeleton-title ${className}`} />
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({ className = '' }: SkeletonProps) {
  return <div className={`skeleton skeleton-avatar ${className}`} />
}

/**
 * Card skeleton for dashboard stats
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`card ${className}`}>
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-10 w-32" />
    </div>
  )
}

/**
 * Stats card skeleton (for dashboard summary cards)
 */
export function SkeletonStatsCard() {
  return (
    <div className="card bg-gradient-to-br from-white to-[var(--color-washi)]">
      <div className="skeleton h-4 w-20 mb-2" />
      <div className="skeleton h-8 w-24" />
    </div>
  )
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Table skeleton with multiple rows
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3 px-4 text-left">
                <div className="skeleton h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Theme card skeleton (for sponsor themes list)
 */
export function SkeletonThemeCard() {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="skeleton h-6 w-16 rounded-full mb-2" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="mb-4 bg-[var(--color-washi)] rounded-xl p-8 border border-[var(--color-border)]">
        <div className="skeleton h-8 w-3/4 mx-auto" />
      </div>
      <div className="flex justify-end">
        <div className="skeleton h-4 w-24" />
      </div>
    </div>
  )
}

/**
 * List item skeleton
 */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--color-border)]">
      <div className="skeleton skeleton-avatar" />
      <div className="flex-1">
        <div className="skeleton h-4 w-1/3 mb-2" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  )
}

/**
 * Full page loading skeleton
 */
export function SkeletonPage({ children }: { children?: ReactNode }) {
  return (
    <div className="space-y-8 animate-pulse">
      {children || (
        <>
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>
          <div className="card">
            <SkeletonTable rows={5} columns={4} />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Insights page skeleton
 */
export function SkeletonInsightsPage() {
  return (
    <div className="space-y-10">
      <header>
        <div className="skeleton h-10 w-40 mb-2" />
        <div className="skeleton h-5 w-64" />
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>

      {/* Chart */}
      <div className="card p-6">
        <div className="skeleton h-6 w-48 mb-4" />
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="skeleton h-6 w-40" />
        </div>
        <SkeletonTable rows={5} columns={6} />
      </div>
    </div>
  )
}
