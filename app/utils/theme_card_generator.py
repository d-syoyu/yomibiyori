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
        お題専用の共有カード画像を生成（上の句のみ）- 短冊スタイル

        Args:
            theme_text: お題テキスト（上の句）
            category: カテゴリ（romance/season/daily/humor）
            category_label: カテゴリラベル（恋愛/季節/日常/ユーモア）
            date_label: 日付ラベル（YYYY/MM/DD形式）

        Returns:
            BytesIO: PNG画像のバイトストリーム
        """
        # カテゴリのアクセントカラーを取得
        accent_color_hex = self.COLORS.get(category_label, {}).get("primary", self.DEFAULT_COLOR)
        accent_color = self._hex_to_rgb(accent_color_hex)

        # 和紙色の背景
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=self.BG_WASHI)
        draw = ImageDraw.Draw(img)

        # カードの座標
        card_x1 = self.OUTER_PADDING
        card_y1 = self.OUTER_PADDING
        card_x2 = self.WIDTH - self.OUTER_PADDING
        card_y2 = self.HEIGHT - self.OUTER_PADDING

        # 白いカード本体
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y2],
            radius=20,
            fill=self.CARD_WHITE,
        )

        # 上部のアクセントボーダー（短冊風）
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y1 + 40],
            radius=20,
            fill=accent_color,
        )
        draw.rectangle(
            [card_x1, card_y1 + self.ACCENT_BORDER_HEIGHT, card_x2, card_y1 + 40],
            fill=self.CARD_WHITE,
        )

        # フォント準備
        font_poem = self._get_font(58)
        font_meta = self._get_font(35)
        font_category = self._get_font(40)
        font_small = self._get_font(24)

        # コンテンツエリア
        content_x = card_x1 + self.INNER_PADDING
        content_y = card_y1 + self.INNER_PADDING + self.ACCENT_BORDER_HEIGHT
        char_height = 109
        column_spacing = 90

        # 上部にカテゴリバッジを配置
        category_text = f"【{category_label}】"
        draw.text(
            (content_x, content_y),
            category_text,
            font=font_category,
            fill=self.TEXT_ACCENT
        )

        # 詩の配置: 中央
        theme_lines = theme_text.split('\n')
        # 正確な高さを計算
        poem_height = max((self._calculate_line_height(line, font_poem, char_height) for line in theme_lines), default=0)

        # フッター領域のサイズ
        footer_height = 180
        category_area_height = 80

        # 詩を中央に配置
        available_height = card_y2 - card_y1 - self.INNER_PADDING - self.ACCENT_BORDER_HEIGHT - footer_height - category_area_height
        poem_start_y = content_y + category_area_height + (available_height - poem_height) // 2

        # カードの中心
        card_center_x = (card_x1 + card_x2) // 2

        # 詩の列数を計算
        theme_columns = len(theme_lines)
        theme_width = (theme_columns - 1) * column_spacing if theme_columns > 0 else 0

        # お題を中央に配置
        theme_start_x = card_center_x + (theme_width // 2)
        self._draw_vertical_text_multiline(
            img, draw, theme_text, theme_start_x, poem_start_y,
            font_poem, self.TEXT_PRIMARY, char_height, column_spacing
        )

        # フッター
        footer_base_y = card_y2 - footer_height

        # 日付（左下）
        draw.text((content_x, footer_base_y), date_label, font=font_meta, fill=self.TEXT_SECONDARY)

        # 区切り線
        divider_y = footer_base_y + 50
        draw.line(
            [(content_x, divider_y), (card_x2 - self.INNER_PADDING, divider_y)],
            fill=(230, 230, 230),
            width=1
        )

        # アプリ名（右寄せ）
        footer_y = divider_y + 30
        app_name = "よみびより"

        bbox_name = draw.textbbox((0, 0), app_name, font=font_meta)
        name_width = bbox_name[2] - bbox_name[0]

        right_margin = card_x2 - self.INNER_PADDING
        draw.text((right_margin - name_width, footer_y + 8), app_name, font=font_meta, fill=self.TEXT_PRIMARY)

        # BytesIOに保存
        output = BytesIO()
        img.save(output, format="PNG", quality=85, optimize=True)
        output.seek(0)

        return output
