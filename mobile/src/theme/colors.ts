/**
 * よみびよりカラーパレット
 * モダン×和のテイスト
 */

// 和の伝統色
export const japaneseColors = {
  // 井草色系（畳の色）
  igusa: '#6B7B4F',         // 井草（濃）
  igusaMedium: '#7B8A58',   // 井草（中）
  igusaLight: '#93A36C',    // 井草（淡）
  igusaPale: '#B0BF98',     // 井草（極淡）

  // 藍色系
  ai: '#1A365D',            // 藍（濃）
  aiMedium: '#2C5282',      // 藍（中）
  aiLight: '#4299E1',       // 藍（淡）
  aiPale: '#BEE3F8',        // 藍（極淡）

  // 桜色系
  sakura: '#FFB7C5',        // 桜色
  sakuraPale: '#FFE4E8',    // 桜（淡）

  // 和紙系
  washi: '#F5F3ED',         // 和紙（よりナチュラルに）
  washiDark: '#EBE8DD',     // 和紙（濃）

  // 金色系
  kin: '#D4AF37',           // 金
  kinLight: '#F0E68C',      // 金（淡）

  // その他の和色
  matcha: '#88B04B',        // 抹茶
  momiji: '#D4515E',        // 紅葉
  fuji: '#A4A8D1',          // 藤色
  sora: '#A7D8DE',          // 空色
  wakabairo: '#A8C98B',     // 若葉色
};

// アプリケーションカラー
export const colors = {
  // 背景
  background: {
    primary: japaneseColors.washi,
    secondary: japaneseColors.washiDark,
    card: '#FFFFFF',
    overlay: 'rgba(255, 255, 255, 0.95)',
  },

  // テキスト
  text: {
    primary: japaneseColors.igusa,
    secondary: japaneseColors.igusaMedium,
    tertiary: japaneseColors.igusaLight,
    inverse: '#FFFFFF',
    accent: japaneseColors.ai,
  },

  // アクセント
  accent: {
    primary: japaneseColors.ai,
    secondary: japaneseColors.sakura,
    gradient: ['#1A365D', '#2C5282', '#4299E1'] as const,
  },

  // カテゴリー別カラー
  category: {
    恋愛: {
      primary: japaneseColors.sakura,
      gradient: ['#FFB7C5', '#FFE4E8'] as const,
      shadow: 'rgba(255, 183, 197, 0.3)',
    },
    季節: {
      primary: japaneseColors.matcha,
      gradient: ['#88B04B', '#A8C98B'] as const,
      shadow: 'rgba(136, 176, 75, 0.3)',
    },
    日常: {
      primary: japaneseColors.sora,
      gradient: ['#A7D8DE', '#D4ECF0'] as const,
      shadow: 'rgba(167, 216, 222, 0.3)',
    },
    ユーモア: {
      primary: japaneseColors.kinLight,
      gradient: ['#F0E68C', '#FFF9C4'] as const,
      shadow: 'rgba(240, 230, 140, 0.3)',
    },
  },

  // 状態
  status: {
    success: japaneseColors.matcha,
    error: japaneseColors.momiji,
    warning: japaneseColors.kin,
    info: japaneseColors.fuji,
  },

  // シャドウ
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },
};

export default colors;
