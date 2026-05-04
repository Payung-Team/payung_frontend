import React, { useEffect, useMemo, useRef, useState } from 'react';
import ThailandAddressSimple from 'thailand-address-simple';

interface ThaiAddressSelectorProps {
  onProvinceChange: (value: string) => void;
  onAmphoeChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onZipcodeChange: (value: string) => void;
  provinceValue?: string;
  amphoeValue?: string;
  districtValue?: string;
  error?: { province?: string; amphoe?: string; district?: string };
}

const db = new ThailandAddressSimple();

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  placeholder,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  placeholder: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <div>
      <label htmlFor={id} className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">
        {label}
      </label>
      <div className="relative">
        <select
          ref={selectRef}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none px-3 py-2 pr-8 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#52B69A] transition-colors
            ${disabled ? 'bg-[#F3F3F5] text-[rgba(0,0,0,0.4)] cursor-not-allowed border-gray-300' : 'bg-white text-[#0A0A0A] border-gray-300 cursor-pointer'}
            ${error ? 'border-red-400' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
          ▾
        </span>
      </div>
      {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function ThaiAddressSelector({
  onProvinceChange,
  onAmphoeChange,
  onDistrictChange,
  onZipcodeChange,
  provinceValue = '',
  amphoeValue = '',
  districtValue = '',
  error,
}: ThaiAddressSelectorProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db.init().then(() => setReady(true));
  }, []);

  const provinces = useMemo(() => {
    if (!ready) return [];
    return [...new Set(db.address.map((a) => a.province))].sort();
  }, [ready]);

  const amphoes = useMemo(() => {
    if (!ready || !provinceValue) return [];
    return [
      ...new Set(
        db.address.filter((a) => a.province === provinceValue).map((a) => a.amphoe),
      ),
    ].sort();
  }, [ready, provinceValue]);

  const districts = useMemo(() => {
    if (!ready || !amphoeValue) return [];
    return [
      ...new Set(
        db.address
          .filter((a) => a.province === provinceValue && a.amphoe === amphoeValue)
          .map((a) => a.district),
      ),
    ].sort();
  }, [ready, provinceValue, amphoeValue]);

  const handleProvinceChange = (value: string) => {
    onProvinceChange(value);
    onAmphoeChange('');
    onDistrictChange('');
    onZipcodeChange('');
  };

  const handleAmphoeChange = (value: string) => {
    onAmphoeChange(value);
    onDistrictChange('');
    onZipcodeChange('');
  };

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    const found = db.address.find(
      (a) => a.province === provinceValue && a.amphoe === amphoeValue && a.district === value,
    );
    onZipcodeChange(found?.zipcode ?? '');
  };

  if (!ready) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['จังหวัด', 'เขต/อำเภอ', 'ตำบล'].map((label) => (
          <div key={label}>
            <p className="text-[14px] font-semibold text-[#0A0A0A] mb-2">{label}</p>
            <div className="h-[38px] rounded-lg bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SelectField
        id="province"
        label="จังหวัด"
        value={provinceValue}
        options={provinces}
        placeholder="— เลือกจังหวัด —"
        onChange={handleProvinceChange}
        error={error?.province}
      />
      <SelectField
        id="amphoe"
        label="เขต/อำเภอ"
        value={amphoeValue}
        options={amphoes}
        disabled={!provinceValue}
        placeholder="— เลือกอำเภอ —"
        onChange={handleAmphoeChange}
        error={error?.amphoe}
      />
      <SelectField
        id="district"
        label="ตำบล/แขวง"
        value={districtValue}
        options={districts}
        disabled={!amphoeValue}
        placeholder="— เลือกตำบล —"
        onChange={handleDistrictChange}
        error={error?.district}
      />
    </div>
  );
}
