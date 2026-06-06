import React from 'react';
import { Icon } from './Icon';
import Tooltip from './Tooltip';

interface ProfileFormFieldsProps {
  caregiverId?: string;
  fullName?: string;
  citizenId?: string;
  showTooltip?: boolean;
}

const ProfileFormFields: React.FC<ProfileFormFieldsProps> = ({
  caregiverId,
  fullName,
  citizenId,
  showTooltip = true,
}) => {
  const nameParts = fullName ? fullName.trim().split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const fieldWithLock = (label: string, value: string, tooltipText?: string) => (
    <div>
      <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">
        {showTooltip && tooltipText ? (
          <Tooltip content={tooltipText} position="top" delay={500}>
            <span className="flex items-center gap-1">
              {label}
              <Icon name="info" size="small" color="#717182" />
            </span>
          </Tooltip>
        ) : (
          label
        )}
      </label>
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F3F3F5] rounded-lg overflow-hidden">
        <input
          type="text"
          value={value || '-'}
          readOnly
          className="flex-1 min-w-0 bg-transparent text-[14px] text-[rgba(0,0,0,0.5)] outline-none"
        />
        <Icon name="lock" size="small" color="currentColor" className="shrink-0" />
      </div>
    </div>
  );

  return (
    <>
      {fieldWithLock(
        'หมายเลขประจำตัวผู้ดูแล',
        caregiverId,
        'หมายเลขประจำตัวผู้ดูแลถูกกำหนดโดยระบบ ไม่สามารถแก้ไขได้',
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {fieldWithLock(
          'ชื่อ',
          firstName || 'สมหญิง',
          'ต้องการแก้ไขกรุณาติดต่อ admin',
        )}
        {fieldWithLock(
          'นามสกุล',
          lastName || 'ใจดี',
          'ต้องการแก้ไขกรุณาติดต่อ admin',
        )}
      </div>

      {fieldWithLock(
        'เลขประจำตัวประชาชน',
        citizenId,
        'ต้องการแก้ไขกรุณาติดต่อ admin',
      )}
    </>
  );
};

export default ProfileFormFields;
