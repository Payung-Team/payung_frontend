import React from 'react';

export const LanguageSettingsTab: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">ภาษา</h2>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="language"
            defaultChecked
            className="w-4 h-4"
          />
          <span className="text-[14px] text-[#0A0A0A]">ไทย</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="language"
            className="w-4 h-4"
          />
          <span className="text-[14px] text-[#0A0A0A]">English</span>
        </label>
      </div>
    </div>
  );
};
