import React, { useMemo } from 'react';
import { RotateCw, Table as TableIcon, Calendar } from 'lucide-react';
import { SearchableSelect } from '../ui';

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
  // Trích xuất danh sách tỉnh/thành độc nhất từ các cụm rạp
  const cities = useMemo(() => {
    const set = new Set();
    cinemas.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [cinemas]);

  // Lọc cụm rạp theo tỉnh/thành đã chọn
  const filteredCinemasByCity = useMemo(() => {
    if (!filterState.city) return cinemas;
    return cinemas.filter((c) => c.city === filterState.city);
  }, [cinemas, filterState.city]);

  const selectedCinema = cinemas.find((c) => c.id === filterState.cinemaId);
  const availableAuditoriums = selectedCinema ? selectedCinema.auditoriums || [] : [];

  const handleCityChange = (newCity) => {
    const isCurrentCinemaInCity =
      filterState.cinemaId &&
      cinemas.some((c) => c.id === filterState.cinemaId && (!newCity || c.city === newCity));

    onFilterChange({
      ...filterState,
      city: newCity,
      cinemaId: isCurrentCinemaInCity ? filterState.cinemaId : '',
      auditoriumId: isCurrentCinemaInCity ? filterState.auditoriumId : '',
    });
  };

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
        {/* 1. Lọc Khu vực / Tỉnh thành */}
        <SearchableSelect
          options={cities.map((city) => ({ value: city, label: city }))}
          value={filterState.city || ''}
          onChange={handleCityChange}
          placeholder="Tất cả tỉnh thành"
          searchPlaceholder="Tìm kiếm tỉnh thành..."
          emptyText="Không tìm thấy tỉnh thành nào"
          buttonClassName="min-w-[150px] max-w-[200px]"
          ariaLabel="Lọc theo tỉnh thành"
        />

        {/* 2. Lọc Cụm rạp */}
        <SearchableSelect
          options={filteredCinemasByCity.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.city,
          }))}
          value={filterState.cinemaId || ''}
          onChange={handleCinemaChange}
          placeholder="Tất cả rạp"
          searchPlaceholder="Tìm kiếm cụm rạp..."
          emptyText="Không tìm thấy cụm rạp nào"
          buttonClassName="min-w-[170px] max-w-[260px]"
          ariaLabel="Lọc theo cụm rạp"
        />

        {/* 3. Lọc Phòng chiếu (cascade theo rạp) */}
        <select
          value={filterState.auditoriumId || ''}
          onChange={(e) => handleChange('auditoriumId', e.target.value)}
          disabled={!filterState.cinemaId}
          className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Lọc theo phòng chiếu"
        >
          <option value="">Mọi phòng chiếu</option>
          {availableAuditoriums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.hallType})
            </option>
          ))}
        </select>

        {/* 4. Lọc Phim */}
        <SearchableSelect
          options={movies.map((m) => ({
            value: m.id,
            label: m.title,
          }))}
          value={filterState.movieId || ''}
          onChange={(newMovieId) => handleChange('movieId', newMovieId)}
          placeholder="Tất cả phim"
          searchPlaceholder="Tìm kiếm phim..."
          emptyText="Không tìm thấy phim nào"
          buttonClassName="min-w-[160px] max-w-[240px]"
          ariaLabel="Lọc theo phim"
        />

        {/* 5. Lọc Ngày chiếu */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={filterState.date || ''}
            onChange={(e) => handleChange('date', e.target.value)}
            onClick={(e) => {
              try {
                if (typeof e.currentTarget.showPicker === 'function') {
                  e.currentTarget.showPicker();
                }
              } catch {
                /* ignore error if picker already shown or unsupported */
              }
            }}
            className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none cursor-pointer [color-scheme:dark]"
            title="Bấm để chọn ngày chiếu"
            aria-label="Lọc theo ngày chiếu"
          />
          {filterState.date && (
            <button
              type="button"
              onClick={() => handleChange('date', '')}
              className="absolute right-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs px-1 rounded cursor-pointer transition-colors"
              title="Xóa lọc ngày (xem tất cả ngày)"
            >
              ✕
            </button>
          )}
        </div>

        {/* 6. Lọc Trạng thái */}
        <select
          value={filterState.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 focus:border-primary outline-none"
          aria-label="Lọc theo trạng thái"
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
