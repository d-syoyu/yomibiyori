/**
 * Spinner - ローディングスピナーコンポーネント
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-[var(--color-igusa)] border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  )
}

/**
 * ボタン内で使用するスピナー（白色）
 */
export function ButtonSpinner({ size = 'sm' }: Pick<SpinnerProps, 'size'>) {
  return (
    <div
      className={`animate-spin rounded-full border-white border-t-transparent ${sizeClasses[size]}`}
    />
  )
}

interface LoadingProps {
  text?: string
  className?: string
}

/**
 * インラインローディング表示
 */
export function Loading({ text = '読み込み中...', className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center gap-3 text-[var(--color-text-secondary)] ${className}`}>
      <Spinner size="sm" />
      <span>{text}</span>
    </div>
  )
}

/**
 * 中央配置のローディング表示
 */
export function LoadingCenter({ text = '読み込み中...', className = '' }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <Spinner size="md" />
      <p className="text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

/**
 * フルスクリーンローディング表示
 */
export function LoadingFullScreen({ text = '読み込み中...' }: LoadingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--color-washi)]">
      <Spinner size="lg" />
      <p className="text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}
