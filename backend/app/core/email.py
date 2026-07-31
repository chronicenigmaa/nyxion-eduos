"""Transactional email delivery.

Uses the Resend HTTPS API (no SMTP ports, works on Railway/Vercel).
If RESEND_API_KEY is not configured the message is logged instead of sent, so
local development and staging still work without an email provider.
"""

import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("nyxion.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"


class EmailNotConfigured(Exception):
    pass


def email_enabled() -> bool:
    return bool(settings.RESEND_API_KEY and settings.MAIL_FROM)


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send an email. Returns True if it was handed to the provider.

    Never raises on delivery failure — callers (e.g. forgot-password) must not
    leak provider errors to unauthenticated users.
    """
    if not email_enabled():
        logger.warning(
            "Email not configured (RESEND_API_KEY missing). Would have sent to %s: %s\n%s",
            to, subject, text or html,
        )
        return False

    payload = {
        "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        if response.status_code >= 400:
            logger.error("Resend rejected email to %s: %s %s", to, response.status_code, response.text)
            return False
        return True
    except Exception as exc:  # network error, DNS, timeout…
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def _shell(title: str, body_html: str) -> str:
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
            <tr>
              <td style="background:#2563eb;padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">Nyxion EduOS</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">{title}</h1>
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Nyxion EduOS — AI-native School Operating System
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def send_password_reset_email(to: str, full_name: str, reset_url: str, expires_minutes: int) -> bool:
    body = f"""
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Hi {full_name},
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        We received a request to reset the password for your Nyxion EduOS account.
        Click the button below to choose a new password. This link expires in
        <strong>{expires_minutes} minutes</strong> and can only be used once.
      </p>
      <p style="margin:0 0 24px;">
        <a href="{reset_url}"
           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:600;">
          Reset my password
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
        If the button doesn't work, paste this link into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;color:#2563eb;word-break:break-all;">{reset_url}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        If you didn't request this, you can safely ignore this email — your password will not change.
      </p>
    """
    text = (
        f"Hi {full_name},\n\n"
        f"Reset your Nyxion EduOS password using this link (valid for {expires_minutes} minutes, single use):\n\n"
        f"{reset_url}\n\n"
        "If you didn't request this, ignore this email — your password will not change.\n"
    )
    return send_email(to, "Reset your Nyxion EduOS password", _shell("Reset your password", body), text)


def send_password_changed_email(to: str, full_name: str) -> bool:
    body = f"""
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi {full_name},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        Your Nyxion EduOS password was just changed. If this was you, no action is needed.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        If you did <strong>not</strong> make this change, contact your school administrator immediately.
      </p>
    """
    text = (
        f"Hi {full_name},\n\nYour Nyxion EduOS password was just changed.\n"
        "If this wasn't you, contact your school administrator immediately.\n"
    )
    return send_email(to, "Your Nyxion EduOS password was changed", _shell("Password changed", body), text)
