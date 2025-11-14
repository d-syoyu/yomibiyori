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

    # 画像サイズ
    WIDTH = 1080
    HEIGHT = 1920

    # カラー定義
    COLORS = {
        "romance": {"gradient": ["#6B7B4F", "#93A36C"]},
        "season": {"gradient": ["#4F6B7B", "#6C8A93"]},
        "daily": {"gradient": ["#7B6B4F", "#A3936C"]},
        "humor": {"gradient": ["#7B4F6B", "#A36C93"]},
    }

    # デフォルトカラー
    DEFAULT_GRADIENT = ["#6B7B4F", "#93A36C"]

    # パディング
    PADDING = 40
    INNER_PADDING = 32

    # テキストカラー
    TEXT_PRIMARY = "#1A1A1A"
    TEXT_SECONDARY = "#666666"
    TEXT_TERTIARY = "#999999"
    TEXT_ACCENT = "#1A365D"
    BG_WHITE = "#FFFFFF"

    def __init__(self):
        """フォントパスを初期化"""
        # Noto Serif JPフォントのパス（システムまたはプロジェクト内）
        self.font_path = self._find_font()

    def _find_font(self) -> Optional[str]:
        """システムからNoto Serif JPフォントを探す"""
        possible_paths = [
            # Linux paths (Railway, Ubuntu, etc.)
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            # macOS paths
            "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            # Windows paths
            "C:\\Windows\\Fonts\\msgothic.ttc",  # Windows MS Gothic
            "C:\\Windows\\Fonts\\msmincho.ttc",  # Windows MS Mincho
            # Project paths
            "./fonts/NotoSerifJP-Regular.otf",
        ]

        for path in possible_paths:
            if os.path.exists(path):
                return path

        return None  # システムデフォルトフォントを使用

    def _get_font(self, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
        """指定サイズのフォントを取得"""
        try:
            if self.font_path:
                return ImageFont.truetype(self.font_path, size)
            else:
                # フォントが見つからない場合はデフォルトフォント
                return ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()

    def _create_gradient_background(
        self, img: Image.Image, colors: list[str]
    ) -> Image.Image:
        """グラデーション背景を作成"""
        # 簡易的な線形グラデーション（左上から右下）
        draw = ImageDraw.Draw(img)

        # カラーコードをRGBに変換
        def hex_to_rgb(hex_color: str) -> tuple:
            hex_color = hex_color.lstrip("#")
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

        start_color = hex_to_rgb(colors[0])
        end_color = hex_to_rgb(colors[1])

        # 垂直グラデーション
        for y in range(self.HEIGHT):
            ratio = y / self.HEIGHT
            r = int(start_color[0] + (end_color[0] - start_color[0]) * ratio)
            g = int(start_color[1] + (end_color[1] - start_color[1]) * ratio)
            b = int(start_color[2] + (end_color[2] - start_color[2]) * ratio)
            draw.line([(0, y), (self.WIDTH, y)], fill=(r, g, b))

        return img

    def _draw_text_centered(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        position: tuple[int, int],
        font: ImageFont.FreeTypeFont,
        fill: str,
    ):
        """テキストを描画（中央揃え）"""
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        draw.text(
            (position[0] - text_width // 2, position[1]),
            text,
            font=font,
            fill=fill,
        )

    def _draw_vertical_text(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        x: int,
        y: int,
        font: ImageFont.FreeTypeFont,
        fill: str,
        line_height: int = 50,
    ):
        """縦書きテキストを描画"""
        current_y = y
        for char in text:
            draw.text((x, current_y), char, font=font, fill=fill)
            current_y += line_height

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
        共有カード画像を生成

        Returns:
            BytesIO: PNG画像のバイトストリーム
        """
        # 画像作成
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color="white")

        # グラデーション背景
        gradient_colors = self.COLORS.get(category, {}).get(
            "gradient", self.DEFAULT_GRADIENT
        )
        img = self._create_gradient_background(img, gradient_colors)

        # 白い内側の矩形を描画
        draw = ImageDraw.Draw(img)
        inner_rect = [
            self.PADDING + self.INNER_PADDING,
            self.PADDING + self.INNER_PADDING,
            self.WIDTH - (self.PADDING + self.INNER_PADDING),
            self.HEIGHT - (self.PADDING + self.INNER_PADDING),
        ]
        draw.rounded_rectangle(
            inner_rect, radius=16, fill=(255, 255, 255, int(0.92 * 255))
        )

        # フォント準備
        font_large = self._get_font(36, bold=True)
        font_medium = self._get_font(22, bold=True)
        font_small = self._get_font(18)

        # バッジ（オプション）
        if badge_label:
            badge_x = self.PADDING + self.INNER_PADDING + 24
            badge_y = self.PADDING + self.INNER_PADDING + 24
            draw.rounded_rectangle(
                [badge_x, badge_y, badge_x + 280, badge_y + 48],
                radius=8,
                fill=(26, 54, 93, int(0.08 * 255)),
            )
            draw.text(
                (badge_x + 140, badge_y + 12),
                badge_label,
                font=font_small,
                fill=self.TEXT_ACCENT,
                anchor="mm",
            )

        # キャプション（オプション）
        if caption:
            draw.text(
                (self.PADDING + self.INNER_PADDING + 24, self.PADDING + self.INNER_PADDING + 100),
                caption,
                font=font_small,
                fill=self.TEXT_SECONDARY,
            )

        # 縦書き詩（中央）
        poem_x = self.WIDTH // 2 + 80
        poem_y = self.PADDING + self.INNER_PADDING + 180

        # 下の句（右側・太字）
        self._draw_vertical_text(
            draw, lower_text, poem_x, poem_y, font_large, self.TEXT_PRIMARY, 42
        )

        # 上の句（左側）
        if upper_text:
            self._draw_vertical_text(
                draw, upper_text, poem_x - 70, poem_y, font_medium, self.TEXT_PRIMARY, 38
            )

        # 作者名（左下）
        author_y = self.HEIGHT - self.PADDING - self.INNER_PADDING - 200
        draw.text(
            (self.PADDING + self.INNER_PADDING + 24, author_y),
            author_name,
            font=font_medium,
            fill=self.TEXT_PRIMARY,
        )

        # カテゴリと日付（左下）
        meta_y = self.HEIGHT - self.PADDING - self.INNER_PADDING - 160
        draw.text(
            (self.PADDING + self.INNER_PADDING + 24, meta_y),
            f"{category_label} / {date_label}",
            font=font_small,
            fill=self.TEXT_TERTIARY,
        )

        # いいね数（右下・オプション）
        if likes_label:
            draw.text(
                (self.WIDTH - self.PADDING - self.INNER_PADDING - 24, author_y),
                likes_label,
                font=font_small,
                fill=self.TEXT_ACCENT,
                anchor="rm",
            )

        # スコア（右下・オプション）
        if score_label:
            draw.text(
                (self.WIDTH - self.PADDING - self.INNER_PADDING - 24, meta_y),
                score_label,
                font=font_small,
                fill=self.TEXT_ACCENT,
                anchor="rm",
            )

        # フッター
        footer_y = self.HEIGHT - self.PADDING - self.INNER_PADDING - 60
        draw.text(
            (self.PADDING + self.INNER_PADDING + 24, footer_y),
            "よみびより",
            font=font_medium,
            fill=self.TEXT_PRIMARY,
        )
        draw.text(
            (self.WIDTH - self.PADDING - self.INNER_PADDING - 24, footer_y),
            "yomibiyori.com",
            font=font_small,
            fill=self.TEXT_PRIMARY,
            anchor="rm",
        )

        # BytesIOに保存
        output = BytesIO()
        img.save(output, format="PNG", quality=95)
        output.seek(0)

        return output
