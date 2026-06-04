import React, { useState } from 'react';
import Icon from './Icon';

interface CancelAcceptanceModalProps {
  isOpen: boolean;
  bookingId: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const CancelAcceptanceModal: React.FC<CancelAcceptanceModalProps> = ({
  isOpen,
  bookingId,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !bookingId) return null;

  const handleSubmitLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('กรุณากรอกเหตุผลที่ยกเลิกการตอบรับ');
      return;
    }
    onSubmit(reason.trim());
    setReason('');
    setError('');
  };

  const handleCloseLocal = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black/50 transition-opacity">
      <div className="relative w-full max-w-md mx-auto my-6 px-4">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-2xl shadow-xl outline-none focus:outline-none">

          {/* Modal Header */}
          <div className="flex items-start justify-between p-5 border-b border-solid border-gray-100 rounded-t">
            <h3 className="text-base font-bold text-gray-900">
              ยกเลิกการตอบรับงาน ({bookingId})
            </h3>
            <button
              type="button"
              className="p-1 ml-auto bg-transparent border-0 text-gray-400 hover:text-gray-600 float-right text-xl leading-none font-semibold outline-none focus:outline-none cursor-pointer"
              onClick={handleCloseLocal}
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmitLocal}>
            <div className="relative p-6 flex-auto">
              <p className="text-xs text-gray-500 mb-3">
                กรุณากรอกเหตุผลที่คุณต้องการยกเลิกการตอบรับงานนี้ (บังคับกรอก)
              </p>

              <textarea
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setError('');
                }}
                placeholder="ตัวอย่าง: เกิดเหตุฉุกเฉินส่วนตัว, ติดภารกิจด่วนกะทันหัน, ตารางเวลาชนกัน..."
                className="w-full p-3 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#52B69A] resize-none"
              />

              {error && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold flex items-center gap-1">
                  <Icon name="error" className="text-sm text-red-500" />
                  {error}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-4 border-t border-solid border-gray-100 rounded-b gap-2">
              <button
                type="button"
                className="text-gray-500 hover:bg-gray-50 font-bold uppercase px-4 py-2 rounded-lg text-xs outline-none focus:outline-none ease-linear transition-all duration-150 cursor-pointer"
                onClick={handleCloseLocal}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="bg-red-500 hover:bg-red-600 text-white font-bold uppercase px-4 py-2 rounded-lg text-xs outline-none focus:outline-none ease-linear transition-all duration-150 shadow hover:shadow-md cursor-pointer"
              >
                ยืนยันการยกเลิกตอบรับ
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default CancelAcceptanceModal;
