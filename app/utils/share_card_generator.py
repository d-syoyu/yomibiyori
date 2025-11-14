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

    # カラー定義（モバイルのthemeと同じ）
    COLORS = {
        "恋愛": {"gradient": ["#6B7B4F", "#93A36C"]},
        "季節": {"gradient": ["#4F6B7B", "#6C8A93"]},
        "日常": {"gradient": ["#7B6B4F", "#A3936C"]},
        "ユーモア": {"gradient": ["#7B4F6B", "#A36C93"]},
    }

    # デフォルトカラー
    DEFAULT_GRADIENT = ["#6B7B4F", "#93A36C"]

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

        # 日本語フォントを優先的に探す
        possible_paths = [
            # Noto CJK fonts (日本語対応) - Railway/Linux
            "/usr/share/fonts/opentype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc",
            # Windows paths
            "C:\\Windows\\Fonts\\msgothic.ttc",
            "C:\\Windows\\Fonts\\msmincho.ttc",
            "C:\\Windows\\Fonts\\yugothic.ttf",
            "C:\\Windows\\Fonts\\meiryo.ttc",
            # macOS paths
            "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/Library/Fonts/Osaka.ttf",
            # Project paths
            "./fonts/NotoSerifJP-Regular.otf",
            "./fonts/NotoSansCJK-Regular.ttc",
        ]

        # 直接パスをチェック
        for path in possible_paths:
            if os.path.exists(path):
                return path

        # Nix storeをglobで検索
        nix_patterns = [
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
        # 画像作成
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color="white")

        # グラデーション背景
        gradient_colors = self.COLORS.get(category_label, {}).get(
            "gradient", self.DEFAULT_GRADIENT
        )
        img = self._create_gradient_background(img, gradient_colors)

        # 半透明オーバーレイ用の新しいイメージ
        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # 白い内側の矩形
        inner_x1 = self.OUTER_PADDING
        inner_y1 = self.OUTER_PADDING
        inner_x2 = self.WIDTH - self.OUTER_PADDING
        inner_y2 = self.HEIGHT - self.OUTER_PADDING

        overlay_draw.rounded_rectangle(
            [inner_x1, inner_y1, inner_x2, inner_y2], radius=24, fill=self.OVERLAY_BG
        )

        # オーバーレイを合成
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(img)

        # フォント準備
        font_poem = self._get_font(36)  # 詩用フォント
        font_author = self._get_font(24)  # 作者名用
        font_meta = self._get_font(18)  # メタ情報用
        font_caption = self._get_font(20)  # キャプション用

        # コンテンツ領域の開始位置
        content_x = inner_x1 + self.INNER_PADDING
        content_y = inner_y1 + self.INNER_PADDING
        content_width = inner_x2 - inner_x1 - (self.INNER_PADDING * 2)

        # Y座標を追跡
        current_y = content_y

        # バッジ（オプション）
        if badge_label:
            badge_padding_x = 16
            badge_padding_y = 8
            bbox = draw.textbbox((0, 0), badge_label, font=font_meta)
            badge_width = (bbox[2] - bbox[0]) + (badge_padding_x * 2)
            badge_height = (bbox[3] - bbox[1]) + (badge_padding_y * 2)

            draw.rounded_rectangle(
                [
                    content_x,
                    current_y,
                    content_x + badge_width,
                    current_y + badge_height,
                ],
                radius=8,
                fill=self.BADGE_BG,
            )
            draw.text(
                (content_x + badge_padding_x, current_y + badge_padding_y),
                badge_label,
                font=font_meta,
                fill=self.TEXT_ACCENT,
            )
            current_y += badge_height + self.CONTENT_GAP

        # キャプション（オプション）
        if caption:
            draw.text(
                (content_x, current_y),
                caption,
                font=font_caption,
                fill=self.TEXT_SECONDARY,
            )
            current_y += 30 + self.CONTENT_GAP

        # 縦書き詩（中央）
        poem_start_y = current_y + 50
        poem_center_x = self.WIDTH // 2

        # 下の句（右側）
        lower_start_x = poem_center_x + 50
        self._draw_vertical_text_multiline(
            draw, lower_text, lower_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, 42, 60
        )

        # 上の句（左側）
        if upper_text:
            upper_start_x = poem_center_x - 60
            self._draw_vertical_text_multiline(
                draw, upper_text, upper_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, 42, 60
            )

        # メタ情報エリア（下部）
        meta_y = inner_y2 - self.INNER_PADDING - 110
        meta_x = content_x

        # 作者名
        draw.text((meta_x, meta_y), author_name, font=font_author, fill=self.TEXT_PRIMARY)

        # カテゴリと日付
        meta_text = f"{category_label} / {date_label}"
        draw.text((meta_x, meta_y + 35), meta_text, font=font_meta, fill=self.TEXT_TERTIARY)

        # 右側の統計情報
        if likes_label:
            bbox = draw.textbbox((0, 0), likes_label, font=font_meta)
            text_width = bbox[2] - bbox[0]
            draw.text(
                (inner_x2 - self.INNER_PADDING - text_width, meta_y),
                likes_label,
                font=font_meta,
                fill=self.TEXT_ACCENT,
            )

        if score_label:
            bbox = draw.textbbox((0, 0), score_label, font=font_meta)
            text_width = bbox[2] - bbox[0]
            draw.text(
                (inner_x2 - self.INNER_PADDING - text_width, meta_y + 24),
                score_label,
                font=font_meta,
                fill=self.TEXT_ACCENT,
            )

        # フッター
        footer_y = inner_y2 - self.INNER_PADDING - 45
        draw.text((meta_x, footer_y), "よみびより", font=font_author, fill=self.TEXT_PRIMARY)

        footer_url = "yomibiyori.com"
        bbox = draw.textbbox((0, 0), footer_url, font=font_meta)
        url_width = bbox[2] - bbox[0]
        draw.text(
            (inner_x2 - self.INNER_PADDING - url_width, footer_y),
            footer_url,
            font=font_meta,
            fill=self.TEXT_PRIMARY,
        )

        # BytesIOに保存（PNG最適化）
        output = BytesIO()
        img.save(output, format="PNG", quality=85, optimize=True)
        output.seek(0)

        return output
