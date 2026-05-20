import { baseLayout, ctaButton, infoBox, noteBox, greeting, closing } from './base-layout';

export function adminInvitationEmail(params: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const { name, email, tempPassword, loginUrl } = params;

  const body = `
    ${greeting({ name, intro: 'ยินดีต้อนรับสู่ทีม Payung' })}

    <p style="margin:0 0 24px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      คุณได้รับการเชิญให้เข้าร่วมในฐานะ
      <strong style="color:#1B5C48;">Admin</strong> ของระบบ Payung
      กรุณาใช้ข้อมูลด้านล่างเพื่อเข้าสู่ระบบเป็นครั้งแรก
    </p>

    ${infoBox({
      variant: 'green',
      rows: [
        { label: 'อีเมล (Username)', value: email },
        { label: 'รหัสผ่านชั่วคราว', value: tempPassword, mono: true },
      ],
    })}

    ${ctaButton({ href: loginUrl, label: 'เข้าสู่ระบบ →' })}

    ${noteBox({
      variant: 'orange',
      text: `กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก เพื่อความปลอดภัยของบัญชีคุณ`,
    })}

    ${closing({ message: 'ยินดีต้อนรับเข้าสู่ทีมงาน Payung' })}
  `;

  return {
    subject: 'คุณได้รับเชิญเป็น Admin ของ Payung',
    html: baseLayout({ body, previewText: `ยินดีต้อนรับ ${name} — ข้อมูลการเข้าสู่ระบบ Admin Payung ของคุณ` }),
  };
}
