/**
 * Theme Calendar Component
 * Displays which dates and categories have approved themes
 */

'use client'

import { useEffect, useState } from 'react'
import { fetchThemeCalendar, ThemeCalendarDay } from '@/lib/sponsorApi'

interface ThemeCalendarProps {
  selectedDate?: string
  selectedCategory?: string
  onDateSelect?: (date: string) => void
  onSlotSelect?: (date: string, category: string) => void
}

const CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア'] as const
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const CATEGORY_COLORS: Record<string, string> = {
  '恋愛': 'bg-pink-400',
  '季節': 'bg-green-400',
  '日常': 'bg-orange-400',
  'ユーモア': 'bg-blue-400',
}

export default function ThemeCalendar({ selectedDate, selectedCategory, onDateSelect, onSlotSelect }: ThemeCalendarProps) {
  const [calendarData, setCalendarData] = useState<ThemeCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    loadCalendar()
  }, [currentDate])

  function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  async function loadCalendar() {
    try {
      setLoading(true)
      setError(null)

      // Calculate start and end of the month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()

      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)

      // Adjust to include padding days for the grid (start from Sunday)
      const startPadding = startDate.getDay()
      startDate.setDate(startDate.getDate() - startPadding)

      // End padding (end on Saturday)
      const endPadding = 6 - endDate.getDay()
      endDate.setDate(endDate.getDate() + endPadding)

      const response = await fetchThemeCalendar(
        formatDate(startDate),
        formatDate(endDate)
      )
      setCalendarData(response.days)
    } catch (err) {
      console.error('Failed to load calendar:', err)
      setError('カレンダーの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function getDaysInMonth() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days = []

    // Add padding days from previous month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false })
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      days.push({ date: d, isCurrentMonth: true })
    }

    // Add padding days from next month
    const endPadding = 6 - lastDay.getDay()
    for (let i = 1; i <= endPadding; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, isCurrentMonth: false })
    }

    return days
  }

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function handleDateClick(date: Date) {
    const dateStr = formatDate(date)

    // Don't allow selecting past dates (before tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    if (date < tomorrow) return

    if (onSlotSelect && selectedCategory) {
      onSlotSelect(dateStr, selectedCategory)
    } else if (onDateSelect) {
      onDateSelect(dateStr)
    }
  }

  function getApprovedThemesForDate(dateStr: string) {
    return calendarData.filter(d => d.date === dateStr && d.has_approved_theme)
  }

  const days = getDaysInMonth()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[var(--color-text-primary)] font-serif">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[var(--color-washi)] rounded-full transition-colors text-[var(--color-text-secondary)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-[var(--color-washi)] rounded-full transition-colors text-[var(--color-text-secondary)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 bg-[var(--color-washi)] border-b border-[var(--color-border)]">
          {WEEKDAYS.map((day, index) => (
            <div
              key={day}
              className={`py-3 text-center text-sm font-bold ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-[var(--color-text-secondary)]'
                }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[var(--color-border)] bg-[var(--color-border)] gap-[1px]">
          {days.map(({ date, isCurrentMonth }, index) => {
            const dateStr = formatDate(date)
            const isSelected = selectedDate === dateStr
            const isToday = new Date().toDateString() === date.toDateString()

            // Check if date is in the past (before tomorrow)
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)
            const isPast = date < tomorrow

            const approvedThemes = getApprovedThemesForDate(dateStr)

            return (
              <div
                key={index}
                onClick={() => !isPast && handleDateClick(date)}
                className={`
                  min-h-[80px] p-2 relative bg-white transition-all
                  ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : ''}
                  ${isPast ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'cursor-pointer hover:bg-[var(--color-washi)]'}
                  ${isSelected ? 'ring-2 ring-inset ring-[var(--color-igusa)] bg-[var(--color-washi)]' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-[var(--color-igusa)] text-white' : ''}
                      ${!isToday && date.getDay() === 0 ? 'text-red-500' : ''}
                      ${!isToday && date.getDay() === 6 ? 'text-blue-500' : ''}
                    `}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* Dots Container */}
                <div className="mt-2 flex flex-wrap gap-1 content-end">
                  {approvedThemes.map((theme, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[theme.category] || 'bg-gray-400'}`}
                      title={`${theme.category}: ${theme.is_sponsored ? '協賛' : 'AI'}お題あり`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)] mt-4 justify-end">
        {CATEGORIES.map(category => (
          <div key={category} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category]}`}></div>
            <span>{category}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-igusa)]"></div>
        </div>
      )}
    </div>
  )
}
