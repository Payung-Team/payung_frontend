import { baseLayout, infoBox, noteBox, greeting, closing } from './base-layout';

export function scheduledDeleteEmail(params: {
  name: string;
  days: number;
  deleteDate: string;
}): { subject: string; html: string } {
  const { name, days, deleteDate } = params;

  const body = `
    ${greeting({ name, intro: `แจ้งเตือน: บัญชีจะถูกลบใน ${days} วัน`, icon: 'warning' })}

    <p style="margin:0 0 24px;font-family:'Bai Jamjuree',Arial,sans-serif;font-size:15px;color:#575859;line-height:1.7;">
      บัญชี Admin ของคุณบนระบบ Payung
      <strong style="color:#DC2626;">ถูกกำหนดให้ลบถาวร</strong>
      หากไม่ต้องการให้บัญชีถูกลบ กรุณาติดต่อ Super Admin ก่อนวันที่กำหนด
    </p>

    ${infoBox({
      variant: 'red',
      rows: [
        { label: 'วันที่จะถูกลบถาวร', value: deleteDate },
        { label: 'เหลือเวลา', value: `${days} วัน` },
      ],
    })}

    ${noteBox({
      variant: 'orange',
      text: `หากต้องการยกเลิกการลบบัญชี กรุณาติดต่อ Super Admin ก่อนวันที่ ${deleteDate} เมื่อถึงกำหนดแล้วจะไม่สามารถกู้คืนข้อมูลได้`,
    })}

    ${closing({ message: 'ขอบคุณสำหรับความเข้าใจ' })}
  `;

  return {
    subject: `บัญชี Admin ของคุณถูกกำหนดให้ลบใน ${days} วัน`,
    html: baseLayout({ body, previewText: `แจ้งเตือนสำคัญ: บัญชีของ ${name} จะถูกลบในวันที่ ${deleteDate}` }),
  };
}
