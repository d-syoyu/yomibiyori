"""
共有関連API
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import get_db_session
from app.models.work import Work
from app.models.user import User
from app.models.theme import Theme
from app.utils.share_card_generator import ShareCardGenerator
from datetime import datetime
import os
import glob
import subprocess

router = APIRouter(prefix="/share", tags=["share"])


@router.get("/card/{work_id}")
def generate_share_card(
    work_id: str,
    db: Session = Depends(get_db_session),
):
    """
    作品の共有カード画像を生成

    Args:
        work_id: 作品ID

    Returns:
        PNG画像
    """
    # 作品を取得
    result = db.execute(
        select(Work, User, Theme)
        .join(User, Work.user_id == User.id)
        .join(Theme, Work.theme_id == Theme.id)
        .where(Work.id == work_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Work not found")

    work, user, theme = row

    # カテゴリラベル
    category_labels = {
        "romance": "恋愛",
        "season": "季節",
        "daily": "日常",
        "humor": "ユーモア",
    }
    category_label = category_labels.get(theme.category, theme.category)

    # 日付フォーマット
    date_label = work.created_at.strftime("%Y/%m/%d")

    # いいね数を計算
    likes_count = len(work.likes) if work.likes else 0

    # 画像生成
    generator = ShareCardGenerator()
    image_bytes = generator.generate(
        upper_text=theme.text,
        lower_text=work.text,
        author_name=user.name or "匿名",
        category=theme.category,
        category_label=category_label,
        date_label=date_label,
        background_image_url=getattr(theme, "background_image_url", None),
        badge_label=None,  # 必要に応じて追加
        caption=None,  # 必要に応じて追加
        likes_label=f"♥ {likes_count}" if likes_count > 0 else None,
        score_label=None,  # スコアは現在未実装
    )

    return Response(
        content=image_bytes.getvalue(),
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",  # 1日キャッシュ
            "Content-Disposition": f'inline; filename="yomibiyori_{work_id}.png"',
        },
    )


@router.get("/font-diagnostics")
def font_diagnostics():
    """
    フォント診断エンドポイント（デバッグ用）
    システムにインストールされている日本語フォントを確認
    """
    diagnostics = {
        "project_fonts": [],
        "nix_store_fonts": [],
        "standard_paths": [],
        "fc_list_output": None,
        "font_packages": [],
    }

    # プロジェクト内のフォントを確認
    project_font_paths = [
        "/app/fonts/",
        "./fonts/",
        "fonts/",
    ]
    for path in project_font_paths:
        if os.path.exists(path) and os.path.isdir(path):
            try:
                files = os.listdir(path)
                diagnostics["project_fonts"].append({
                    "path": path,
                    "files": files,
                    "absolute_path": os.path.abspath(path),
                })
            except Exception as e:
                diagnostics["project_fonts"].append({
                    "path": path,
                    "error": str(e),
                })

    # Nix storeのフォントを検索
    nix_patterns = [
        "/nix/store/*/share/fonts/opentype/noto-cjk/*.ttc",
        "/nix/store/*/share/fonts/truetype/noto-cjk/*.ttc",
        "/nix/store/*/share/fonts/**/Noto*CJK*.ttc",
    ]
    for pattern in nix_patterns:
        matches = glob.glob(pattern)
        diagnostics["nix_store_fonts"].extend(matches)

    # 標準パスをチェック
    standard_paths = [
        "/usr/share/fonts/opentype/noto-cjk/",
        "/usr/share/fonts/truetype/noto-cjk/",
        "/usr/share/fonts/opentype/noto/",
        "/usr/share/fonts/truetype/noto/",
    ]
    for path in standard_paths:
        if os.path.exists(path):
            files = os.listdir(path)
            diagnostics["standard_paths"].append({
                "path": path,
                "files": files,
            })

    # fc-listで日本語フォントを確認
    try:
        result = subprocess.run(
            ["fc-list", ":lang=ja", "file"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            diagnostics["fc_list_output"] = result.stdout.strip().split('\n')
        else:
            diagnostics["fc_list_output"] = f"Error: {result.stderr}"
    except Exception as e:
        diagnostics["fc_list_output"] = f"Exception: {str(e)}"

    # nixパッケージ情報
    try:
        result = subprocess.run(
            ["nix-store", "--query", "--requisites", "/run/current-system"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            packages = [line for line in result.stdout.split('\n') if 'noto' in line.lower() or 'font' in line.lower()]
            diagnostics["font_packages"] = packages[:20]  # 最初の20個
    except Exception as e:
        diagnostics["font_packages"] = f"Exception: {str(e)}"

    return diagnostics
