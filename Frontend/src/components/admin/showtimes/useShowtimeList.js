import { useState, useEffect, useCallback, useRef } from 'react';
import { useShowtimes } from '../../../api/useShowtimes';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants';

export const getTodayLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useShowtimeList = (viewMode) => {
  const [showtimes, setShowtimes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [serverPageSize, setServerPageSize] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterState, setFilterState] = useState({
    city: '',
    cinemaId: '',
    auditoriumId: '',
    movieId: '',
    date: getTodayLocalDate(),
    status: '',
  });

  const tableContainerRef = useRef(null);

  const fetchShowtimes = useCallback(async () => {
    if (viewMode === 'timeline' && !filterState.cinemaId) {
      setShowtimes([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const safePageSize = PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
      const effectivePageSize = viewMode === 'timeline' ? 200 : safePageSize;
      const effectivePage = viewMode === 'timeline' ? 1 : page;

      const p = { page: effectivePage, pageSize: effectivePageSize };
      if (filterState.cinemaId) p.cinemaId = filterState.cinemaId;
      if (filterState.movieId) p.movieId = filterState.movieId;
      if (filterState.date) p.date = filterState.date;
      p.status = filterState.status || 'all';

      const res = await useShowtimes.getShowtimes(p);
      const items = res?.data?.items || [];
      const total = res?.data?.totalCount ?? items.length;
      const returnedPageSize = res?.data?.pageSize ?? effectivePageSize;

      setShowtimes(items);
      setTotalCount(total);
      setServerPageSize(returnedPageSize < effectivePageSize ? returnedPageSize : null);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách suất chiếu.');
      setShowtimes([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, filterState.cinemaId, filterState.movieId, filterState.date, filterState.status, page, pageSize]);

  useEffect(() => {
    fetchShowtimes();
  }, [fetchShowtimes]);

  const handleFilterChange = (newFilters) => {
    setFilterState(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageSizeChange = (newSize) => {
    const safeSize = PAGE_SIZE_OPTIONS.includes(newSize) ? newSize : DEFAULT_PAGE_SIZE;
    setPageSize(safeSize);
    setPage(1);
  };

  return {
    showtimes,
    totalCount,
    serverPageSize,
    page,
    pageSize,
    isLoading,
    error,
    filterState,
    tableContainerRef,
    fetchShowtimes,
    handleFilterChange,
    handlePageChange,
    handlePageSizeChange,
  };
};

export default useShowtimeList;
