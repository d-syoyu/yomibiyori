/**
 * Admin Announcements Management
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'update'
  priority: number
  is_pinned: boolean
  is_published: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    title: string
    content: string
    type: 'info' | 'warning' | 'success' | 'update'
    priority: number
    is_pinned: boolean
    is_published: boolean
    expires_at: string
  }>({
    title: '',
    content: '',
    type: 'info',
    priority: 0,
    is_pinned: false,
    is_published: true,
    expires_at: '',
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('sponsor_announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Failed to load announcements:', error)
      alert('お知らせの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 0,
      is_pinned: false,
      is_published: true,
      expires_at: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  function handleEdit(announcement: Announcement) {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      is_pinned: announcement.is_pinned,
      is_published: announcement.is_published,
      expires_at: announcement.expires_at || '',
    })
    setEditingId(announcement.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const payload = {
        ...formData,
        expires_at: formData.expires_at || null,
      }

      if (editingId) {
        const { error } = await supabase
          .from('sponsor_announcements')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        alert('お知らせを更新しました')
      } else {
        const { error } = await supabase
          .from('sponsor_announcements')
          .insert(payload)

        if (error) throw error
        alert('お知らせを作成しました')
      }

      resetForm()
      loadAnnouncements()
    } catch (error) {
      console.error('Failed to save announcement:', error)
      alert('保存に失敗しました')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このお知らせを削除してもよろしいですか?')) return

    try {
      const { error } = await supabase
        .from('sponsor_announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('お知らせを削除しました')
      loadAnnouncements()
    } catch (error) {
      console.error('Failed to delete announcement:', error)
      alert('削除に失敗しました')
    }
  }

  const typeLabels = {
    info: '情報',
    warning: '警告',
    success: '成功',
    update: '更新',
  }

  const typeColors = {
    info: 'from-blue-400 to-blue-500',
    warning: 'from-yellow-400 to-orange-500',
    success: 'from-green-400 to-emerald-500',
    update: 'from-purple-400 to-violet-500',
  }

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            お知らせ管理
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              お知らせ管理
            </span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            スポンサー向けのお知らせを作成・管理できます
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-[var(--color-igusa)] text-white rounded-xl font-semibold hover:bg-[var(--color-igusa-light)] transition-all flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {showForm ? 'キャンセル' : '新規お知らせ'}
        </button>
      </header>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
            {editingId ? 'お知らせを編集' : '新しいお知らせを作成'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={200}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
                placeholder="お知らせのタイトルを入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                本文 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                maxLength={2000}
                rows={6}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
                placeholder="お知らせの内容を入力"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  タイプ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  優先度
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                有効期限（オプション）
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-igusa)] focus:ring-[var(--color-igusa)]"
                />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">ピン留め</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-igusa)] focus:ring-[var(--color-igusa)]"
                />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">公開</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-[var(--color-igusa)] text-white rounded-xl font-semibold hover:bg-[var(--color-igusa-light)] transition-all"
              >
                {editingId ? '更新' : '作成'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          お知らせ一覧 ({announcements.length}件)
        </h2>

        {announcements.length === 0 ? (
          <div className="card p-8 text-center text-[var(--color-text-secondary)]">
            お知らせがありません
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="card hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {announcement.is_pinned && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                          ピン留め
                        </span>
                      )}
                      {!announcement.is_published && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 rounded">
                          非公開
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-bold bg-gradient-to-r ${typeColors[announcement.type]} text-white rounded`}>
                        {typeLabels[announcement.type]}
                      </span>
                      {announcement.priority > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded">
                          優先度: {announcement.priority}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {announcement.title}
                    </h3>
                    <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      作成: {new Date(announcement.created_at).toLocaleString('ja-JP')}
                      {announcement.expires_at && (
                        <> | 期限: {new Date(announcement.expires_at).toLocaleString('ja-JP')}</>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
