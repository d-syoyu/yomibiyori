# -*- coding: utf-8 -*-
"""
Share card image generator.
Creates a vertical Japanese poem card as PNG for sharing.

引用符で囲まれた部分は横書きブロックとして90度回転表示
"""

from __future__ import annotations

from io import BytesIO
from typing import Optional, List, Tuple
from PIL import Image, ImageDraw, ImageFont
import glob
import os
import subprocess


# 縦書き用Unicode文字への置換マップ
# 括弧類は回転ではなく縦書き専用文字に置換
VERTICAL_CHAR_MAP = {
    "「": "﹁",
    "」": "﹂",
    "『": "﹃",
    "』": "﹄",
    "（": "︵",
    "）": "︶",
    "(": "︵",
    ")": "︶",
    "【": "︻",
    "】": "︼",
    "〔": "︹",
    "〕": "︺",
    "〈": "︿",
    "〉": "﹀",
    "《": "︽",
    "》": "︾",
    "［": "﹇",
    "］": "﹈",
    "[": "﹇",
    "]": "﹈",
    "｛": "︷",
    "｝": "︸",
    "{": "︷",
    "}": "︸",
}


class ShareCardGenerator:
    """Generate share card images."""

    # Canvas size (Instagram 4:5 aspect ratio)
    WIDTH = 1080
    HEIGHT = 1350

    # Gradient palette keyed by category label
    COLORS = {
        "恋愛": {"primary": "#FFB7C5"},  # sakura
        "季節": {"primary": "#88B04B"},  # matcha
        "日常": {"primary": "#A7D8DE"},  # sora
        "ユーモア": {"primary": "#F0E68C"}, # kin
    }
    DEFAULT_COLOR = "#FFB7C5"

    # Layout constants
    OUTER_PADDING = 60
    
    # Colors
    BG_COLOR_WASHI = (245, 243, 237)  # #F5F3ED
    CARD_COLOR = (255, 255, 255)      # #FFFFFF
    TEXT_PRIMARY = (107, 123, 79)     # igusa
    TEXT_SECONDARY = (123, 138, 88)   # igusa medium
    TEXT_TERTIARY = (147, 163, 108)   # igusa light
    TEXT_ACCENT = (26, 54, 93)        # ai

    def __init__(self) -> None:
        self.font_path = self._find_font()

    def _find_font(self) -> Optional[str]:
        """Find a Japanese font on the system or bundled fonts."""
        possible_paths = [
            # Project bundled fonts
            "/app/fonts/NotoSerifCJKjp-Regular.otf",
            "./fonts/NotoSerifCJKjp-Regular.otf",
            "fonts/NotoSerifCJKjp-Regular.otf",
            # Noto Serif CJK (Linux)
            "/usr/share/fonts/opentype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc",
            # Noto Sans CJK fallback
            "/usr/share/fonts/opentype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            # Windows fallbacks
            "C:\\Windows\\Fonts\\msmincho.ttc",
            "C:\\Windows\\Fonts\\msgothic.ttc",
            "C:\\Windows\\Fonts\\yugothic.ttf",
            "C:\\Windows\\Fonts\\meiryo.ttc",
            # macOS fallbacks
            "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/Library/Fonts/Osaka.ttf",
        ]

        for path in possible_paths:
            if os.path.exists(path):
                return path

        # Nix store (Serif priority, then Sans)
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

        # Fallback: ask fontconfig for any Japanese font
        try:
            result = subprocess.run(
                ["fc-list", ":lang=ja", "file"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if result.returncode == 0 and result.stdout:
                for line in result.stdout.strip().splitlines():
                    font_path = line.split(":")[0].strip()
                    if os.path.exists(font_path):
                        return font_path
        except Exception:
            pass

        return None

    def _get_font(self, size: int) -> ImageFont.FreeTypeFont:
        if not self.font_path:
            raise RuntimeError("Japanese font is required but not found on system")
        return ImageFont.truetype(self.font_path, size)

    @staticmethod
    def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
        hex_color = hex_color.lstrip("#")
        return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

    @staticmethod
    def _needs_rotation(char: str) -> bool:
        """縦書き時に90度回転が必要な文字を判定"""
        dash_chars = ["ー", "―", "－", "‐", "ｰ", "—", "−", "–"]
        wave_chars = ["〜", "～", "〰"]
        ellipsis_chars = ["…", "‥", "⋯"]
        symbol_chars = [":", ";", "：", "；", "→", "←", "↔", "=", "＝"]
        rotation_chars = set(dash_chars + wave_chars + ellipsis_chars + symbol_chars)
        return char in rotation_chars

    @staticmethod
    def _get_vertical_char(char: str) -> str:
        """縦書き用の文字に変換（置換が必要な文字のみ）"""
        return VERTICAL_CHAR_MAP.get(char, char)

    @staticmethod
    def _needs_position_adjustment_top_right(char: str) -> bool:
        """縦書き時に右上に位置調整が必要な文字（句読点）"""
        chars = ["、", "，", "。", "．"]
        return char in chars

    @staticmethod
    def _is_opening_quote(char: str) -> bool:
        """開き引用符かどうかを判定（Unicodeコードポイントで判定）"""
        code = ord(char)
        return code in (0x0022, 0x0027, 0x201C, 0x2018)

    @staticmethod
    def _is_closing_quote(char: str) -> bool:
        """閉じ引用符かどうかを判定（Unicodeコードポイントで判定）"""
        code = ord(char)
        return code in (0x0022, 0x0027, 0x201D, 0x2019)

    @staticmethod
    def _get_matching_close_quote(open_quote: str) -> str:
        """開き引用符に対応する閉じ引用符を取得"""
        code = ord(open_quote)
        if code == 0x201C:
            return chr(0x201D)
        elif code == 0x0022:
            return '"'
        elif code == 0x2018:
            return chr(0x2019)
        elif code == 0x0027:
            return "'"
        return open_quote

    @staticmethod
    def _parse_text_with_quotes(text: str) -> List[Tuple[str, str]]:
        """テキストを引用部分と通常部分に分割

        Returns:
            List of tuples: (type, content) where type is 'normal' or 'quoted'
        """
        segments = []
        current_segment = ""
        in_quote = False
        quote_char = ""

        for char in text:
            if not in_quote and ShareCardGenerator._is_opening_quote(char):
                if current_segment:
                    segments.append(("normal", current_segment))
                    current_segment = ""
                in_quote = True
                quote_char = char
                current_segment = char
            elif in_quote and ShareCardGenerator._is_closing_quote(char):
                expected_close = ShareCardGenerator._get_matching_close_quote(quote_char)
                if char == expected_close or char == quote_char:
                    current_segment += char
                    segments.append(("quoted", current_segment))
                    current_segment = ""
                    in_quote = False
                    quote_char = ""
                else:
                    current_segment += char
            else:
                current_segment += char

        if current_segment:
            segments.append(("quoted" if in_quote else "normal", current_segment))

        return segments

    def _draw_rotated_char(
        self,
        img: Image.Image,
        char: str,
        x: int,
        y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int] | tuple[int, int, int, int],
        angle: int = 90,
    ) -> None:
        """回転した文字を描画する"""
        temp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        bbox = temp_draw.textbbox((0, 0), char, font=font)
        char_width = bbox[2] - bbox[0]
        char_height = bbox[3] - bbox[1]
        if char_width <= 0 or char_height <= 0:
            return

        padding = 20
        temp_width = char_width + padding * 2
        temp_height = char_height + padding * 2
        temp_img = Image.new("RGBA", (temp_width, temp_height), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp_img)

        fill_rgba = fill if len(fill) == 4 else (fill[0], fill[1], fill[2], 255)
        temp_draw.text((padding - bbox[0], padding - bbox[1]), char, font=font, fill=fill_rgba)
        rotated = temp_img.rotate(angle, expand=True, resample=Image.BICUBIC)
        rotated_width, rotated_height = rotated.size
        paste_x = x - (rotated_width // 2)
        paste_y = y
        img.paste(rotated, (paste_x, paste_y), rotated)

    def _draw_rotated_text(
        self,
        img: Image.Image,
        text: str,
        x: int,
        y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int] | tuple[int, int, int, int],
        angle: int = 90,
    ) -> int:
        """回転したテキストブロックを描画し、使用した高さを返す"""
        temp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        bbox = temp_draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        if text_width <= 0 or text_height <= 0:
            return 0

        padding = 20
        temp_width = text_width + padding * 2
        temp_height = text_height + padding * 2
        temp_img = Image.new("RGBA", (temp_width, temp_height), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp_img)

        fill_rgba = fill if len(fill) == 4 else (fill[0], fill[1], fill[2], 255)
        temp_draw.text((padding - bbox[0], padding - bbox[1]), text, font=font, fill=fill_rgba)
        rotated = temp_img.rotate(angle, expand=True, resample=Image.BICUBIC)
        rotated_width, rotated_height = rotated.size
        paste_x = x - (rotated_width // 2)
        paste_y = y
        img.paste(rotated, (paste_x, paste_y), rotated)

        # 回転後の高さを返す（元のテキスト幅が高さになる）
        return text_width

    def _draw_vertical_text_multiline(
        self,
        img: Image.Image,
        draw: ImageDraw.ImageDraw,
        text: str,
        start_x: int,
        start_y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int],
        char_height: int = 38,
        column_spacing: int = 50,
    ) -> None:
        lines = text.split("\n")
        current_x = start_x

        for line in lines:
            current_y = start_y
            # 引用部分と通常部分に分割
            segments = self._parse_text_with_quotes(line.strip())

            for segment_type, segment_content in segments:
                if segment_type == "quoted":
                    # 引用部分: 横書きテキストを90度回転
                    quoted_font = self._get_font(int(font.size * 0.8))
                    block_height = self._draw_rotated_text(
                        img, segment_content, current_x, current_y, quoted_font, fill, angle=90
                    )
                    current_y += block_height + 10
                else:
                    # 通常部分: 1文字ずつ縦に配置
                    for char in segment_content:
                        display_char = self._get_vertical_char(char)

                        if self._needs_rotation(char):
                            self._draw_rotated_char(img, display_char, current_x, current_y, font, fill)
                        elif self._needs_position_adjustment_top_right(char):
                            bbox = draw.textbbox((0, 0), display_char, font=font)
                            char_width = bbox[2] - bbox[0]
                            offset = int(char_height * 0.25)
                            char_x = current_x - (char_width // 2) + offset
                            char_y = current_y - offset
                            draw.text((char_x, char_y), display_char, font=font, fill=fill)
                        else:
                            bbox = draw.textbbox((0, 0), display_char, font=font)
                            char_width = bbox[2] - bbox[0]
                            char_x = current_x - (char_width // 2)
                            draw.text((char_x, current_y), display_char, font=font, fill=fill)

                        current_y += char_height

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
        sponsor_name: Optional[str] = None,
    ) -> BytesIO:
        """Generate a share card image."""
        # Determine category color
        primary_color_hex = self.COLORS.get(category_label, {}).get("primary", self.DEFAULT_COLOR)
        accent_color = self._hex_to_rgb(primary_color_hex)

        # Create background (Washi)
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=self.BG_COLOR_WASHI)
        draw = ImageDraw.Draw(img)

        # Calculate card dimensions
        card_x1 = self.OUTER_PADDING
        card_y1 = self.OUTER_PADDING
        card_x2 = self.WIDTH - self.OUTER_PADDING
        card_y2 = self.HEIGHT - self.OUTER_PADDING

        # Draw Card (White)
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y2],
            radius=24,
            fill=self.CARD_COLOR,
        )

        # Draw Top Accent Border
        # Since rounded_rectangle doesn't support top-only borders easily with fill,
        # we draw a rect and then re-draw the top rounded corners if needed,
        # or just draw a thin rect at the top.
        # Here we will draw a simple rect for the bar.
        border_height = 16
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y1 + border_height * 2], # extend down slightly
            radius=24,
            fill=accent_color,
            corners=(True, True, False, False) # PIL 10.0+ supports corners? No, it supports `radius`.
        )
        # Clean up the bottom part of the border to make it a strip
        draw.rectangle(
            [card_x1, card_y1 + border_height, card_x2, card_y1 + border_height * 2],
            fill=accent_color
        )
        # Cover the bottom part with white to make it sharp? 
        # No, let's just draw a simple rectangle inside the rounded card if we can't clip perfectly.
        # Actually, drawing a filled rounded rect first, then drawing content is fine.
        # Let's just draw a rect that fits the top.
        
        # Redraw the top part correctly:
        # 1. White Card (Done)
        # 2. Top Strip: Draw a rounded rect of color, then a white rect over the bottom of it?
        # Better: Draw the accent color rounded rect at the top
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y1 + 30],
            radius=24,
            fill=accent_color
        )
        # Cover the bottom half of that rounded rect to make it straight
        draw.rectangle(
            [card_x1, card_y1 + 16, card_x2, card_y1 + 30],
            fill=accent_color
        )
        # Now the card body is white, but we just painted over the top.
        # The card body needs to be drawn AFTER the top strip if we want the body to be on bottom?
        # No, the strip is ON TOP of the card.
        
        # Let's restart the drawing layers for clarity:
        # 1. Background (Washi)
        # 2. Card Shadow (skipped for simplicity in PIL, or draw a gray rect offset)
        # 3. Card Body (White Rounded Rect)
        # 4. Top Strip (Colored, Rounded Top corners, straight bottom)
        
        # 2. Shadow
        shadow_offset = 8
        draw.rounded_rectangle(
            [card_x1 + 4, card_y1 + 8, card_x2 + 4, card_y2 + 8],
            radius=24,
            fill=(0, 0, 0, 15) # Very light shadow
        )
        
        # 3. Body
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y2],
            radius=24,
            fill=self.CARD_COLOR,
        )

        # 4. Top Strip
        # Draw a rounded rect for the top part
        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y1 + 32], # taller than needed
            radius=24,
            fill=accent_color
        )
        # Cover the bottom part of that rect with white (effectively cropping it to a strip)
        # Wait, we want the strip to be visible.
        # If we want a 16px strip:
        # Draw rounded rect (height 32), then cover y=16 to 32 with white?
        # No, the strip is ON the card.
        # Just draw the bottom part of the strip as a rect to fill the rounded corners at the bottom of the strip?
        # No, we want the TOP corners to be rounded (matching the card), and the BOTTOM of the strip to be straight.
        draw.rectangle(
            [card_x1, card_y1 + 16, card_x2, card_y1 + 32],
            fill=self.CARD_COLOR
        )
        # Re-fill the strip area that might have been covered?
        # Let's try this:
        # Draw rounded rect for the top area (height 32).
        # Draw a rectangle for the bottom half of that area (y+16 to y+32) with WHITE.
        # This leaves the top 16px colored (with top rounded corners).
        # This works.

        # Fonts
        font_poem = self._get_font(58)
        font_author = self._get_font(35)
        font_meta = self._get_font(35)
        font_badge = self._get_font(30)
        font_caption = self._get_font(30)

        # Content Area
        content_x = card_x1 + 50 # Inner padding
        content_y = card_y1 + 50

        # Badge
        if badge_label:
            # Draw badge background
            badge_w = 400
            badge_h = 60
            draw.rounded_rectangle(
                [content_x, content_y, content_x + badge_w, content_y + badge_h],
                radius=8,
                fill=self.BADGE_BG
            )
            draw.text((content_x + 20, content_y + 10), badge_label, font=font_badge, fill=self.TEXT_SECONDARY)
            # Update content_y if badge exists
            # content_y += 80

        # Caption
        if caption:
            caption_y = content_y + 80 if badge_label else content_y
            draw.text((content_x, caption_y), caption, font=font_caption, fill=self.TEXT_SECONDARY)

        # Poem Layout
        char_height = 109
        column_spacing = 90
        
        upper_lines = upper_text.split("\n") if upper_text else []
        lower_lines = lower_text.split("\n")
        max_upper_chars = max((len(line.strip()) for line in upper_lines), default=0)
        max_lower_chars = max((len(line.strip()) for line in lower_lines), default=0)
        max_chars = max(max_upper_chars, max_lower_chars)
        poem_height = max_chars * char_height

        footer_height = 200
        available_height = card_y2 - card_y1 - footer_height
        poem_start_y = card_y1 + (available_height - poem_height) // 2 + 50

        card_center_x = (card_x1 + card_x2) // 2
        upper_lower_gap = 150
        upper_columns = len(upper_lines)
        lower_columns = len(lower_lines)
        upper_width = (upper_columns - 1) * column_spacing if upper_columns > 0 else 0
        lower_width = (lower_columns - 1) * column_spacing if lower_columns > 0 else 0

        if upper_text:
            upper_center_target = card_center_x + upper_lower_gap
            upper_start_x = upper_center_target + (upper_width // 2)
            self._draw_vertical_text_multiline(
                img, draw, upper_text, upper_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, char_height, column_spacing
            )

        lower_center_target = card_center_x - upper_lower_gap
        lower_start_x = lower_center_target + (lower_width // 2)
        self._draw_vertical_text_multiline(
            img, draw, lower_text, lower_start_x, poem_start_y, font_poem, self.TEXT_PRIMARY, char_height, column_spacing
        )

        # Author
        author_y = card_y2 - 250
        author_text = f"@{author_name}"
        draw.text((content_x, author_y), author_text, font=font_author, fill=self.TEXT_SECONDARY)

        # Divider
        divider_y = author_y + 60
        draw.line(
            [(content_x, divider_y), (card_x2 - 50, divider_y)],
            fill=(220, 220, 220),
            width=2,
        )

        # Footer
        footer_y = divider_y + 40
        if sponsor_name:
            # "提供" label
            draw.text((content_x, footer_y + 5), "提供", font=self._get_font(24), fill=self.TEXT_TERTIARY)
            # Sponsor Name
            draw.text((content_x + 60, footer_y), sponsor_name, font=font_meta, fill=self.TEXT_SECONDARY)

        # App Name (Right aligned)
        app_name = "よみびより"
        app_url = "yomibiyori.com"
        
        bbox_name = draw.textbbox((0, 0), app_name, font=font_meta)
        name_w = bbox_name[2] - bbox_name[0]
        
        bbox_url = draw.textbbox((0, 0), app_url, font=self._get_font(24))
        url_w = bbox_url[2] - bbox_url[0]
        
        right_margin = card_x2 - 50
        
        draw.text((right_margin - name_w, footer_y - 10), app_name, font=font_meta, fill=self.TEXT_PRIMARY)
        draw.text((right_margin - url_w, footer_y + 35), app_url, font=self._get_font(24), fill=self.TEXT_TERTIARY)

        output = BytesIO()
        img.save(output, format="PNG", quality=85, optimize=True)
        return output
