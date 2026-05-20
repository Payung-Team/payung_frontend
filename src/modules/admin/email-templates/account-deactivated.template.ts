import { baseLayout, infoBox, noteBox, greeting, closing } from './base-layout';

export function accountDeactivatedEmail(params: {
  name: string;
}): { subject: string; html: string } {
  const { name } = params;

  const body = `
    ${greeting({ name, intro: 'บัญชีของคุณถูกระงับชั่วคราว', icon: 'warning' })}

    <p style="margin:0 0 24px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      บัญชี Admin ของคุณบนระบบ Payung
      <strong style="color:#DC2626;">ถูกระงับการใช้งานชั่วคราว</strong>
      คุณจะไม่สามารถเข้าสู่ระบบหรือดำเนินการใดๆ ได้จนกว่าบัญชีจะได้รับการเปิดใช้งานอีกครั้ง
    </p>

    ${infoBox({
      variant: 'red',
      rows: [
        { label: 'สถานะบัญชี', value: 'ระงับชั่วคราว' },
        { label: 'ผลกระทบ', value: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้' },
      ],
    })}

    ${noteBox({
      variant: 'gray',
      text: 'หากคุณเชื่อว่าการดำเนินการนี้เกิดขึ้นโดยไม่ถูกต้อง หรือมีข้อสงสัยใดๆ กรุณาติดต่อ Super Admin โดยตรง',
    })}

    ${closing({ message: 'ขอบคุณสำหรับความเข้าใจ' })}
  `;

  return {
    subject: 'บัญชี Admin ของคุณถูกระงับ',
    html: baseLayout({ body, previewText: `แจ้งเตือน: บัญชี Admin ของ ${name} ถูกระงับชั่วคราว` }),
  };
}
