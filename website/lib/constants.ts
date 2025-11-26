/**
 * Shared constants for sponsor and admin pages
 */

import type {
  ThemeStatus,
  TicketStatus,
  AnnouncementType,
  TransactionType,
} from '@/types/sponsor'

// =============================================================================
// Theme Status Configuration
// =============================================================================

export const THEME_STATUS_CONFIG: Record<
  ThemeStatus,
  { label: string; className: string }
> = {
  pending: {
    label: '審査待ち',
    className: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  },
  approved: {
    label: '承認済み',
    className: 'bg-green-100 text-green-900 border-green-200',
  },
  rejected: {
    label: '却下',
    className: 'bg-red-100 text-red-900 border-red-200',
  },
  published: {
    label: '配信済み',
    className: 'bg-blue-100 text-blue-900 border-blue-200',
  },
}

export const THEME_STATUS_FILTERS = [
  { label: '全て', value: null },
  { label: '審査待ち', value: 'pending' as ThemeStatus },
  { label: '承認済み', value: 'approved' as ThemeStatus },
  { label: '配信済み', value: 'published' as ThemeStatus },
  { label: '却下', value: 'rejected' as ThemeStatus },
]

// =============================================================================
// Ticket Status Configuration
// =============================================================================

export const TICKET_STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  open: {
    label: '受付中',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  in_progress: {
    label: '対応中',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  resolved: {
    label: '解決済み',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
}

export const TICKET_STATUS_CONFIG_ADMIN: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  open: {
    label: '未対応',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  in_progress: {
    label: '対応中',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  resolved: {
    label: '解決済み',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
}

// =============================================================================
// Announcement Type Configuration
// =============================================================================

export const ANNOUNCEMENT_TYPE_CONFIG: Record<
  AnnouncementType,
  { label: string; gradientClassName: string }
> = {
  info: {
    label: '情報',
    gradientClassName: 'from-blue-400 to-blue-500',
  },
  warning: {
    label: '警告',
    gradientClassName: 'from-yellow-400 to-orange-500',
  },
  success: {
    label: '成功',
    gradientClassName: 'from-green-400 to-emerald-500',
  },
  update: {
    label: '更新',
    gradientClassName: 'from-purple-400 to-violet-500',
  },
}

// =============================================================================
// Transaction Type Configuration
// =============================================================================

export const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  { label: string; className: string }
> = {
  purchase: {
    label: '購入',
    className: 'text-green-600 bg-green-50 border-green-600',
  },
  use: {
    label: '使用',
    className: 'text-blue-600 bg-blue-50 border-blue-600',
  },
  refund: {
    label: '返金',
    className: 'text-orange-600 bg-orange-50 border-orange-600',
  },
  admin_adjustment: {
    label: '管理者調整',
    className: 'text-purple-600 bg-purple-50 border-purple-600',
  },
}

// =============================================================================
// Theme Categories
// =============================================================================

export const THEME_CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア'] as const
export type ThemeCategory = (typeof THEME_CATEGORIES)[number]

export const CATEGORY_COLORS: Record<
  ThemeCategory,
  { gradient: [string, string]; shadow: string }
> = {
  恋愛: {
    gradient: ['#FFB7C5', '#FFE4E8'],
    shadow: 'rgba(255, 183, 197, 0.3)',
  },
  季節: {
    gradient: ['#88B04B', '#A8C98B'],
    shadow: 'rgba(136, 176, 75, 0.3)',
  },
  日常: {
    gradient: ['#A7D8DE', '#D4ECF0'],
    shadow: 'rgba(167, 216, 222, 0.3)',
  },
  ユーモア: {
    gradient: ['#F0E68C', '#FFF9C4'],
    shadow: 'rgba(240, 230, 140, 0.3)',
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get theme status label
 */
export function getThemeStatusLabel(status: ThemeStatus): string {
  return THEME_STATUS_CONFIG[status]?.label || status
}

/**
 * Get theme status className
 */
export function getThemeStatusClassName(status: ThemeStatus): string {
  return THEME_STATUS_CONFIG[status]?.className || 'bg-gray-100 text-gray-900'
}

/**
 * Get ticket status label
 */
export function getTicketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_CONFIG[status]?.label || status
}

/**
 * Get ticket status className
 */
export function getTicketStatusClassName(status: TicketStatus): string {
  return TICKET_STATUS_CONFIG[status]?.className || 'bg-gray-100 text-gray-800'
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  return TRANSACTION_TYPE_CONFIG[type]?.label || type
}

/**
 * Get transaction type className
 */
export function getTransactionTypeClassName(type: TransactionType): string {
  return TRANSACTION_TYPE_CONFIG[type]?.className || 'text-gray-600 bg-gray-50'
}

/**
 * Get category colors
 */
export function getCategoryColors(category: string): {
  gradient: [string, string]
  shadow: string
} {
  return (
    CATEGORY_COLORS[category as ThemeCategory] || {
      gradient: ['#E8D4C4', '#D4C4B4'],
      shadow: 'rgba(0, 0, 0, 0.1)',
    }
  )
}
