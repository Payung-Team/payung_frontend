import Icon from './Icon';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'ค้นหา',
  ariaLabel = placeholder,
  className = '',
}: SearchInputProps) {
  return (
    <label className={`flex h-11 w-full items-center gap-3 rounded-[10px] border border-gray-200 bg-white px-4 shadow-sm ${className}`}>
      <Icon name="search" variant="outlined" size="small" className="text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
        aria-label={ariaLabel}
      />
    </label>
  );
}
