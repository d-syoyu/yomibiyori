/**
 * InfoTooltip Component
 * Displays explanatory tooltips for metrics
 */

'use client'

import { useState } from 'react'

interface InfoTooltipProps {
  text: string
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function InfoTooltip({ text, position = 'top-left' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const tooltipStyle = (() => {
    const base = {
      position: 'absolute' as const,
      zIndex: 9999,
      width: 'min(280px, calc(100vw - 32px))',
      maxWidth: 'min(280px, calc(100vw - 32px))',
      padding: '12px',
      fontSize: '12px',
      lineHeight: '1.5',
      color: 'var(--color-text-primary)',
      backgroundColor: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      pointerEvents: 'none' as const,
      whiteSpace: 'normal' as const,
      wordBreak: 'break-word' as const,
    }

    switch (position) {
      case 'bottom-right':
        return {
          ...base,
          top: 'calc(100% + 8px)',
          right: '0',
          left: 'auto',
        }
      case 'bottom-left':
        return {
          ...base,
          top: 'calc(100% + 8px)',
          left: '0',
          right: 'auto',
        }
      case 'top-right':
        return {
          ...base,
          bottom: 'calc(100% + 8px)',
          right: '0',
          left: 'auto',
        }
      case 'top-left':
      default:
        return {
          ...base,
          bottom: 'calc(100% + 8px)',
          left: '16px',
          right: 'auto',
        }
    }
  })()

  const arrowStyle = (() => {
    const base = {
      position: 'absolute' as const,
      width: '8px',
      height: '8px',
      backgroundColor: 'white',
      transform: 'rotate(45deg)',
    }

    switch (position) {
      case 'bottom-right':
        return {
          ...base,
          top: '-5px',
          right: '16px',
          borderLeft: '1px solid var(--color-border)',
          borderTop: '1px solid var(--color-border)',
        }
      case 'bottom-left':
        return {
          ...base,
          top: '-5px',
          left: '16px',
          borderLeft: '1px solid var(--color-border)',
          borderTop: '1px solid var(--color-border)',
        }
      case 'top-right':
        return {
          ...base,
          bottom: '-5px',
          right: '16px',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }
      case 'top-left':
      default:
        return {
          ...base,
          bottom: '-5px',
          left: '16px',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }
    }
  })()

  return (
    <span
      className="inline-block ml-1"
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-igusa)] hover:text-white hover:border-[var(--color-igusa)] transition-colors shadow-sm cursor-help"
      >
        ?
      </button>
      {isVisible && (
        <span style={tooltipStyle}>
          {text}
          <span style={arrowStyle} />
        </span>
      )}
    </span>
  )
}
