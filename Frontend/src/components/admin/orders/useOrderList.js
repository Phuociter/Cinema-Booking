import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminBookings } from '../../../api/useAdminBookings';
import { isDateRangeInvalid } from './orderStatus';

/**
 * Custom Hook: Quản lý toàn bộ State, API fetching, Debounce,
 * AbortController (tránh race-condition) và Phân trang cho màn hình Đơn đặt vé.
 */
export const useOrderList = () => {
  // Filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('success');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cinemaId, setCinemaId] = useState('');
  const [movieId, setMovieId] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data states
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Refs for race-condition & abort handling
  const listAbortControllerRef = useRef(null);
  const listRequestIdRef = useRef(0);
  const tableContainerRef = useRef(null);

  // Debounce search 400ms
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  // Reset page to 1 on any filter or pageSize change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, dateFrom, dateTo, pageSize, cinemaId, movieId]);

  // Auto-scroll table container to top when page changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  // Fetch list orders
  const loadOrders = useCallback(async () => {
    // If date range is invalid, do not call API
    if (isDateRangeInvalid(dateFrom, dateTo)) {
      setOrders([]);
      setTotalCount(0);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    // Cancel in-flight request
    if (listAbortControllerRef.current) {
      listAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    listAbortControllerRef.current = controller;

    const currentRequestId = ++listRequestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await useAdminBookings.getList(
        {
          page,
          pageSize,
          status: status || undefined,
          search: debouncedSearch || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          cinemaId: cinemaId || undefined,
          movieId: movieId || undefined,
        },
        { signal: controller.signal }
      );

      if (currentRequestId === listRequestIdRef.current) {
        const items = result?.items ?? [];
        const count = result?.totalCount ?? 0;
        setOrders(items);
        setTotalCount(count);

        // Fallback: items empty but totalCount > 0 and page > 1 -> navigate to last page
        if (items.length === 0 && count > 0 && page > 1) {
          const lastPage = Math.max(1, Math.ceil(count / pageSize));
          setPage(lastPage);
        }
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      if (currentRequestId === listRequestIdRef.current) {
        setErrorMessage(err.message || 'Không thể tải danh sách đơn đặt vé.');
      }
    } finally {
      if (currentRequestId === listRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, status, debouncedSearch, dateFrom, dateTo, cinemaId, movieId]);

  useEffect(() => {
    loadOrders();

    return () => {
      if (listAbortControllerRef.current) {
        listAbortControllerRef.current.abort();
      }
    };
  }, [loadOrders]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('success');
    setDateFrom('');
    setDateTo('');
    setCinemaId('');
    setMovieId('');
    setPage(1);
  };

  return {
    orders,
    totalCount,
    isLoading,
    errorMessage,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    cinemaId,
    setCinemaId,
    movieId,
    setMovieId,
    tableContainerRef,
    loadOrders,
    handleResetFilters,
  };
};

export default useOrderList;
