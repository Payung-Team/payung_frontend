interface AlertProps {
  message: string;
  id?: string;
  className?: string;
}

export default function Alert({ message, id, className = '' }: AlertProps) {
  if (!message) return null;

  return (
    <div
      className={`mt-4 flex items-center rounded-lg border border-[#F5C6CB] bg-[#FFF0F1] px-4 py-[15px] animate-shake ${className}`}
      role="alert"
      id={id}
    >
      <p
        className="text-[13px] font-medium leading-4 text-[#DC3545]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {message}
      </p>
    </div>
  );
}
