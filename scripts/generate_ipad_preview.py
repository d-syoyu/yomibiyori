"""
iPad用App Storeプレビュー画像生成スクリプト
2064 × 2752px の画像を生成します
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_ipad_preview():
    """iPad用プレビュー画像を生成"""

    # 画像サイズ（iPad 12.9インチ / 13インチ用）
    width = 2064
    height = 2752

    # 背景グラデーション風の色
    # よみびよりのテーマカラー（緑系）
    bg_color = (255, 255, 255)
    gradient_top = (239, 247, 230)  # 淡い緑
    gradient_bottom = (213, 228, 195)  # やや濃い緑

    # 画像作成
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # グラデーション背景を作成
    for y in range(height):
        r = int(gradient_top[0] + (gradient_bottom[0] - gradient_top[0]) * y / height)
        g = int(gradient_top[1] + (gradient_bottom[1] - gradient_top[1]) * y / height)
        b = int(gradient_top[2] + (gradient_bottom[2] - gradient_top[2]) * y / height)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # テキスト色（よみびよりのプライマリカラー）
    text_color = (107, 123, 79)  # #6B7B4F

    # 中央にテキストを配置
    center_x = width // 2
    center_y = height // 2

    try:
        # フォントサイズを指定（日本語フォントが必要）
        # Windowsのデフォルト日本語フォント
        font_large = ImageFont.truetype("msgothic.ttc", 180)
        font_medium = ImageFont.truetype("msgothic.ttc", 80)
        font_small = ImageFont.truetype("msgothic.ttc", 50)
    except:
        # フォントが見つからない場合はデフォルトフォント
        print("日本語フォントが見つかりません。デフォルトフォントを使用します。")
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # タイトル
    title = "よみびより"
    title_bbox = draw.textbbox((0, 0), title, font=font_large)
    title_width = title_bbox[2] - title_bbox[0]
    title_height = title_bbox[3] - title_bbox[1]
    draw.text((center_x - title_width // 2, center_y - 400), title, fill=text_color, font=font_large)

    # サブタイトル
    subtitle = "AIと共に詠む、詩的SNS"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_medium)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text((center_x - subtitle_width // 2, center_y - 150), subtitle, fill=text_color, font=font_medium)

    # 機能説明
    features = [
        "毎日届く、季節のお題",
        "心に響く一句を詠もう",
        "みんなの作品を鑑賞"
    ]

    y_offset = center_y + 50
    for feature in features:
        feature_bbox = draw.textbbox((0, 0), feature, font=font_small)
        feature_width = feature_bbox[2] - feature_bbox[0]
        draw.text((center_x - feature_width // 2, y_offset), feature, fill=text_color, font=font_small)
        y_offset += 100

    # 画像サイズ表示（デバッグ用）
    size_text = f"{width} × {height}px"
    size_bbox = draw.textbbox((0, 0), size_text, font=font_small)
    size_width = size_bbox[2] - size_bbox[0]
    draw.text((center_x - size_width // 2, height - 100), size_text, fill=(150, 150, 150), font=font_small)

    # 保存
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'assets')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'ipad_preview.png')

    img.save(output_path, 'PNG', quality=100)
    print(f"✅ iPad用プレビュー画像を生成しました: {output_path}")
    print(f"   サイズ: {width} × {height}px")

    return output_path

def create_multiple_previews():
    """複数のプレビュー画像パターンを生成"""

    templates = [
        {
            "filename": "ipad_preview_1_welcome.png",
            "title": "よみびより",
            "subtitle": "AIと共に詠む、詩的SNS",
            "features": []
        },
        {
            "filename": "ipad_preview_2_daily.png",
            "title": "毎日届くお題",
            "subtitle": "季節を感じる上の句",
            "features": ["朝6時に新しいお題", "AIが詠む美しい上の句"]
        },
        {
            "filename": "ipad_preview_3_compose.png",
            "title": "心に響く一句を",
            "subtitle": "あなたの言葉で詠む",
            "features": ["下の句を自由に作成", "1日1首、心を込めて"]
        },
        {
            "filename": "ipad_preview_4_ranking.png",
            "title": "みんなの作品を鑑賞",
            "subtitle": "共感とランキング",
            "features": ["素敵な作品を鑑賞", "ランキングで上位を目指す"]
        },
    ]

    width = 2064
    height = 2752

    for template in templates:
        # 画像作成
        img = Image.new('RGB', (width, height), (255, 255, 255))
        draw = ImageDraw.Draw(img)

        # グラデーション背景
        gradient_top = (239, 247, 230)
        gradient_bottom = (213, 228, 195)

        for y in range(height):
            r = int(gradient_top[0] + (gradient_bottom[0] - gradient_top[0]) * y / height)
            g = int(gradient_top[1] + (gradient_bottom[1] - gradient_top[1]) * y / height)
            b = int(gradient_top[2] + (gradient_bottom[2] - gradient_top[2]) * y / height)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        text_color = (107, 123, 79)
        center_x = width // 2
        center_y = height // 2

        try:
            font_large = ImageFont.truetype("msgothic.ttc", 180)
            font_medium = ImageFont.truetype("msgothic.ttc", 80)
            font_small = ImageFont.truetype("msgothic.ttc", 50)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()

        # タイトル
        title_bbox = draw.textbbox((0, 0), template["title"], font=font_large)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text((center_x - title_width // 2, center_y - 400), template["title"], fill=text_color, font=font_large)

        # サブタイトル
        subtitle_bbox = draw.textbbox((0, 0), template["subtitle"], font=font_medium)
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        draw.text((center_x - subtitle_width // 2, center_y - 150), template["subtitle"], fill=text_color, font=font_medium)

        # 機能説明
        y_offset = center_y + 50
        for feature in template["features"]:
            feature_bbox = draw.textbbox((0, 0), feature, font=font_small)
            feature_width = feature_bbox[2] - feature_bbox[0]
            draw.text((center_x - feature_width // 2, y_offset), feature, fill=text_color, font=font_small)
            y_offset += 100

        # 保存
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'assets', 'app_store')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, template["filename"])

        img.save(output_path, 'PNG', quality=100)
        print(f"✅ 生成: {template['filename']}")

    print(f"\n✅ 全{len(templates)}枚のプレビュー画像を生成しました")
    print(f"   保存先: {output_dir}")

if __name__ == "__main__":
    print("=" * 50)
    print("iPad用App Storeプレビュー画像生成")
    print("=" * 50)
    print()

    # 単一のプレビュー画像を生成
    # create_ipad_preview()

    # 複数のプレビュー画像を生成（推奨）
    create_multiple_previews()

    print()
    print("完了！生成された画像をApp Store Connectにアップロードしてください。")
