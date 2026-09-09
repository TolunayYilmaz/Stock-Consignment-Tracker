from dotenv import load_dotenv

import os

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = 'info@stoktakip.cloud-ip.cc'


def _build_html(to_email: str, link: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="tr">
  <body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f5dc">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#15803d;padding:24px 32px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;">Stok Emanet</h1>
                <p style="margin:6px 0 0;color:#d1fae5;font-size:13px;">E-posta Doğrulama</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:#44403c;font-size:15px;line-height:1.6;">
                  Merhaba{(' ' + to_email) if to_email else ''},
                </p>
                <p style="margin:0 0 24px;color:#44403c;font-size:15px;line-height:1.6;">
                  Hesabınızı doğrulamak için aşağıdaki butona tıklayın. Bu link yalnızca tek seferde
                  kullanılabilir ve güvenliğiniz için e-posta adresinize gönderilmiştir.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:8px 0 24px;">
                      <a href="{link}"
                         style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:12px;">
                        E-postamı Doğrula
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;color:#a8a29e;font-size:13px;line-height:1.6;">
                  Buton çalışmazsa aşağıdaki bağlantıyı tarayıcınıza yapıştırın:
                </p>
                <p style="margin:0;color:#475569;font-size:12px;word-break:break-all;line-height:1.5;">{link}</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f5f5f4;padding:16px 32px;text-align:center;">
                <p style="margin:0;color:#a8a29e;font-size:12px;">
                  Bu e-postayı siz istemeden aldıysanız lütfen dikkate almayın.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_verification_email(to_email: str, token: str, base_url: str = "http://localhost:8000") -> bool:
    """Resend üzerinden HTML doğrulama maili gönderir. Hata olursa loglayıp False döner."""
    if not RESEND_API_KEY:
        print("[email] RESEND_API_KEY is not set; skipping send")
        return False
    import resend

    resend.api_key = RESEND_API_KEY
    verify_link = f"{base_url.rstrip('/')}/api/verify-email?token={token}"
    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": "Stok Emanet - E-posta Doğrulama",
                "html": _build_html(to_email, verify_link),
            }
        )
        return True
    except Exception as e:
        print(f"[email] FAILED to send to {to_email}: {type(e).__name__}: {e}")
        return False