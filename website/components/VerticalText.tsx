/**
 * Vertical Text Component
 * 縦書きテキスト表示コンポーネント（ウェブ版）
 *
 * 縦書き時に回転が必要な文字：
 * - 伸ばし棒: ー
 * - 波ダッシュ: 〜、～
 * - 三点リーダー: …、‥
 * - ハイフン・ダッシュ: −、－、–、—
 */

import React from 'react'

interface VerticalTextProps {
  /** 表示するテキスト（改行区切りで段組み） */
  text: string
  /** 追加のCSSクラス */
  className?: string
  /** 文字のCSSクラス */
  charClassName?: string
}

/**
 * 縦書き時に90度回転が必要な文字を判定
 */
function needsRotation(char: string): boolean {
  // 伸ばし棒・ダッシュ類
  const dashChars = ['ー', '−', '－', '–', '—', 'ｰ']

  // 波ダッシュ
  const waveChars = ['〜', '～', '〰']

  // 三点リーダー
  const ellipsisChars = ['…', '‥', '⋯']

  // 全ての回転対象文字
  const rotationChars = [...dashChars, ...waveChars, ...ellipsisChars]

  return rotationChars.includes(char)
}

export default function VerticalText({
  text,
  className = '',
  charClassName = '',
}: VerticalTextProps) {
  // 改行で分割して段組み
  const lines = text.split('\n').filter(line => line.trim().length > 0)

  return (
    <div
      className={`flex flex-row-reverse items-start justify-center gap-4 ${className}`}
    >
      {lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          className="flex flex-col items-center"
        >
          {line.split('').map((char, charIndex) => {
            const shouldRotate = needsRotation(char)

            return (
              <span
                key={charIndex}
                className={`${charClassName} ${shouldRotate ? 'inline-block rotate-90' : ''}`}
                style={{
                  lineHeight: '1.5em',
                }}
              >
                {char}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
