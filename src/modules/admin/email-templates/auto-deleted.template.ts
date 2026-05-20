import { baseLayout, infoBox, noteBox, greeting, closing } from './base-layout';

export function autoDeletedEmail(params: {
  name: string;
}): { subject: string; html: string } {
  const { name } = params;

  const body = `
    ${greeting({ name, intro: 'บัญชีของคุณถูกลบออกจากระบบแล้ว', icon: 'warning' })}

    <p style="margin:0 0 24px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      บัญชี Admin ของคุณบนระบบ Payung
      <strong style="color:#DC2626;">ถูกลบอย่างถาวรแล้ว</strong>
      ข้อมูลทั้งหมดที่เกี่ยวข้องกับบัญชีนี้ถูกนำออกจากระบบเรียบร้อยแล้ว
    </p>

    ${infoBox({
      variant: 'red',
      rows: [
        { label: 'สถานะบัญชี', value: 'ถูกลบถาวรแล้ว' },
        { label: 'ข้อมูลที่ถูกลบ', value: 'ข้อมูลโปรไฟล์ · สิทธิ์ Admin · ประวัติการดำเนินการ' },
      ],
    })}

    ${noteBox({
      variant: 'gray',
      text: 'หากคุณเชื่อว่าการดำเนินการนี้เกิดขึ้นโดยไม่ถูกต้อง กรุณาติดต่อทีมงาน Payung โดยตรง',
    })}

    ${closing({ message: 'ขอบคุณที่ร่วมเป็นส่วนหนึ่งของทีม Payung' })}
  `;

  return {
    subject: 'บัญชี Admin ของคุณถูกลบเรียบร้อยแล้ว',
    html: baseLayout({ body, previewText: `บัญชีของ ${name} ถูกลบถาวรออกจากระบบ Payung แล้ว` }),
  };
}
