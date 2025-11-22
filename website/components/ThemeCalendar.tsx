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
}

const CATEGORIES: Array<'恋愛' | '季節' | '日常' | 'ユーモア'> = ['恋愛', '季節', '日常', 'ユーモア']

export default function ThemeCalendar({ selectedDate, selectedCategory, onDateSelect }: ThemeCalendarProps) {
  const [calendarData, setCalendarData] = useState<ThemeCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    loadCalendar()
  }, [])

  async function loadCalendar() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchThemeCalendar()
      setCalendarData(response.days)
      setStartDate(response.start_date)
      setEndDate(response.end_date)
    } catch (err) {
      console.error('Failed to load calendar:', err)
      setError('カレンダーの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function getDateInfo(date: string, category: string): ThemeCalendarDay | undefined {
    return calendarData.find(d => d.date === date && d.category === category)
  }

  function getDatesInRange(): string[] {
    if (!startDate || !endDate) return []

    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  function getCellClassName(dateInfo: ThemeCalendarDay | undefined, date: string, category: string): string {
    const baseClasses = 'p-2 text-center border cursor-pointer transition-colors'
    const isSelected = selectedDate === date && selectedCategory === category

    if (isSelected) {
      return `${baseClasses} bg-blue-100 border-blue-500 ring-2 ring-blue-300`
    }

    if (!dateInfo) {
      // No data
      return `${baseClasses} border-gray-200 hover:bg-gray-50`
    }

    if (dateInfo.has_approved_theme) {
      if (dateInfo.is_sponsored) {
        // Sponsor theme exists
        return `${baseClasses} bg-red-50 border-red-300 text-red-700`
      } else {
        // AI theme exists
        return `${baseClasses} bg-yellow-50 border-yellow-300 text-yellow-700`
      }
    }

    // Available slot
    return `${baseClasses} bg-green-50 border-green-300 hover:bg-green-100`
  }

  function getCellContent(dateInfo: ThemeCalendarDay | undefined): string {
    if (!dateInfo) return '-'

    if (dateInfo.has_approved_theme) {
      if (dateInfo.is_sponsored) {
        return '協賛'
      } else {
        return 'AI'
      }
    }

    return '空き'
  }

  function handleCellClick(date: string, category: string, dateInfo: ThemeCalendarDay | undefined) {
    // Only allow selection of available slots
    if (dateInfo && !dateInfo.has_approved_theme) {
      onDateSelect?.(date)
    }
  }

  const dates = getDatesInRange()

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">エラー</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadCalendar}
          className="mt-2 text-sm underline hover:no-underline"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">お題カレンダー</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-50 border border-green-300"></div>
            <span>空き</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-300"></div>
            <span>AI</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-50 border border-red-300"></div>
            <span>協賛</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-50 text-left font-medium sticky left-0 z-10">カテゴリ</th>
              {dates.slice(0, 14).map(date => {
                const d = new Date(date)
                const month = d.getMonth() + 1
                const day = d.getDate()
                return (
                  <th key={date} className="p-2 border bg-gray-50 text-center text-sm min-w-[60px]">
                    {month}/{day}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(category => (
              <tr key={category}>
                <td className="p-2 border bg-gray-50 font-medium sticky left-0 z-10">{category}</td>
                {dates.slice(0, 14).map(date => {
                  const dateInfo = getDateInfo(date, category)
                  return (
                    <td
                      key={`${date}-${category}`}
                      className={getCellClassName(dateInfo, date, category)}
                      onClick={() => handleCellClick(date, category, dateInfo)}
                      title={dateInfo?.has_approved_theme
                        ? (dateInfo.is_sponsored ? 'スポンサーお題あり' : 'AIお題あり')
                        : '利用可能'}
                    >
                      <div className="text-xs font-medium">
                        {getCellContent(dateInfo)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dates.length > 14 && (
        <p className="text-sm text-gray-600 text-center">
          ※ 最初の14日間を表示しています
        </p>
      )}

      <div className="text-sm text-gray-600 space-y-1">
        <p>• 緑色のマス: お題を作成できます</p>
        <p>• 黄色のマス: AIが生成したお題が既に存在します</p>
        <p>• 赤色のマス: スポンサーお題が既に存在します</p>
      </div>
    </div>
  )
}
