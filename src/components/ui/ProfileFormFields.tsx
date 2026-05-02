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
  const nameParts = fullName ? fullName.split(' ') : ['', ''];
  const [firstName, lastName] = nameParts;

  const fieldWithLock = (label: string, value: string) => (
    <div>
      <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">
        {showTooltip && label.includes('เลขประจำตัว') ? (
          <Tooltip content="ต้อง resubmit KYC เพื่อแก้ไขข้อมูลนี้" position="top">
            <span className="flex items-center gap-1">
              {label}
              <Icon name="info" size="small" color="#717182" />
            </span>
          </Tooltip>
        ) : (
          label
        )}
      </label>
      <div className="flex items-center gap-3 px-3 py-2 bg-[#F3F3F5] rounded-lg">
        <input
          type="text"
          value={value || '-'}
          readOnly
          className="flex-1 bg-transparent text-[14px] text-[rgba(0,0,0,0.5)] outline-none"
        />
        <Icon name="lock" size="small" color="currentColor" />
      </div>
    </div>
  );

  return (
    <>
      {/* Caregiver ID */}
      {fieldWithLock('หมายเลขประจำตัวผู้ดูแล', caregiverId)}

      {/* Name and Surname */}
      <div className="grid grid-cols-2 gap-6">
        {fieldWithLock('ชื่อ', firstName || 'สมหญิง')}
        {fieldWithLock('นามสกุล', lastName || 'ใจดี')}
      </div>

      {/* Citizen ID */}
      {fieldWithLock('เลขประจำตัวประชาชน', citizenId)}
    </>
  );
};

export default ProfileFormFields;
