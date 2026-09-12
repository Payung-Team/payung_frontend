import TimeCards from './TimeCards';

export interface ServiceProgressWorkCardProps {
  checkInServerTs: string | null;
  checkOutServerTs: string | null;
  bookedDurationText?: string;
}

/** Shell-less check-in/out times nested inside the QR-token card. Starting and ending
 * the job both happen through scanJobQr, so this card intentionally has no direct action. */
export default function ServiceProgressWorkCard({
  checkInServerTs,
  checkOutServerTs,
  bookedDurationText,
}: Readonly<ServiceProgressWorkCardProps>) {
  return <TimeCards checkInServerTs={checkInServerTs} checkOutServerTs={checkOutServerTs} bookedDurationText={bookedDurationText} />;
}
