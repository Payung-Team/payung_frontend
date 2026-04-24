import { KycProvider, useKyc } from '../../context/KycContext';
import KycIntro from './KycIntro';
import KycStep1 from './steps/KycStep1';
import KycStep2 from './steps/KycStep2';

function KycContent() {
  const { step } = useKyc();

  if (step === 1) return <KycStep1 />;
  if (step === 2) return <KycStep2 />;
  return <KycIntro />;
}

export default function KYC() {
  return (
    <KycProvider>
      <KycContent />
    </KycProvider>
  );
}
