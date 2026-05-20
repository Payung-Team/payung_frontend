export function baseLayout({ body, previewText }: { body: string; previewText?: string }): string {
  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="th" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payung</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700;800&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700;800&display=swap');
    body { margin: 0; padding: 0; }
    a { color: #52B69A; }
    img { border: 0; display: block; }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F6FAF9;-webkit-font-smoothing:antialiased;">
  ${preview}

  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
    style="background-color:#F6FAF9;padding:40px 16px 48px;">
    <tr>
      <td align="center" valign="top">

        <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:600px;width:100%;">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td style="background-color:#1B5C48;border-radius:12px 12px 0 0;padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="padding:24px 32px 20px;">
                    <!-- Wordmark -->
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;">
                          <span style="display:inline-block;background-color:#52B69A;width:36px;height:36px;border-radius:8px;text-align:center;vertical-align:middle;margin-right:10px;line-height:0;">
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                              <path d="M20 8L13 19H19L17 28L24 17H18L20 8Z" fill="white"/>
                            </svg>
                          </span>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-family:'Bai Jamjuree',Arial,sans-serif;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Payung</span>
                        </td>
                        <td style="vertical-align:middle;padding-left:10px;">
                          <span style="display:inline-block;background-color:rgba(82,182,154,0.25);color:#A7F3D0;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:20px;text-transform:uppercase;">Admin</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Accent bar -->
                <tr>
                  <td style="padding:0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="background-color:#52B69A;height:3px;border-radius:2px;opacity:0.5;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px 32px;border-left:1px solid #E2EDEA;border-right:1px solid #E2EDEA;">
              ${body}
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background-color:#F0F7F4;border-top:1px solid #D1EAE3;border-radius:0 0 12px 12px;border-left:1px solid #E2EDEA;border-right:1px solid #E2EDEA;border-bottom:1px solid #E2EDEA;padding:20px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:12px;color:#52B69A;font-weight:700;letter-spacing:0.3px;">
                      Payung — ระบบจอง Caregiver ดูแลผู้สูงอายุ
                    </p>
                    <p style="margin:0;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:11px;color:#8A8C8E;line-height:1.6;">
                      อีเมลฉบับนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้<br>
                      © ${new Date().getFullYear()} Payung. สงวนลิขสิทธิ์ทั้งหมด
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared sub-components ──────────────────────────────────────────────────

export function ctaButton({ href, label }: { href: string; label: string }): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
            href="${href}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="16%" strokecolor="#45a085" fillcolor="#52B69A">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">
              ${label}
            </center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}"
            style="display:inline-block;background-color:#52B69A;color:#ffffff;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:8px;letter-spacing:0.2px;line-height:1;">
            ${label}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

export function infoBox({ rows, variant = 'green' }: {
  rows: { label: string; value: string; mono?: boolean }[];
  variant?: 'green' | 'orange' | 'red';
}): string {
  const styles = {
    green:  { bg: '#F0F7F4', border: '#52B69A',  label: '#3A9A7E', value: '#1A1A1A' },
    orange: { bg: '#FFF7ED', border: '#E4864A',  label: '#92400E', value: '#7C2D12' },
    red:    { bg: '#FEF2F2', border: '#EF4444',  label: '#991B1B', value: '#7F1D1D' },
  }[variant];

  const rowHtml = rows.map(r => `
    <tr>
      <td style="padding-bottom:${rows.indexOf(r) === rows.length - 1 ? '0' : '14px'};">
        <span style="display:block;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:11px;font-weight:700;color:${styles.label};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">
          ${r.label}
        </span>
        <span style="display:block;font-family:${r.mono ? "'Courier New',monospace" : "'Bai Jamjuree',Arial,sans-serif"};font-size:${r.mono ? '17px' : '15px'};font-weight:${r.mono ? '700' : '600'};color:${r.mono ? styles.border : styles.value};letter-spacing:${r.mono ? '2px' : '0'};">
          ${r.value}
        </span>
      </td>
    </tr>`).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:${styles.bg};border-radius:8px;border-left:4px solid ${styles.border};padding:20px 22px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            ${rowHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

export function noteBox({ text, variant = 'orange' }: { text: string; variant?: 'orange' | 'gray' }): string {
  const styles = {
    orange: {
      bg: '#FFF7ED', border: '#E4864A', text: '#92400E',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <path d="M7.125 1.563a1 1 0 0 1 1.75 0l5.75 10a1 1 0 0 1-.875 1.5H2.25a1 1 0 0 1-.875-1.5l5.75-10Z" stroke="#92400E" stroke-width="1.25" fill="none"/>
        <path d="M8 6.5v3M8 11.25v.25" stroke="#92400E" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
    },
    gray: {
      bg: '#F6FAF9', border: '#D1D5DB', text: '#6B7280',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <circle cx="8" cy="8" r="6.5" stroke="#6B7280" stroke-width="1.25"/>
        <path d="M8 7.5v4M8 5.25v.25" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
    },
  }[variant];

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:${styles.bg};border-radius:8px;border-left:4px solid ${styles.border};padding:14px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="width:22px;vertical-align:top;padding-top:1px;padding-right:10px;">${styles.icon}</td>
              <td>
                <p style="margin:0;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:13px;color:${styles.text};line-height:1.6;">
                  <strong>หมายเหตุ:</strong> ${text}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

const HEADING_ICONS = {
  check: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:8px;margin-top:-2px;">
    <circle cx="11" cy="11" r="10" fill="#52B69A" fill-opacity="0.15"/>
    <path d="M6.5 11L9.5 14L15.5 8" stroke="#1B5C48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  warning: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:8px;margin-top:-2px;">
    <circle cx="11" cy="11" r="10" fill="#FEF2F2"/>
    <path d="M11 7.5v5M11 14.5v.5" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

export function greeting({ name, intro, icon }: { name: string; intro: string; icon?: keyof typeof HEADING_ICONS }): string {
  const iconHtml = icon ? HEADING_ICONS[icon] : '';
  return `
    <h1 style="margin:0 0 20px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:22px;font-weight:800;color:#1B5C48;line-height:1.3;">
      ${iconHtml}${intro}
    </h1>
    <p style="margin:0 0 20px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      สวัสดีคุณ <strong style="color:#1A1A1A;">${name}</strong>
    </p>`;
}

export function closing({ message = 'ขอบคุณที่ใช้บริการ Payung' }: { message?: string } = {}): string {
  return `
    <p style="margin:0 0 4px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:14px;color:#575859;line-height:1.6;">
      ${message}
    </p>
    <p style="margin:0;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:14px;font-weight:700;color:#1B5C48;line-height:1.6;">
      ทีมงาน Payung
    </p>`;
}
