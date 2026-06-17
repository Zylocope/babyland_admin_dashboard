import { IconSearch } from '@tabler/icons-react';

export default function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <IconSearch size={16} stroke={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 text-sm border border-app rounded-lg w-full bg-card text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-shadow"
      />
    </div>
  );
}
