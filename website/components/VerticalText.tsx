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
 *
 * 引用符で囲まれた部分：
 * - 引用符も含めて全体を90度回転（横書きブロックとして表示）
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
 * 注: 引用符は引用ブロック全体で処理するため除外
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
 * 引用符かどうかを判定（Unicode コードポイントで判定）
 */
function isOpeningQuote(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    code === 0x0022 ||  // " ストレートダブル
    code === 0x0027 ||  // ' ストレートシングル
    code === 0x201C ||  // " 左ダブル引用符
    code === 0x2018     // ' 左シングル引用符
  )
}

function isClosingQuote(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    code === 0x0022 ||  // " ストレートダブル
    code === 0x0027 ||  // ' ストレートシングル
    code === 0x201D ||  // " 右ダブル引用符
    code === 0x2019     // ' 右シングル引用符
  )
}

/**
 * 開き引用符に対応する閉じ引用符を取得
 */
function getMatchingCloseQuote(openQuote: string): string {
  const code = openQuote.charCodeAt(0)
  switch (code) {
    case 0x201C: return String.fromCharCode(0x201D)  // " → "
    case 0x0022: return '"'   // " → "
    case 0x2018: return String.fromCharCode(0x2019)  // ' → '
    case 0x0027: return "'"   // ' → '
    default: return openQuote
  }
}

interface TextSegment {
  type: 'normal' | 'quoted'
  content: string
}

/**
 * テキストを引用部分と通常部分に分割
 */
function parseTextWithQuotes(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentSegment = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (!inQuote && isOpeningQuote(char)) {
      // 引用開始
      if (currentSegment) {
        segments.push({ type: 'normal', content: currentSegment })
        currentSegment = ''
      }
      inQuote = true
      quoteChar = char
      currentSegment = char
    } else if (inQuote && isClosingQuote(char)) {
      // 引用終了（対応する閉じ引用符かチェック）
      const expectedClose = getMatchingCloseQuote(quoteChar)
      if (char === expectedClose || char === quoteChar) {
        currentSegment += char
        segments.push({ type: 'quoted', content: currentSegment })
        currentSegment = ''
        inQuote = false
        quoteChar = ''
      } else {
        currentSegment += char
      }
    } else {
      currentSegment += char
    }
  }

  // 残りのテキスト
  if (currentSegment) {
    segments.push({ type: inQuote ? 'quoted' : 'normal', content: currentSegment })
  }

  return segments
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
        // 引用部分と通常部分に分割
        const segments = parseTextWithQuotes(line)

        return (
          <div
            key={lineIndex}
            className="flex flex-col items-center"
          >
            {segments.map((segment, segmentIndex) => {
              if (segment.type === 'quoted') {
                // 引用部分: 全体を90度回転した横書きブロック
                return (
                  <span
                    key={segmentIndex}
                    className={`${charClassName} inline-block rotate-90 whitespace-nowrap`}
                    style={{
                      lineHeight: '1.5em',
                      fontSize: '0.85em',
                    }}
                  >
                    {segment.content}
                  </span>
                )
              }

              // 通常部分: 1文字ずつ縦に配置
              return segment.content.split('').map((char, charIndex) => {
                const shouldRotate = needsRotation(char)
                const shouldAdjustTopRight = needsPositionAdjustmentTopRight(char)
                const displayChar = getVerticalChar(char)

                // スタイルクラスを決定
                let positionClass = ''
                let rotateClass = ''
                if (shouldRotate) {
                  rotateClass = 'rotate-90'
                } else if (shouldAdjustTopRight) {
                  // 句読点: 右上に位置調整のみ
                  positionClass = 'translate-x-[0.3em] -translate-y-[0.3em]'
                }

                return (
                  <span
                    key={`${segmentIndex}-${charIndex}`}
                    className={`${charClassName} inline-block ${rotateClass} ${positionClass}`}
                    style={{
                      lineHeight: '1.5em',
                    }}
                  >
                    {displayChar}
                  </span>
                )
              })
            })}
          </div>
        )
      })}
    </div>
  )
}
