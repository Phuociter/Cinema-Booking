import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * SearchableSelect - Dropdown tìm kiếm dùng chung cho các bộ lọc Admin
 * Thiết kế chuẩn theo dropdown 'Tất cả rạp' của màn hình Lịch chiếu:
 * - Nút bấm tối màu border zinc-800, hover zinc-700, chevron xoay khi mở.
 * - Hộp dropdown nổi có ô search input gõ tìm nhanh.
 * - Item đầu tiên là 'Tất cả ...' có checkmark khi được chọn.
 * - Cuộn mượt danh sách options, checkmark cho option được chọn.
 */
export const SearchableSelect = ({
  value = '',
  onChange,
  options = [], // [{ value: string|number, label: string, sublabel?: string }]
  placeholder = 'Tất cả',
  searchPlaceholder = 'Tìm kiếm...',
  emptyText = 'Không tìm thấy dữ liệu',
  className = '',
  buttonClassName = '',
  disabled = false,
  ariaLabel = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (o) =>
        (o.label && o.label.toLowerCase().includes(term)) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        aria-label={ariaLabel || placeholder}
        className={`flex items-center justify-between gap-2 bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 hover:border-zinc-700 focus:border-primary outline-none min-w-[150px] max-w-[240px] cursor-pointer text-left transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-72 rounded-md border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl shadow-black/80 z-50 flex flex-col text-xs">
          {/* Ô input tìm kiếm */}
          <div className="relative mb-1.5 shrink-0">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded pl-7 pr-2 py-1.5 text-xs placeholder-zinc-500 focus:border-primary outline-none"
            />
          </div>

          {/* Danh sách options cuộn */}
          <div className="overflow-y-auto space-y-0.5 max-h-52 pr-0.5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-left transition-colors cursor-pointer ${
                !value
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <span>{placeholder}</span>
              {!value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>

            {filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  <div className="truncate pr-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-zinc-500">{opt.sublabel}</div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="py-3 text-center text-zinc-500 text-[11px]">
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
