/**
 * よみびよりタイポグラフィ
 * Noto Serif JPを活用した和のタイポグラフィ
 */

export const fontFamily = {
  regular: 'NotoSerifJP_400Regular',
  medium: 'NotoSerifJP_500Medium',
  semiBold: 'NotoSerifJP_600SemiBold',
};

export const fontSize = {
  // 見出し
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,

  // 本文
  body: 16,
  bodySmall: 14,

  // キャプション
  caption: 12,
  captionSmall: 10,

  // 特別
  display: 40,
  poem: 20,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2.0,
};

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.0,
  widest: 1.5,
};

export default {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
};
