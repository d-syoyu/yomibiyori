"""
Share card image generator using Pillow.

Generates PNG share images for works and themes. Supports optional background
images (e.g., sponsor-provided artwork) that are resized with a cover fit.
"""

from __future__ import annotations

import glob
import logging
import os
from io import BytesIO
from typing import Optional

import requests
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


class ShareCardGenerator:
    """Image generator for share cards."""

    WIDTH = 1080
    HEIGHT = 1920  # 9:16（アプリ共有カードと統一）

    COLORS = {
        "����": {"gradient": ["#FFB7C5", "#FFE4E8"]},
        "�G��": {"gradient": ["#88B04B", "#A8C98B"]},
        "����": {"gradient": ["#A7D8DE", "#D4ECF0"]},
        "���[���A": {"gradient": ["#F0E68C", "#FFF9C4"]},
    }
    DEFAULT_GRADIENT = ["#FFB7C5", "#FFE4E8"]

    OUTER_PADDING = 40
    INNER_PADDING = 32
    CONTENT_GAP = 24

    TEXT_PRIMARY = (107, 123, 79)
    TEXT_SECONDARY = (123, 138, 88)
    TEXT_TERTIARY = (147, 163, 108)
    TEXT_ACCENT = (26, 54, 93)
    BADGE_BG = (26, 54, 93, 20)
    OVERLAY_BG = (255, 255, 255, 235)

    def __init__(self) -> None:
        self.font_path = self._find_font()

    # ------------------------------------------------------------------ #
    # Font helpers
    # ------------------------------------------------------------------ #
    def _find_font(self) -> Optional[str]:
        """Find a Japanese-capable font."""
        possible_paths = [
            "/app/fonts/NotoSerifCJKjp-Regular.otf",
            "./fonts/NotoSerifCJKjp-Regular.otf",
            "fonts/NotoSerifCJKjp-Regular.otf",
            "/usr/share/fonts/opentype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto-cjk/NotoSerifCJK-Regular.ttc",
            "C:\\Windows\\Fonts\\msmincho.ttc",
            "C:\\Windows\\Fonts\\msgothic.ttc",
            "C:\\Windows\\Fonts\\yugothic.ttf",
            "C:\\Windows\\Fonts\\meiryo.ttc",
            "/System/Library/Fonts/�q���M�m���� ProN.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
        ]

        for path in possible_paths:
            if os.path.exists(path):
                return path

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

        return None

    def _get_font(self, size: int) -> ImageFont.FreeTypeFont:
        if not self.font_path:
            raise RuntimeError("Japanese font is required but not found")
        return ImageFont.truetype(self.font_path, size)

    # ------------------------------------------------------------------ #
    # Drawing helpers
    # ------------------------------------------------------------------ #
    def _hex_to_rgb(self, hex_color: str) -> tuple[int, int, int]:
        hex_color = hex_color.lstrip("#")
        return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

    def _needs_rotation(self, char: str) -> bool:
        dash_chars = ['�[', '?', '�|', '?', '?', '�']
        wave_chars = ['?', '�`', '?']
        ellipsis_chars = ['�c', '�d', '?']
        rotation_chars = dash_chars + wave_chars + ellipsis_chars
        return char in rotation_chars

    def _draw_rotated_char(
        self,
        img: Image.Image,
        char: str,
        x: int,
        y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int],
    ) -> None:
        temp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        bbox = temp_draw.textbbox((0, 0), char, font=font)
        char_width = bbox[2] - bbox[0]
        char_height = bbox[3] - bbox[1]
        if char_width <= 0 or char_height <= 0:
            return

        padding = 20
        temp_img = Image.new("RGBA", (char_width + padding * 2, char_height + padding * 2), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp_img)
        fill_rgba = fill + (255,)
        temp_draw.text((padding - bbox[0], padding - bbox[1]), char, font=font, fill=fill_rgba)

        rotated = temp_img.rotate(90, expand=True, resample=Image.BICUBIC)
        paste_x = x - (rotated.width // 2)
        paste_y = y
        img.paste(rotated, (paste_x, paste_y), rotated)

    def _draw_vertical_text(
        self,
        img: Image.Image,
        text: str,
        start_x: int,
        start_y: int,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int],
        char_height: int,
        column_spacing: int,
    ) -> None:
        temp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        lines = text.split("\n")
        current_x = start_x

        for line in lines:
            current_y = start_y
            for char in line:
                bbox = temp_draw.textbbox((0, 0), char, font=font)
                if self._needs_rotation(char):
                    self._draw_rotated_char(img, char, current_x, current_y, font, fill)
                else:
                    char_width = bbox[2] - bbox[0]
                    char_x = current_x - (char_width // 2)
                    ImageDraw.Draw(img).text((char_x, current_y), char, font=font, fill=fill)
                current_y += char_height
            current_x -= column_spacing

    def _resize_cover(self, image: Image.Image, width: int, height: int) -> Image.Image:
        src_w, src_h = image.size
        if src_w == 0 or src_h == 0:
            return image.resize((width, height))
        scale = max(width / src_w, height / src_h)
        resized = image.resize((int(src_w * scale), int(src_h * scale)), Image.LANCZOS)
        left = (resized.width - width) // 2
        top = (resized.height - height) // 2
        return resized.crop((left, top, left + width, top + height))

    # ------------------------------------------------------------------ #
    # Main generator
    # ------------------------------------------------------------------ #
    def generate(
        self,
        upper_text: Optional[str],
        lower_text: str,
        author_name: str,
        category: str,
        category_label: str,
        date_label: str,
        background_image_url: Optional[str] = None,
        badge_label: Optional[str] = None,
        caption: Optional[str] = None,
        likes_label: Optional[str] = None,
        score_label: Optional[str] = None,
    ) -> BytesIO:
        gradient_colors = self.COLORS.get(category_label, {}).get("gradient", self.DEFAULT_GRADIENT)
        bg_color = self._hex_to_rgb(gradient_colors[0])

        if background_image_url:
            try:
                resp = requests.get(background_image_url, timeout=5)
                resp.raise_for_status()
                bg_img = Image.open(BytesIO(resp.content)).convert("RGB")
                img = self._resize_cover(bg_img, self.WIDTH, self.HEIGHT)
            except Exception as exc:  # pragma: no cover - network failures
                logger.warning("[ShareCardGenerator] Background load failed: %s", exc)
                img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=bg_color)
        else:
            img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=bg_color)

        draw = ImageDraw.Draw(img)

        # Inner card
        inner_x1 = self.OUTER_PADDING
        inner_y1 = self.OUTER_PADDING
        inner_x2 = self.WIDTH - self.OUTER_PADDING
        inner_y2 = self.HEIGHT - self.OUTER_PADDING
        draw.rounded_rectangle(
            [inner_x1, inner_y1, inner_x2, inner_y2],
            radius=24,
            fill=(255, 255, 255),
        )

        font_poem = self._get_font(58)
        font_meta = self._get_font(35)
        font_category = self._get_font(40)
        font_badge = self._get_font(32)

        content_x = inner_x1 + self.INNER_PADDING
        content_y = inner_y1 + self.INNER_PADDING

        # Category badge
        category_text = f"�y{category_label}�z"
        draw.text((content_x, content_y), category_text, font=font_category, fill=self.TEXT_ACCENT)

        # Vertical poem placement
        theme_lines = lower_text.split("\n")
        max_chars = max((len(line.strip()) for line in theme_lines), default=0)
        char_height = 109
        column_spacing = 90
        poem_height = max_chars * char_height
        spacing_md = 46
        footer_total_height = 35 + spacing_md + 1 + spacing_md + 35 + spacing_md
        available_height = inner_y2 - inner_y1 - (self.INNER_PADDING * 2) - footer_total_height - 100
        poem_start_y = content_y + 100 + (available_height - poem_height) // 2
        card_center_x = (inner_x1 + inner_x2) // 2
        theme_columns = len(theme_lines)
        theme_width = (theme_columns - 1) * column_spacing if theme_columns > 0 else 0
        theme_start_x = card_center_x + (theme_width // 2)

        # Upper + lower text combined
        combined_poem = lower_text if not upper_text else f"{upper_text}\n{lower_text}"
        self._draw_vertical_text(
            img,
            combined_poem,
            theme_start_x,
            poem_start_y,
            font_poem,
            self.TEXT_PRIMARY,
            char_height,
            column_spacing,
        )

        footer_base_y = inner_y2 - self.INNER_PADDING - footer_total_height + spacing_md
        draw.text((content_x, footer_base_y), date_label, font=font_meta, fill=self.TEXT_SECONDARY)
        divider_y = footer_base_y + 35 + spacing_md
        draw.line(
            [(content_x, divider_y), (inner_x2 - self.INNER_PADDING, divider_y)],
            fill=(220, 220, 220),
            width=2,
        )

        footer_y = divider_y + spacing_md
        app_name = "��݂т��"
        bbox = draw.textbbox((0, 0), app_name, font=font_meta)
        app_name_width = bbox[2] - bbox[0]
        draw.text(
            (inner_x2 - self.INNER_PADDING - app_name_width, footer_y),
            app_name,
            font=font_meta,
            fill=self.TEXT_SECONDARY,
        )

        # Badge
        if badge_label:
            badge_x = inner_x1 + self.INNER_PADDING + 24
            badge_y = inner_y1 + self.INNER_PADDING + 24
            badge_padding_x = 18
            badge_padding_y = 10
            badge_bbox = draw.textbbox((0, 0), badge_label, font=font_badge)
            badge_w = badge_bbox[2] - badge_bbox[0] + badge_padding_x * 2
            badge_h = badge_bbox[3] - badge_bbox[1] + badge_padding_y * 2
            draw.rounded_rectangle(
                [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
                radius=12,
                fill=(self.TEXT_ACCENT[0], self.TEXT_ACCENT[1], self.TEXT_ACCENT[2], 32),
            )
            draw.text(
                (badge_x + badge_padding_x, badge_y + badge_padding_y),
                badge_label,
                font=font_badge,
                fill=self.TEXT_ACCENT,
            )

        # Caption
        if caption:
            draw.text(
                (content_x, content_y + 100),
                caption,
                font=font_meta,
                fill=self.TEXT_SECONDARY,
            )

        # Meta bottom-right
        author_y = inner_y2 - self.INNER_PADDING - footer_total_height - 80
        draw.text(
            (inner_x2 - self.INNER_PADDING - 12 - draw.textbbox((0, 0), author_name, font=font_meta)[2],
             author_y),
            author_name,
            font=font_meta,
            fill=self.TEXT_PRIMARY,
        )
        if likes_label:
            draw.text(
                (inner_x2 - self.INNER_PADDING - 12 - draw.textbbox((0, 0), likes_label, font=font_meta)[2],
                 author_y + 46),
                likes_label,
                font=font_meta,
                fill=self.TEXT_ACCENT,
            )
        if score_label:
            draw.text(
                (inner_x2 - self.INNER_PADDING - 12 - draw.textbbox((0, 0), score_label, font=font_meta)[2],
                 author_y + 92),
                score_label,
                font=font_meta,
                fill=self.TEXT_TERTIARY,
            )

        output = BytesIO()
        img.save(output, format="PNG", quality=85, optimize=True)
        output.seek(0)
        return output
