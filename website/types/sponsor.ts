/**
 * Sponsor-related type definitions
 */

// Theme status types
export type ThemeStatus = 'pending' | 'approved' | 'rejected' | 'published'

// Support ticket status types
export type TicketStatus = 'open' | 'in_progress' | 'resolved'

// Announcement types
export type AnnouncementType = 'info' | 'warning' | 'success' | 'update'

// Transaction types
export type TransactionType = 'purchase' | 'use' | 'refund' | 'admin_adjustment'

/**
 * Sponsor theme data
 */
export interface SponsorTheme {
  id: string
  campaign_id: string
  date: string
  category: string
  text_575: string
  status: ThemeStatus
  rejection_reason?: string
  sponsor_official_url?: string
  created_at: string
}

/**
 * Support ticket
 */
export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  created_at: string
  user?: {
    name: string
    email: string
  }
}

/**
 * Support ticket message
 */
export interface SupportTicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_admin: boolean
  created_at: string
}

/**
 * Announcement for sponsors
 */
export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  priority: number
  is_pinned: boolean
  is_published: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Credit transaction record
 */
export interface CreditTransaction {
  id: string
  sponsor_id: string
  amount: number
  transaction_type: TransactionType
  description: string | null
  stripe_payment_intent_id?: string | null
  created_at: string
}

/**
 * Theme notification for sponsors
 */
export interface ThemeNotification {
  id: string
  sponsor_id: string
  sponsor_theme_id: string
  status: 'approved' | 'rejected' | 'published'
  title: string
  message: string
  is_read: boolean
  created_at: string
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalThemes: number
  pendingThemes: number
  approvedThemes: number
  rejectedThemes: number
  publishedThemes: number
  credits: number
}

/**
 * Theme insight data
 */
export interface ThemeInsight {
  id: string
  text_575: string
  date: string
  impressions: number
  submissions: number
  sponsor_link_clicks: number
  likes: number
  engagement_rate: number
  total_likes: number
  avg_likes_per_work: number
  top_work: {
    text: string
    likes: number
    author_name: string
  } | null
  demographics?: {
    age_groups: Record<string, number>
    regions: Record<string, number>
  }
}

/**
 * Insights summary statistics
 */
export interface InsightsSummary {
  total_impressions: number
  total_submissions: number
  avg_engagement_rate: number
}
