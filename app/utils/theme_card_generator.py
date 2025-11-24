"""
お題(Theme)共有カード画像生成ユーティリティ
ShareCardGeneratorを拡張し、お題のみの画像を生成
"""

from io import BytesIO
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
from app.utils.share_card_generator import ShareCardGenerator


class ThemeCardGenerator(ShareCardGenerator):
    """お題専用共有カード画像生成クラス"""

    def generate_theme_card(
        self,
        theme_text: str,
        category: str,
        category_label: str,
        date_label: str,
    ) -> BytesIO:
        """
        お題専用の共有カード画像を生成（上の句のみ）

        Args:
            theme_text: お題テキスト（上の句）
            category: カテゴリ（romance/season/daily/humor）
            category_label: カテゴリラベル（恋愛/季節/日常/ユーモア）
            date_label: 日付ラベル（YYYY/MM/DD形式）

        Returns:
            BytesIO: PNG画像のバイトストリーム
        """
        # カテゴリカラーの背景
        gradient_colors = self.COLORS.get(category_label, {}).get(
            "gradient", self.DEFAULT_GRADIENT
        )
        bg_color = self._hex_to_rgb(gradient_colors[0])
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=bg_color)
        draw = ImageDraw.Draw(img)

        # 白い内側カード
        inner_x1 = self.OUTER_PADDING
        inner_y1 = self.OUTER_PADDING
        inner_x2 = self.WIDTH - self.OUTER_PADDING
        inner_y2 = self.HEIGHT - self.OUTER_PADDING

        draw.rounded_rectangle(
            [inner_x1, inner_y1, inner_x2, inner_y2],
            radius=24,
            fill=(255, 255, 255)
        )

        # フォント準備
        font_poem = self._get_font(58)
        font_meta = self._get_font(35)
        font_category = self._get_font(40)

        # レイアウト定数
        content_x = inner_x1 + self.INNER_PADDING
        content_y = inner_y1 + self.INNER_PADDING
        char_height = 109
        column_spacing = 90

        # 上部にカテゴリバッジを配置
        category_badge_y = content_y
        # 絵文字はフォントが対応していないため、カテゴリラベルのみ表示
        category_text = f"【{category_label}】"
        draw.text(
            (content_x, category_badge_y),
            category_text,
            font=font_category,
            fill=self.TEXT_ACCENT
        )

        # 詩の配置: 中央
        theme_lines = theme_text.split('\n')
        max_chars = max((len(line.strip()) for line in theme_lines), default=0)
        poem_height = max_chars * char_height

        # フッター領域のサイズ
        spacing_md = 46
        footer_total_height = 35 + spacing_md + 1 + spacing_md + 35 + spacing_md

        # 詩を中央に配置
        available_height = inner_y2 - inner_y1 - (self.INNER_PADDING * 2) - footer_total_height - 100  # カテゴリバッジ分のスペース
        poem_start_y = content_y + 100 + (available_height - poem_height) // 2

        # 白い内側カードの中心
        card_center_x = (inner_x1 + inner_x2) // 2

        # 詩の列数を計算
        theme_columns = len(theme_lines)
        theme_width = (theme_columns - 1) * column_spacing if theme_columns > 0 else 0

        # お題を中央に配置
        theme_start_x = card_center_x + (theme_width // 2)
        self._draw_vertical_text_multiline(
            img, draw, theme_text, theme_start_x, poem_start_y,
            font_poem, self.TEXT_PRIMARY, char_height, column_spacing
        )

        # フッター: 下部から逆算
        footer_base_y = inner_y2 - self.INNER_PADDING - footer_total_height + spacing_md

        # 日付（左下）
        draw.text((content_x, footer_base_y), date_label, font=font_meta, fill=self.TEXT_SECONDARY)

        # 区切り線
        divider_y = footer_base_y + 35 + spacing_md
        draw.line(
            [(content_x, divider_y), (inner_x2 - self.INNER_PADDING, divider_y)],
            fill=(220, 220, 220),
            width=2
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

        # BytesIOに保存
        output = BytesIO()
        img.save(output, format="PNG", quality=85, optimize=True)
        output.seek(0)

        return output
