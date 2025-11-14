"""
共有カード画像生成ユーティリティ
Pillowを使用してSNS共有用の画像を生成
"""

from io import BytesIO
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
import os


class ShareCardGenerator:
    """共有カード画像生成クラス"""

    # 画像サイズ（Instagram 4:5比率）
    WIDTH = 1080
    HEIGHT = 1350

    # カラー定義（モバイルのtheme/colors.tsと完全一致）
    COLORS = {
        "恋愛": {"gradient": ["#FFB7C5", "#FFE4E8"]},
        "季節": {"gradient": ["#88B04B", "#A8C98B"]},
        "日常": {"gradient": ["#A7D8DE", "#D4ECF0"]},
        "ユーモア": {"gradient": ["#F0E68C", "#FFF9C4"]},
    }

    # デフォルトカラー（恋愛）
    DEFAULT_GRADIENT = ["#FFB7C5", "#FFE4E8"]

    # レイアウト定数
    OUTER_PADDING = 40
    INNER_PADDING = 32
    CONTENT_GAP = 24

    # テキストカラー（モバイルのtheme/colors.tsと完全一致）
    TEXT_PRIMARY = (107, 123, 79)  # #6B7B4F (igusa) - text.primary
    TEXT_SECONDARY = (123, 138, 88)  # #7B8A58 (igusaMedium) - text.secondary
    TEXT_TERTIARY = (147, 163, 108)  # #93A36C (igusaLight) - text.tertiary
    TEXT_ACCENT = (26, 54, 93)  # #1A365D (ai) - text.accent
    BADGE_BG = (26, 54, 93, 20)  # rgba(26, 54, 93, 0.08)
    OVERLAY_BG = (255, 255, 255, 235)  # rgba(255, 255, 255, 0.92)

    def __init__(self):
        """フォントパスを初期化"""
        self.font_path = self._find_font()

    def _find_font(self) -> Optional[str]:
        """システムから日本語フォントを探す"""
        import subprocess
        import glob

        # Noto Serif JP を優先（モバイルと統一）
        # プロジェクト内のフォントを最優先
        possible_paths = [
            # Project fonts (最優先 - Railwayで確実に動作)
            "/app/fonts/NotoSerifCJKjp-Regular.otf",
            "./fonts/NotoSerifCJKjp-Regular.otf",
            "fonts/NotoSerifCJKjp-Regular.otf",
            # Noto Serif CJK fonts - Railway/Linux (システムインストール)
            "/usr/share/fonts/opentype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc",
            # Noto Sans CJK fonts (フォールバック)
            "/usr/share/fonts/opentype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            # Windows paths (Serif優先)
            "C:\\Windows\\Fonts\\msmincho.ttc",
            "C:\\Windows\\Fonts\\msgothic.ttc",
            "C:\\Windows\\Fonts\\yugothic.ttf",
            "C:\\Windows\\Fonts\\meiryo.ttc",
            # macOS paths (明朝体優先)
            "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/Library/Fonts/Osaka.ttf",
        ]

        # 直接パスをチェック
        for path in possible_paths:
            if os.path.exists(path):
                return path

        # Nix storeをglobで検索（Serif優先でモバイルと統一）
        nix_patterns = [
            "/nix/store/*/share/fonts/opentype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/nix/store/*/share/fonts/truetype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/nix/store/*/share/fonts/opentype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/nix/store/*/share/fonts/truetype/noto-cjk/NotoSansCJK-Regular.ttc",
        ]
        for pattern in nix_patterns:
            matches = glob.glob(pattern)
            if matches:
                return matches[0]

        # フォントが見つからない場合、fcコマンドで検索を試みる
        try:
            result = subprocess.run(
                ["fc-list", ":lang=ja", "file"],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0 and result.stdout:
                lines = result.stdout.strip().split('\n')
                if lines:
                    # 最初の日本語フォントを使用
                    font_path = lines[0].split(':')[0].strip()
                    if os.path.exists(font_path):
                        return font_path
        except Exception:
            pass

        return None

    def _get_font(self, size: int) -> ImageFont.FreeTypeFont:
        """指定サイズのフォントを取得"""
        if not self.font_path:
            # フォントが見つからない場合はエラーをログ
            import logging
            logging.warning("No Japanese font found. Text may not render correctly.")
            # 最後の手段: PIL の load_default() は使わず、エラーにする
            raise RuntimeError("Japanese font is required but not found on system")

        try:
            font = ImageFont.truetype(self.font_path, size)
            return font
        except Exception as e:
            import logging
            logging.error(f"Failed to load font {self.font_path}: {e}")
            raise

    def _hex_to_rgb(self, hex_color: str) -> tuple:
        """HEXカラーをRGBに変換"""
        hex_color = hex_color.lstrip("#")
        return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

    def _needs_rotation(self, char: str) -> bool:
        """縦書き時に90度回転が必要な文字を判定（モバイルのVerticalText.tsxと同じ）"""
        # 伸ばし棒・ダッシュ類
        dash_chars = ['ー', '−', '－', '–', '—', 'ｰ']
        # 波ダッシュ
        wave_chars = ['〜', '～', '〰']
        # 三点リーダー
        ellipsis_chars = ['…', '‥', '⋯']
        # 全ての回転対象文字
        rotation_chars = dash_chars + wave_chars + ellipsis_chars
        return char in rotation_chars

    def _draw_rotated_char(
        self,
        img: Image.Image,
        char: str,
        x: int,
        y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple,
    ):
        """90度回転した文字を描画"""
        # 文字のバウンディングボックスを取得
        bbox = ImageDraw.Draw(img).textbbox((0, 0), char, font=font)
        char_width = bbox[2] - bbox[0]
        char_height = bbox[3] - bbox[1]

        # 余白を追加してテキスト用の一時画像を作成
        padding = 10
        temp_img = Image.new('RGBA', (char_width + padding * 2, char_height + padding * 2), (255, 255, 255, 0))
        temp_draw = ImageDraw.Draw(temp_img)

        # 一時画像に文字を描画
        temp_draw.text((padding, padding), char, font=font, fill=fill)

        # 90度回転
        rotated = temp_img.rotate(90, expand=True)

        # 回転後のサイズ
        rotated_width, rotated_height = rotated.size

        # 中央揃えで貼り付け位置を計算
        paste_x = x - (rotated_width // 2)
        paste_y = y

        # 元の画像に合成
        img.paste(rotated, (paste_x, paste_y), rotated)

    def _create_gradient_background(
        self, img: Image.Image, colors: list[str]
    ) -> Image.Image:
        """対角グラデーション背景を作成（左上から右下）"""
        draw = ImageDraw.Draw(img)

        start_color = self._hex_to_rgb(colors[0])
        end_color = self._hex_to_rgb(colors[1])

        # 対角グラデーション
        for y in range(self.HEIGHT):
            for x in range(self.WIDTH):
                # 左上(0,0)から右下(WIDTH,HEIGHT)への距離比率
                ratio = ((x / self.WIDTH) + (y / self.HEIGHT)) / 2
                r = int(start_color[0] + (end_color[0] - start_color[0]) * ratio)
                g = int(start_color[1] + (end_color[1] - start_color[1]) * ratio)
                b = int(start_color[2] + (end_color[2] - start_color[2]) * ratio)
                draw.point((x, y), fill=(r, g, b))

        return img

    def _draw_vertical_text_multiline(
        self,
        img: Image.Image,
        draw: ImageDraw.ImageDraw,
        text: str,
        start_x: int,
        start_y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple,
        char_height: int = 38,
        column_spacing: int = 50,
    ):
        """改行を考慮した縦書きテキストを描画（右から左に列を追加）"""
        lines = text.split("\n")
        current_x = start_x

        for line in lines:
            current_y = start_y
            for char in line.strip():
                # 回転が必要な文字かチェック
                if self._needs_rotation(char):
                    # 回転させて描画
                    self._draw_rotated_char(img, char, current_x, current_y, font, fill)
                else:
                    # 通常描画
                    bbox = draw.textbbox((0, 0), char, font=font)
                    char_width = bbox[2] - bbox[0]
                    # 中央揃え
                    char_x = current_x - (char_width // 2)
                    draw.text((char_x, current_y), char, font=font, fill=fill)
                current_y += char_height

            # 次の列は左へ
            current_x -= column_spacing

    def generate(
        self,
        upper_text: Optional[str],
        lower_text: str,
        author_name: str,
        category: str,
        category_label: str,
        date_label: str,
        badge_label: Optional[str] = None,
        caption: Optional[str] = None,
        likes_label: Optional[str] = None,
        score_label: Optional[str] = None,
    ) -> BytesIO:
        """
        共有カード画像を生成（モバイルプレビューと同じレイアウト）

        Returns:
            BytesIO: PNG画像のバイトストリーム
        """
        # WorkCardと同じ構成: カテゴリカラーの単色背景
        gradient_colors = self.COLORS.get(category_label, {}).get(
            "gradient", self.DEFAULT_GRADIENT
        )
        # グラデーションの1色目を背景色として使用（WorkCardのouterContainerと同じ）
        bg_color = self._hex_to_rgb(gradient_colors[0])
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=bg_color)
        draw = ImageDraw.Draw(img)

        # 白い内側カード（WorkCardのinnerCardと同じ）
        # OUTER_PADDINGは外側全体のパディング、spacing.xsに相当
        inner_x1 = self.OUTER_PADDING
        inner_y1 = self.OUTER_PADDING
        inner_x2 = self.WIDTH - self.OUTER_PADDING
        inner_y2 = self.HEIGHT - self.OUTER_PADDING

        # 白い内側カードを描画
        draw.rounded_rectangle(
            [inner_x1, inner_y1, inner_x2, inner_y2],
            radius=24,
            fill=(255, 255, 255)  # 完全な白
        )

        # フォント準備（モバイルのスケール比 1080/375 ≈ 2.88倍）
        # fontSize.poem = 20 → 58px, fontSize.bodySmall = 12 → 35px
        font_poem = self._get_font(58)  # 詩用フォント
        font_author = self._get_font(35)  # 作者名用（@吉川颯我）
        font_meta = self._get_font(35)  # メタ情報用（よみびより）

        # コンテンツ領域の開始位置
        content_x = inner_x1 + self.INNER_PADDING
        content_y = inner_y1 + self.INNER_PADDING
        content_width = inner_x2 - inner_x1 - (self.INNER_PADDING * 2)

        # 詩の配置計算: 中央に配置
        # lineHeight = 38 → 109px (2.88倍)
        char_height = 109  # lineHeight相当
        column_spacing = 90  # 列間隔を狭く

        # 縦書き詩の高さを計算
        upper_lines = upper_text.split('\n') if upper_text else []
        lower_lines = lower_text.split('\n')
        max_upper_chars = max((len(line.strip()) for line in upper_lines), default=0)
        max_lower_chars = max((len(line.strip()) for line in lower_lines), default=0)
        max_chars = max(max_upper_chars, max_lower_chars)
        poem_height = max_chars * char_height

        # フッター領域のサイズ（spacing.mdスケール: 16 * 2.88 ≈ 46）
        spacing_md = 46
        footer_total_height = 35 + spacing_md + 1 + spacing_md + 35 + spacing_md  # 作者名 + margin + 線 + margin + よみびより + margin

        # 詩を中央に配置
        available_height = inner_y2 - inner_y1 - (self.INNER_PADDING * 2) - footer_total_height
        poem_start_y = content_y + (available_height - poem_height) // 2

        # 白い内側カードの中心を使用（画像全体の中心ではなく）
        card_center_x = (inner_x1 + inner_x2) // 2

        # 上の句と下の句の間隔（上の句と下の句の中心間の距離の半分）
        upper_lower_gap = 150  # 上の句と下の句の間隔

        # 各詩の列数を計算（改行で分割した数）
        upper_columns = len(upper_lines)
        lower_columns = len(lower_lines)

        # 各詩の実際の幅を計算（列数 - 1）× column_spacing
        # start_xは最初の列（右端）の位置なので、幅は左方向に広がる
        upper_width = (upper_columns - 1) * column_spacing if upper_columns > 0 else 0
        lower_width = (lower_columns - 1) * column_spacing if lower_columns > 0 else 0

        # 上の句（右側）- 視覚的な中心がcard_center_x + upper_lower_gapになるように配置
        # start_xは右端なので、中心位置 + (幅の半分)の位置に配置
        if upper_text:
            upper_center_target = card_center_x + upper_lower_gap
            upper_start_x = upper_center_target + (upper_width // 2)
            self._draw_vertical_text_multiline(
                img, draw, upper_text, upper_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, char_height, column_spacing
            )

        # 下の句（左側）- 視覚的な中心がcard_center_x - upper_lower_gapになるように配置
        lower_center_target = card_center_x - upper_lower_gap
        lower_start_x = lower_center_target + (lower_width // 2)
        self._draw_vertical_text_multiline(
            img, draw, lower_text, lower_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, char_height, column_spacing
        )

        # フッター: 下部から逆算
        author_y = inner_y2 - self.INNER_PADDING - footer_total_height + spacing_md

        # 作者名（@付き）
        author_text = f"@{author_name}"
        draw.text((content_x, author_y), author_text, font=font_author, fill=self.TEXT_SECONDARY)

        # 区切り線（より濃い色に変更）
        divider_y = author_y + 35 + spacing_md
        draw.line(
            [(content_x, divider_y), (inner_x2 - self.INNER_PADDING, divider_y)],
            fill=(220, 220, 220),  # より濃いグレー
            width=2  # 太くする
        )

        # よみびより（右下）
        footer_y = divider_y + spacing_md
        app_name = "よみびより"
        bbox = draw.textbbox((0, 0), app_name, font=font_meta)
        app_name_width = bbox[2] - bbox[0]
        draw.text(
            (inner_x2 - self.INNER_PADDING - app_name_width, footer_y),
            app_name,
            font=font_meta,
            fill=self.TEXT_SECONDARY
        )

        # BytesIOに保存（PNG最適化）
        output = BytesIO()
        img.save(output, format="PNG", quality=85, optimize=True)
        output.seek(0)

        return output
