"""Email sending service using Resend."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class EmailError(RuntimeError):
    """Raised when email sending fails."""


@dataclass
class EmailMessage:
    """Email message data."""

    to: str
    subject: str
    html: str
    text: str | None = None


class EmailService:
    """Send transactional emails via Resend API."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = self.settings.resend_api_key
        self.from_email = self.settings.resend_from_email
        self.api_url = "https://api.resend.com/emails"

    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return bool(self.api_key)

    def send(self, message: EmailMessage) -> dict:
        """Send an email via Resend API."""
        if not self.api_key:
            logger.warning("Resend API key not configured, skipping email")
            return {"status": "skipped", "reason": "not_configured"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "from": self.from_email,
            "to": [message.to],
            "subject": message.subject,
            "html": message.html,
        }

        if message.text:
            payload["text"] = message.text

        try:
            response = httpx.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Email sent successfully to {message.to}: {result.get('id')}")
            return {"status": "sent", "id": result.get("id")}
        except httpx.HTTPError as exc:
            logger.error(f"Failed to send email to {message.to}: {exc}")
            raise EmailError(f"Failed to send email: {exc}") from exc


def send_sponsor_verification_email(
    to_email: str,
    company_name: str,
    verified: bool,
) -> dict:
    """Send sponsor verification status email."""
    service = EmailService()

    if verified:
        subject = "【よみびより】スポンサーアカウントが承認されました"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4a7c59; font-size: 24px;">スポンサーアカウント承認のお知らせ</h1>
            <p style="font-size: 16px; line-height: 1.6;">{company_name} 様</p>
            <p style="font-size: 16px; line-height: 1.6;">
                この度は「よみびより」スポンサープログラムへのご登録、誠にありがとうございます。
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                審査の結果、スポンサーアカウントが<strong style="color: #22c55e;">承認</strong>されました。
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                スポンサーダッシュボードからお題の投稿が可能になりました。<br>
                クレジットを購入して、ぜひ最初のお題を投稿してみてください。
            </p>
            <div style="margin: 30px 0;">
                <a href="https://yomibiyori.app/sponsor"
                   style="background-color: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    ダッシュボードを開く
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="font-size: 14px; color: #666;">
                このメールは「よみびより」から自動送信されています。<br>
                ご不明な点がございましたら、サポートまでお問い合わせください。
            </p>
        </div>
        """
        text = f"""
{company_name} 様

この度は「よみびより」スポンサープログラムへのご登録、誠にありがとうございます。

審査の結果、スポンサーアカウントが承認されました。

スポンサーダッシュボードからお題の投稿が可能になりました。
クレジットを購入して、ぜひ最初のお題を投稿してみてください。

ダッシュボード: https://yomibiyori.app/sponsor

---
このメールは「よみびより」から自動送信されています。
        """
    else:
        subject = "【よみびより】スポンサーアカウントの審査結果について"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4a7c59; font-size: 24px;">スポンサーアカウント審査結果のお知らせ</h1>
            <p style="font-size: 16px; line-height: 1.6;">{company_name} 様</p>
            <p style="font-size: 16px; line-height: 1.6;">
                この度は「よみびより」スポンサープログラムへのご登録をいただき、誠にありがとうございます。
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                審査の結果、現時点では承認を見送らせていただくこととなりました。
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
                詳細につきましては、サポートまでお問い合わせください。
            </p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="font-size: 14px; color: #666;">
                このメールは「よみびより」から自動送信されています。
            </p>
        </div>
        """
        text = f"""
{company_name} 様

この度は「よみびより」スポンサープログラムへのご登録をいただき、誠にありがとうございます。

審査の結果、現時点では承認を見送らせていただくこととなりました。

詳細につきましては、サポートまでお問い合わせください。

---
このメールは「よみびより」から自動送信されています。
        """

    message = EmailMessage(
        to=to_email,
        subject=subject,
        html=html,
        text=text,
    )

    return service.send(message)
