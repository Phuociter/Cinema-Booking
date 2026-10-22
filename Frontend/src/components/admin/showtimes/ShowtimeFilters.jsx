import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RotateCw, Table as TableIcon, Calendar, Search, ChevronDown, Check } from 'lucide-react';

const SearchableCinemaSelect = ({ cinemas = [], value = '', onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCinema = cinemas.find((c) => c.id === value);

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

  const filteredCinemas = useMemo(() => {
    if (!searchTerm.trim()) return cinemas;
    const term = searchTerm.toLowerCase();
    return cinemas.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
    );
  }, [cinemas, searchTerm]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className="flex items-center justify-between gap-2 bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 hover:border-zinc-700 focus:border-primary outline-none min-w-[170px] max-w-[260px] cursor-pointer text-left transition-colors"
      >
        <span className="truncate">
          {selectedCinema ? selectedCinema.name : 'Mọi cụm rạp'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-72 rounded-md border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl shadow-black/80 z-50 flex flex-col text-xs">
          {/* Ô input tìm kiếm ở đầu tiên */}
          <div className="relative mb-1.5 shrink-0">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm cụm rạp..."
              className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded pl-7 pr-2 py-1.5 text-xs placeholder-zinc-500 focus:border-primary outline-none"
            />
          </div>

          {/* Danh sách rạp có thanh cuộn */}
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
              <span>Mọi cụm rạp</span>
              {!value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>

            {filteredCinemas.map((c) => {
              const isSelected = c.id === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  <div className="truncate pr-1">
                    <div className="truncate">{c.name}</div>
                    {c.city && <div className="text-[10px] text-zinc-500">{c.city}</div>}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}

            {filteredCinemas.length === 0 && (
              <div className="py-3 text-center text-zinc-500 text-[11px]">
                Không tìm thấy cụm rạp nào
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ShowtimeFilters = ({
  cinemas = [],
  movies = [],
  filterState = {},
  onFilterChange,
  onRefresh,
  viewMode = 'table',
  onViewModeChange,
  isLoading = false,
}) => {
  const selectedCinema = cinemas.find((c) => c.id === filterState.cinemaId);
  const availableAuditoriums = selectedCinema ? selectedCinema.auditoriums || [] : [];

  const handleCinemaChange = (newCinemaId) => {
    onFilterChange({
      ...filterState,
      cinemaId: newCinemaId,
      auditoriumId: '',
    });
  };

  const handleChange = (field, value) => {
    onFilterChange({
      ...filterState,
      [field]: value,
    });
  };

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
      {/* 1. Lọc Cụm rạp (Có ô tìm kiếm nhanh) */}
      <SearchableCinemaSelect
        cinemas={cinemas}
        value={filterState.cinemaId || ''}
        onChange={handleCinemaChange}
      />

      {/* 2. Lọc Phòng chiếu (cascade theo rạp) */}
      <select
        value={filterState.auditoriumId || ''}
        onChange={(e) => handleChange('auditoriumId', e.target.value)}
        disabled={!filterState.cinemaId}
        className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Mọi phòng chiếu</option>
        {availableAuditoriums.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.hallType})
          </option>
        ))}
      </select>

      {/* 3. Lọc Phim */}
      <select
        value={filterState.movieId || ''}
        onChange={(e) => handleChange('movieId', e.target.value)}
        className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none max-w-[180px] truncate"
      >
        <option value="">Mọi phim</option>
        {movies.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>

      {/* 4. Lọc Ngày chiếu */}
      <input
        type="date"
        value={filterState.date || ''}
        onChange={(e) => handleChange('date', e.target.value)}
        className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none"
      />

      {/* 5. Lọc Trạng thái */}
      <select
        value={filterState.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
        className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="scheduled">Đã lên lịch</option>
        <option value="cancelled">Đã hủy</option>
      </select>

      {/* Nút Làm mới */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        title="Làm mới danh sách"
      >
        <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        <span>Làm mới</span>
      </button>

      {/* Segmented Control chuyển đổi View: Bảng / Lịch theo phòng */}
      <div className="flex items-center ml-auto border border-zinc-800 rounded overflow-hidden">
        <button
          type="button"
          onClick={() => onViewModeChange('table')}
          className={`flex items-center gap-1 px-3 py-1.5 transition-colors cursor-pointer ${
            viewMode === 'table'
              ? 'bg-primary text-white font-medium hover:bg-primary-dull'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TableIcon className="h-3.5 w-3.5" />
          <span>Bảng</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('timeline')}
          className={`flex items-center gap-1 px-3 py-1.5 transition-colors cursor-pointer ${
            viewMode === 'timeline'
              ? 'bg-primary text-white font-medium hover:bg-primary-dull'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Lịch theo phòng</span>
        </button>
      </div>
    </div>
    {filterState.auditoriumId && (
      <div className="text-[11px] text-zinc-500 italic mt-1.5">
        Lọc theo phòng chỉ áp dụng trên các dòng của trang hiện tại
      </div>
    )}
  </div>
  );
};

export default ShowtimeFilters;
