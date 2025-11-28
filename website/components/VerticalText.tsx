/**
 * Vertical Text Component
 * 縦書きテキスト表示コンポーネント（ウェブ版）
 *
 * 縦書き時に回転が必要な文字：
 * - 伸ばし棒: ー
 * - 波ダッシュ: 〜、～
 * - 三点リーダー: …、‥
 * - ハイフン・ダッシュ: −、－、–、—
 *
 * 縦書き用Unicode文字に置換する文字：
 * - 括弧類: 「」『』（）【】〔〕〈〉《》［］｛｝
 */

import React from 'react'

/**
 * 縦書き用Unicode文字への置換マップ
 * 括弧類は回転ではなく縦書き専用文字に置換
 */
const verticalCharMap: { [key: string]: string } = {
  '「': '﹁',
  '」': '﹂',
  '『': '﹃',
  '』': '﹄',
  '（': '︵',
  '）': '︶',
  '(': '︵',
  ')': '︶',
  '【': '︻',
  '】': '︼',
  '〔': '︹',
  '〕': '︺',
  '〈': '︿',
  '〉': '﹀',
  '《': '︽',
  '》': '︾',
  '［': '﹇',
  '］': '﹈',
  '[': '﹇',
  ']': '﹈',
  '｛': '︷',
  '｝': '︸',
  '{': '︷',
  '}': '︸',
}

/**
 * 縦書き用の文字に変換（置換が必要な文字のみ）
 */
function getVerticalChar(char: string): string {
  return verticalCharMap[char] ?? char
}

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
 * 注: 括弧類は回転ではなく縦書き専用文字に置換するため除外
 * 注: 引用符は回転ではなく位置調整で対応するため除外
 */
function needsRotation(char: string): boolean {
  // 伸ばし棒・ダッシュ類
  const dashChars = ['ー', '−', '－', '–', '—', 'ｰ']

  // 波ダッシュ
  const waveChars = ['〜', '～', '〰']

  // 三点リーダー
  const ellipsisChars = ['…', '‥', '⋯']

  // 記号類（縦書き時に回転が必要）
  const symbolChars = [
    ':', ';',                       // 半角コロン・セミコロン
    '：', '；',                     // 全角コロン・セミコロン
    '→', '←', '↔',                 // 矢印
    '=', '＝',                      // イコール
  ]

  // 全ての回転対象文字
  const rotationChars = [...dashChars, ...waveChars, ...ellipsisChars, ...symbolChars]

  return rotationChars.includes(char)
}

/**
 * 縦書き時に右上に位置調整が必要な文字を判定（句読点）
 */
function needsPositionAdjustmentTopRight(char: string): boolean {
  const chars = [
    '、', '，',                     // 読点
    '。', '．',                     // 句点
  ]
  return chars.includes(char)
}

/**
 * 引用符かどうかを判定
 */
function isQuoteMark(char: string): boolean {
  const quoteChars = [
    '"', '"', '"',                  // ダブルクォート（開き・閉じ・ストレート）
    "'", "'", "'",                  // シングルクォート（開き・閉じ・ストレート）
  ]
  return quoteChars.includes(char)
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
      {lines.map((line, lineIndex) => {
        let quoteCount = 0
        return (
          <div
            key={lineIndex}
            className="flex flex-col items-center"
          >
            {line.split('').map((char, charIndex) => {
              const shouldRotate = needsRotation(char)
              const shouldAdjustTopRight = needsPositionAdjustmentTopRight(char)
              const displayChar = getVerticalChar(char)

              // 引用符の場合、出現順で開き（奇数）/閉じ（偶数）を判定
              let quotePosition: 'open' | 'close' | null = null
              if (isQuoteMark(char)) {
                quoteCount++
                quotePosition = quoteCount % 2 === 1 ? 'open' : 'close'
              }

              // スタイルクラスを決定
              let positionClass = ''
              if (shouldAdjustTopRight || quotePosition === 'open') {
                positionClass = 'translate-x-[0.3em] -translate-y-[0.3em]'
              } else if (quotePosition === 'close') {
                positionClass = '-translate-x-[0.3em] -translate-y-[0.3em]'
              }

              return (
                <span
                  key={charIndex}
                  className={`${charClassName} inline-block ${shouldRotate ? 'rotate-90' : ''} ${positionClass}`}
                  style={{
                    lineHeight: '1.5em',
                  }}
                >
                  {displayChar}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
