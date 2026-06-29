import { useEffect } from 'react';
import { useKyc } from '../../context/KycContext';
import KycIntro from './KycIntro';
import KycStep1 from './steps/KycStep1';
import KycStep2 from './steps/KycStep2';
import KycStep3 from './steps/KycStep3';

export default function KYC() {
  const { step } = useKyc();

  // ลบ flag is_registering ที่ GuestRoute เซ็ตไว้ (ทำใน effect เพื่อความปลอดภัยกับ StrictMode)
  useEffect(() => {
    localStorage.removeItem('is_registering');
  }, []);
  
  if (step === 1) return <KycStep1 />;
  if (step === 2) return <KycStep2 />;
  if (step === 3) return <KycStep3 />;
  return <KycIntro />;
}
