import { baseLayout, ctaButton, infoBox, greeting, closing } from './base-layout';

export function deleteCancelledEmail(params: {
  name: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const { name, loginUrl } = params;

  const body = `
    ${greeting({ name, intro: 'การลบบัญชีถูกยกเลิกแล้ว', icon: 'check' })}

    <p style="margin:0 0 24px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      การดำเนินการลบบัญชี Admin ของคุณบนระบบ Payung
      <strong style="color:#1B5C48;">ถูกยกเลิกเรียบร้อยแล้ว</strong>
      บัญชีของคุณยังคงอยู่ครบถ้วนและสามารถใช้งานได้ตามปกติ
    </p>

    ${infoBox({
      variant: 'green',
      rows: [
        { label: 'สถานะ', value: 'ยกเลิกการลบบัญชีแล้ว' },
        { label: 'บัญชีของคุณ', value: 'ยังคงอยู่และใช้งานได้ตามปกติ' },
      ],
    })}

    ${ctaButton({ href: loginUrl, label: 'เข้าสู่ระบบ →' })}

    ${closing({ message: 'หากมีข้อสงสัยเพิ่มเติม กรุณาติดต่อ Super Admin' })}
  `;

  return {
    subject: 'การลบบัญชี Admin ของคุณถูกยกเลิก',
    html: baseLayout({ body, previewText: `บัญชีของ ${name} ปลอดภัย — การลบถูกยกเลิกแล้ว` }),
  };
}
