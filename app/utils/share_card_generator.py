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

    # テキストカラー
    TEXT_PRIMARY = (26, 26, 26)  # #1A1A1A
    TEXT_SECONDARY = (102, 102, 102)  # #666666
    TEXT_TERTIARY = (153, 153, 153)  # #999999
    TEXT_ACCENT = (26, 54, 93)  # #1A365D
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
                # 文字を描画
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

        # WorkCardと同じ配置: 詩は上から配置（中央配置は不要）
        poem_start_y = content_y + 60  # 上部に余白
        poem_center_x = self.WIDTH // 2

        # 上の句（右側）- モバイルと同じ配置
        # lineHeight = 38 → 109px (2.88倍), column_spacing も同様にスケール
        char_height = 109  # lineHeight相当
        column_spacing = 144  # spacing.lg * 2.88 ≈ 50px → 144px

        if upper_text:
            upper_start_x = poem_center_x + 100
            self._draw_vertical_text_multiline(
                draw, upper_text, upper_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, char_height, column_spacing
            )

        # 下の句（左側、太字）- モバイルと同じ配置
        lower_start_x = poem_center_x - 100
        self._draw_vertical_text_multiline(
            draw, lower_text, lower_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, char_height, column_spacing
        )

        # WorkCardと同じ構成: 作者名 + 区切り線 + フッター（よみびより）
        # 下部から逆算して配置
        footer_height = 100  # フッター全体の高さ
        author_y = inner_y2 - self.INNER_PADDING - footer_height

        # 作者名（@付き、WorkCardと同じ）
        author_text = f"@{author_name}"
        draw.text((content_x, author_y), author_text, font=font_meta, fill=self.TEXT_SECONDARY)

        # 区切り線（作者名の下、marginVertical相当の間隔）
        divider_y = author_y + 40 + 24  # テキスト高さ + spacing.md
        divider_x1 = content_x
        divider_x2 = inner_x2 - self.INNER_PADDING
        draw.line(
            [(divider_x1, divider_y), (divider_x2, divider_y)],
            fill=(245, 245, 245),  # colors.background.secondary
            width=1
        )

        # フッター: 右に「よみびより」（WorkCardのcustomActions位置）
        footer_y = divider_y + 24  # spacing.md
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
