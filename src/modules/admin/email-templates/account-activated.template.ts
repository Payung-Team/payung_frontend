import { baseLayout, ctaButton, infoBox, greeting, closing } from './base-layout';

export function accountActivatedEmail(params: {
  name: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const { name, loginUrl } = params;

  const body = `
    ${greeting({ name, intro: 'บัญชีของคุณพร้อมใช้งานแล้ว', icon: 'check' })}

    <p style="margin:0 0 24px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      บัญชี Admin ของคุณบนระบบ Payung
      <strong style="color:#1B5C48;">ได้รับการเปิดใช้งานอีกครั้งแล้ว</strong>
      คุณสามารถเข้าสู่ระบบและดำเนินการต่างๆ ในฐานะ Admin ได้ตามปกติ
    </p>

    ${infoBox({
      variant: 'green',
      rows: [
        { label: 'สถานะบัญชี', value: 'เปิดใช้งานแล้ว' },
        { label: 'สิทธิ์การเข้าถึง', value: 'Admin — เข้าถึงระบบได้ตามปกติ' },
      ],
    })}

    ${ctaButton({ href: loginUrl, label: 'เข้าสู่ระบบ →' })}

    ${closing({ message: 'ยินดีต้อนรับกลับมา' })}
  `;

  return {
    subject: 'บัญชี Admin ของคุณถูกเปิดใช้งานอีกครั้ง',
    html: baseLayout({ body, previewText: `บัญชีของ ${name} เปิดใช้งานแล้ว — เข้าสู่ระบบได้เลย` }),
  };
}
