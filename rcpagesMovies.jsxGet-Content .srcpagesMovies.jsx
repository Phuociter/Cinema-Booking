[1mdiff --git a/Frontend/src/api/useMovies.js b/Frontend/src/api/useMovies.js[m
[1mindex 48979e6..37fe7b6 100644[m
[1m--- a/Frontend/src/api/useMovies.js[m
[1m+++ b/Frontend/src/api/useMovies.js[m
[36m@@ -1,21 +1,55 @@[m
[31m-[m
 import axiosInstance from './axiosInstance';[m
 [m
 const useMovies = {[m
[31m-    async getAllMovies({ status, search, page = 1, pageSize = 12 } = {}) {[m
[31m-        const params = { page, pageSize };[m
[32m+[m[32m    async getAllMovies({[m
[32m+[m[32m        status,[m
[32m+[m[32m        search,[m
[32m+[m[32m        genre,[m
[32m+[m[32m        city,[m
[32m+[m[32m        cinemaId,[m
[32m+[m[32m        sortBy = 'latest',[m
[32m+[m[32m        page = 1,[m
[32m+[m[32m        pageSize = 12[m
[32m+[m[32m    } = {}) {[m
[32m+[m[32m        const params = {[m
[32m+[m[32m            page,[m
[32m+[m[32m            pageSize,[m
[32m+[m[32m            sortBy[m
[32m+[m[32m        };[m
[32m+[m
[32m+[m[32m        const optionalParams = {[m
[32m+[m[32m            status,[m
[32m+[m[32m            search,[m
[32m+[m[32m            genre: genre && genre !== 'all' ? genre : undefined,[m
[32m+[m[32m            city,[m
[32m+[m[32m            cinemaId[m
[32m+[m[32m        };[m
 [m
[31m-        if (status) params.status = status;[m
[31m-        if (search) params.search = search;[m
[32m+[m[32m        for (const [key, value] of Object.entries(optionalParams)) {[m
[32m+[m[32m            if ([m
[32m+[m[32m                value !== undefined &&[m
[32m+[m[32m                value !== null &&[m
[32m+[m[32m                String(value).trim() !== ''[m
[32m+[m[32m            ) {[m
[32m+[m[32m                params[key] = String(value).trim();[m
[32m+[m[32m            }[m
[32m+[m[32m        }[m
 [m
         return axiosInstance.get('/movies', { params });[m
     },[m
 [m
     async getMovieById(id) {[m
[31m-        if (!id) throw new Error('ID phim không được để trống');[m
[32m+[m[32m        if (!id) {[m
[32m+[m[32m            throw new Error('ID phim không được để trống');[m
[32m+[m[32m        }[m
[32m+[m
         return axiosInstance.get(`/movies/${encodeURIComponent(id)}`);[m
     },[m
 [m
[32m+[m[32m    async getCinemas() {[m
[32m+[m[32m        return axiosInstance.get('/cinemas');[m
[32m+[m[32m    },[m
[32m+[m
     async getGenres() {[m
         return axiosInstance.get('/genres');[m
     },[m
[36m@@ -25,19 +59,30 @@[m [mconst useMovies = {[m
     },[m
 [m
     async updateMovie(id, data) {[m
[31m-        if (!id) throw new Error('ID phim không được để trống');[m
[31m-        return axiosInstance.put(`/movies/${encodeURIComponent(id)}`, data);[m
[32m+[m[32m        if (!id) {[m
[32m+[m[32m            throw new Error('ID phim không được để trống');[m
[32m+[m[32m        }[m
[32m+[m
[32m+[m[32m        return axiosInstance.put([m
[32m+[m[32m            `/movies/${encodeURIComponent(id)}`,[m
[32m+[m[32m            data[m
[32m+[m[32m        );[m
     },[m
 [m
     async deleteMovie(id) {[m
[31m-        if (!id) throw new Error('ID phim không được để trống');[m
[31m-        return axiosInstance.delete(`/movies/${encodeURIComponent(id)}`);[m
[32m+[m[32m        if (!id) {[m
[32m+[m[32m            throw new Error('ID phim không được để trống');[m
[32m+[m[32m        }[m
[32m+[m
[32m+[m[32m        return axiosInstance.delete([m
[32m+[m[32m            `/movies/${encodeURIComponent(id)}`[m
[32m+[m[32m        );[m
     },[m
 [m
     async getTopMoviesReport() {[m
         return axiosInstance.get('/movies/reports/top');[m
[31m-    },[m
[32m+[m[32m    }[m
 };[m
 [m
 export { useMovies };[m
[31m-export default useMovies;[m
[32m+[m[32mexport default useMovies;[m
\ No newline at end of file[m
[1mdiff --git a/Frontend/src/pages/Movies.jsx b/Frontend/src/pages/Movies.jsx[m
[1mindex 876e745..5ab9646 100644[m
[1m--- a/Frontend/src/pages/Movies.jsx[m
[1m+++ b/Frontend/src/pages/Movies.jsx[m
[36m@@ -1,5 +1,7 @@[m
[31m-[m
[32m+[m[32m﻿jsx[m
 import React, { useState, useEffect } from 'react';[m
[32m+[m[32mimport { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';[m
[32m+[m[32mimport { useSearchParams } from 'react-router-dom';[m
 import MovieCard from '../components/MovieCard';[m
 import {[m
     Search,[m
[36m@@ -12,7 +14,9 @@[m [mimport {[m
     Loader2,[m
     SlidersHorizontal,[m
     X,[m
[31m-    ChevronDown[m
[32m+[m[32m    ChevronDown,[m
[32m+[m[32m    ChevronLeft,[m
[32m+[m[32m    ChevronRight[m
 } from 'lucide-react';[m
 import BlurCircle from '../components/BlurCircle';[m
 import { useMovies } from '../api';[m
[36m@@ -29,120 +33,298 @@[m [mconst mapMovie = (movie) => ({[m
     genres: movie.genres?.map((name) => ({ name })) || [][m
 });[m
 [m
[32m+[m[32mconst normalizeCity = (city) =>[m
[32m+[m[32m    (city || '').trim().toLocaleLowerCase('vi');[m
[32m+[m
 const Movies = () => {[m
[32m+[m[32m    const [searchParams, setSearchParams] = useSearchParams();[m
[32m+[m
[32m+[m[32m    const searchParam = searchParams.get('search') || '';[m
[32m+[m[32m    const cityParam = searchParams.get('city') || '';[m
[32m+[m[32m    const cinemaIdParam = searchParams.get('cinemaId') || '';[m
[32m+[m
     const [movies, setMovies] = useState([]);[m
     const [genres, setGenres] = useState([]);[m
[32m+[m[32m    const [cinemas, setCinemas] = useState([]);[m
[32m+[m[32m    const [cinemasLoaded, setCinemasLoaded] = useState(false);[m
[32m+[m
     const [loading, setLoading] = useState(true);[m
[31m-    const [searchQuery, setSearchQuery] = useState('');[m
[32m+[m[32m    const [searchQuery, setSearchQuery] = useState(searchParam);[m
     const [selectedGenre, setSelectedGenre] = useState('all');[m
[32m+[m[32m    const [selectedCity, setSelectedCity] = useState(cityParam);[m
[32m+[m[32m    const [selectedCinemaId, setSelectedCinemaId] = useState(cinemaIdParam);[m
[32m+[m
     const [sortBy, setSortBy] = useState('latest');[m
     const [viewMode, setViewMode] = useState('grid');[m
     const [showFilters, setShowFilters] = useState(false);[m
[31m-    const [filteredMovies, setFilteredMovies] = useState([]);[m
[32m+[m[32m    const [currentPage, setCurrentPage] = useState(1);[m
[32m+[m[32m    const [totalPages, setTotalPages] = useState(1);[m
[32m+[m[32m    const [totalItems, setTotalItems] = useState(0);[m
[32m+[m[32m    const [refreshKey, setRefreshKey] = useState(0);[m
 [m
[32m+[m[32m    const pageSize = 12;[m
[32m+[m[32m    const filteredMovies = movies;[m
[32m+[m
[32m+[m[32m    // Đồng bộ các bộ lọc từ URL khi mở trang hoặc URL thay đổi.[m
[32m+[m[32m    useEffect(() => {[m
[32m+[m[32m        setSearchQuery(searchParam);[m
[32m+[m[32m        setSelectedCity(cityParam);[m
[32m+[m[32m        setSelectedCinemaId(cinemaIdParam);[m
[32m+[m[32m        setCurrentPage(1);[m
[32m+[m[32m    }, [searchParam, cityParam, cinemaIdParam]);[m
[32m+[m
[32m+[m[32m    // Tải danh sách rạp để tạo bộ lọc tỉnh/thành và cụm rạp.[m
     useEffect(() => {[m
         let cancelled = false;[m
 [m
[31m-        const loadMovies = async () => {[m
[32m+[m[32m        const loadCinemas = async () => {[m
             try {[m
[31m-                setLoading(true);[m
[32m+[m[32m                const response = await useMovies.getCinemas();[m
[32m+[m
[32m+[m[32m                if (cancelled) return;[m
[32m+[m
[32m+[m[32m                const list = Array.isArray(response)[m
[32m+[m[32m                    ? response[m
[32m+[m[32m                    : Array.isArray(response?.items)[m
[32m+[m[32m                        ? response.items[m
[32m+[m[32m                        : Array.isArray(response?.data)[m
[32m+[m[32m                            ? response.data[m
[32m+[m[32m                            : Array.isArray(response?.data?.items)[m
[32m+[m[32m                                ? response.data.items[m
[32m+[m[32m                                : [];[m
[32m+[m
[32m+[m[32m                setCinemas(list);[m
[32m+[m[32m            } catch (error) {[m
[32m+[m[32m                if (!cancelled) {[m
[32m+[m[32m                    console.error('Lỗi khi tải danh sách rạp:', error);[m
[32m+[m[32m                    setCinemas([]);[m
[32m+[m[32m                }[m
[32m+[m[32m            } finally {[m
[32m+[m[32m                if (!cancelled) {[m
[32m+[m[32m                    setCinemasLoaded(true);[m
[32m+[m[32m                }[m
[32m+[m[32m            }[m
[32m+[m[32m        };[m
[32m+[m
[32m+[m[32m        void loadCinemas();[m
[32m+[m
[32m+[m[32m        return () => {[m
[32m+[m[32m            cancelled = true;[m
[32m+[m[32m        };[m
[32m+[m[32m    }, []);[m
[32m+[m
[32m+[m[32m    // Nếu URL chỉ có cinemaId, tự xác định thành phố của rạp đó.[m
[32m+[m[32m    // Chỉ xử lý sau khi đã tải xong danh sách rạp.[m
[32m+[m[32m    useEffect(() => {[m
[32m+[m[32m        if (!cinemasLoaded || !selectedCinemaId) return;[m
[32m+[m
[32m+[m[32m        const cinema = cinemas.find([m
[32m+[m[32m            (item) =>[m
[32m+[m[32m                String(item.id).toLowerCase() ===[m
[32m+[m[32m                String(selectedCinemaId).toLowerCase()[m
[32m+[m[32m        );[m
[32m+[m
[32m+[m[32m        if (!cinema?.city) return;[m
[32m+[m
[32m+[m[32m        const cinemaCity = cinema.city.trim();[m
[32m+[m
[32m+[m[32m        if ([m
[32m+[m[32m            !selectedCity ||[m
[32m+[m[32m            normalizeCity(selectedCity) !== normalizeCity(cinemaCity)[m
[32m+[m[32m        ) {[m
[32m+[m[32m            setSelectedCity(cinemaCity);[m
[32m+[m
[32m+[m[32m            setSearchParams([m
[32m+[m[32m                (previous) => {[m
[32m+[m[32m                    const next = new URLSearchParams(previous);[m
[32m+[m[32m                    next.set('city', cinemaCity);[m
[32m+[m[32m                    next.set('cinemaId', String(cinema.id));[m
[32m+[m[32m                    return next;[m
[32m+[m[32m                },[m
[32m+[m[32m                { replace: true }[m
[32m+[m[32m            );[m
[32m+[m[32m        }[m
[32m+[m[32m    }, [[m
[32m+[m[32m        cinemasLoaded,[m
[32m+[m[32m        cinemas,[m
[32m+[m[32m        selectedCinemaId,[m
[32m+[m[32m        selectedCity,[m
[32m+[m[32m        setSearchParams[m
[32m+[m[32m    ]);[m
[32m+[m
[32m+[m[32m    const cities = [[m
[32m+[m[32m        ...new Set([m
[32m+[m[32m            cinemas[m
[32m+[m[32m                .map((cinema) => cinema.city?.trim())[m
[32m+[m[32m                .filter(Boolean)[m
[32m+[m[32m        )[m
[32m+[m[32m    ].sort((a, b) => a.localeCompare(b, 'vi'));[m
[32m+[m
[32m+[m[32m    const filteredCinemas = cinemas.filter([m
[32m+[m[32m        (cinema) =>[m
[32m+[m[32m            !selectedCity ||[m
[32m+[m[32m            normalizeCity(cinema.city) === normalizeCity(selectedCity)[m
[32m+[m[32m    );[m
[32m+[m
[32m+[m[32m    // Tải danh sách phim theo các bộ lọc và phân trang.[m
[32m+[m[32m    useEffect(() => {[m
[32m+[m[32m        let cancelled = false;[m
[32m+[m
[32m+[m[32m        const loadMovies = async () => {[m
[32m+[m[32m            setLoading(true);[m
 [m
[31m-                const data = await useMovies.getAllMovies({[m
[32m+[m[32m            try {[m
[32m+[m[32m                const response = await useMovies.getAllMovies({[m
                     status: 'now_showing',[m
[31m-                    page: 1,[m
[31m-                    pageSize: 100[m
[32m+[m[32m                    search: searchQuery.trim() || undefined,[m
[32m+[m[32m                    genre: selectedGenre === 'all'[m
[32m+[m[32m                        ? undefined[m
[32m+[m[32m                        : selectedGenre,[m
[32m+[m[32m                    city: selectedCity || undefined,[m
[32m+[m[32m                    cinemaId: selectedCinemaId || undefined,[m
[32m+[m[32m                    sortBy,[m
[32m+[m[32m                    page: currentPage,[m
[32m+[m[32m                    pageSize[m
                 });[m
 [m
[32m+[m[32m                if (cancelled) return;[m
[32m+[m
[32m+[m[32m                const items = Array.isArray(response)[m
[32m+[m[32m                    ? response[m
[32m+[m[32m                    : response?.items || [];[m
[32m+[m
[32m+[m[32m                setMovies(items.map(mapMovie));[m
[32m+[m[32m                setTotalItems(response?.totalItems ?? items.length);[m
[32m+[m[32m                setTotalPages([m
[32m+[m[32m                    Math.max(1, response?.totalPages ?? 1)[m
[32m+[m[32m                );[m
[32m+[m[32m            } catch (error) {[m
                 if (!cancelled) {[m
[31m-                    setMovies((data.items || []).map(mapMovie));[m
[32m+[m[32m                    console.error('Lỗi khi tải danh sách phim:', error);[m
[32m+[m[32m                    setMovies([]);[m
[32m+[m[32m                    setTotalItems(0);[m
[32m+[m[32m                    setTotalPages(1);[m
                 }[m
[31m-            } catch (error) {[m
[31m-                console.error('Lỗi khi tải danh sách phim:', error);[m
[31m-                if (!cancelled) setMovies([]);[m
             } finally {[m
[31m-                if (!cancelled) setLoading(false);[m
[32m+[m[32m                if (!cancelled) {[m
[32m+[m[32m                    setLoading(false);[m
[32m+[m[32m                }[m
             }[m
         };[m
 [m
[32m+[m[32m        void loadMovies();[m
[32m+[m
[32m+[m[32m        return () => {[m
[32m+[m[32m            cancelled = true;[m
[32m+[m[32m        };[m
[32m+[m[32m    }, [[m
[32m+[m[32m        searchQuery,[m
[32m+[m[32m        selectedGenre,[m
[32m+[m[32m        selectedCity,[m
[32m+[m[32m        selectedCinemaId,[m
[32m+[m[32m        sortBy,[m
[32m+[m[32m        currentPage,[m
[32m+[m[32m        refreshKey[m
[32m+[m[32m    ]);[m
[32m+[m
[32m+[m[32m    // Tải danh sách thể loại từ API.[m
[32m+[m[32m    useEffect(() => {[m
[32m+[m[32m        let cancelled = false;[m
[32m+[m
         const loadGenres = async () => {[m
             try {[m
[31m-                const data = await useMovies.getGenres();[m
[32m+[m[32m                const response = await useMovies.getGenres();[m
 [m
                 if (cancelled) return;[m
 [m
[31m-                const genreList = Array.isArray(data)[m
[31m-                    ? data[m
[31m-                    : data?.items || [];[m
[32m+[m[32m                const genreList = Array.isArray(response)[m
[32m+[m[32m                    ? response[m
[32m+[m[32m                    : response?.items || [];[m
 [m
                 setGenres([m
                     genreList[m
                         .map((genre) =>[m
[31m-                            typeof genre === 'string' ? genre : genre.name[m
[32m+[m[32m                            typeof genre === 'string'[m
[32m+[m[32m                                ? genre[m
[32m+[m[32m                                : genre?.name[m
                         )[m
                         .filter(Boolean)[m
                 );[m
             } catch (error) {[m
[31m-                console.error('Lỗi khi tải thể loại:', error);[m
[31m-                if (!cancelled) setGenres([]);[m
[32m+[m[32m                if (!cancelled) {[m
[32m+[m[32m                    console.error('Lỗi khi tải thể loại:', error);[m
[32m+[m[32m                }[m
             }[m
         };[m
 [m
[31m-        loadMovies();[m
[31m-        loadGenres();[m
[32m+[m[32m        void loadGenres();[m
 [m
         return () => {[m
             cancelled = true;[m
         };[m
     }, []);[m
 [m
[32m+[m[32m    // Làm mới danh sách khi dữ liệu phim thay đổi qua SignalR.[m
     useEffect(() => {[m
[31m-        let result = [...movies];[m
[32m+[m[32m        let cancelled = false;[m
[32m+[m[32m        let connection = null;[m
 [m
[31m-        // Tìm kiếm theo tên phim hoặc thể loại[m
[31m-        if (searchQuery.trim()) {[m
[31m-            const query = searchQuery.toLowerCase();[m
[32m+[m[32m        const connectSignalR = async () => {[m
[32m+[m[32m            const apiBaseUrl = ([m
[32m+[m[32m                import.meta.env.VITE_API_BASE_URL ||[m
[32m+[m[32m                'http://localhost:5000/api'[m
[32m+[m[32m            ).replace(/\/+$/, '');[m
 [m
[31m-            result = result.filter((movie) =>[m
[31m-                movie.title?.toLowerCase().includes(query) ||[m
[31m-                movie.genre?.toLowerCase().includes(query)[m
[31m-            );[m
[31m-        }[m
[32m+[m[32m            const hubUrl =[m
[32m+[m[32m                apiBaseUrl.replace(/\/api$/i, '') + '/hubs/movies';[m
 [m
[31m-        // Lọc theo thể loại[m
[31m-        if (selectedGenre !== 'all') {[m
[31m-            result = result.filter((movie) =>[m
[31m-                movie.genres?.some([m
[31m-                    (genre) => genre.name?.toLowerCase() === selectedGenre.toLowerCase()[m
[31m-                )[m
[31m-            );[m
[31m-        }[m
[32m+[m[32m            const newConnection = new HubConnectionBuilder()[m
[32m+[m[32m                .withUrl(hubUrl)[m
[32m+[m[32m                .withAutomaticReconnect()[m
[32m+[m[32m                .configureLogging(LogLevel.Warning)[m
[32m+[m[32m                .build();[m
 [m
[31m-        // Sắp xếp phim[m
[31m-        switch (sortBy) {[m
[31m-            case 'title':[m
[31m-                result.sort((a, b) =>[m
[31m-                    (a.title || '').localeCompare(b.title || '')[m
[31m-                );[m
[31m-                break;[m
[32m+[m[32m            connection = newConnection;[m
 [m
[31m-            case 'rating':[m
[31m-                result.sort([m
[31m-                    (a, b) => (b.ratingScore || 0) - (a.ratingScore || 0)[m
[31m-                );[m
[31m-                break;[m
[31m-[m
[31m-            case 'latest':[m
[31m-            default:[m
[31m-                result.sort([m
[31m-                    (a, b) =>[m
[31m-                        new Date(b.releaseDate || 0) -[m
[31m-                        new Date(a.releaseDate || 0)[m
[31m-                );[m
[31m-                break;[m
[31m-        }[m
[32m+[m[32m            const refreshMovies = () => {[m
[32m+[m[32m                if (!cancelled) {[m
[32m+[m[32m                    setRefreshKey((value) => value + 1);[m
[32m+[m[32m                }[m
[32m+[m[32m            };[m
 [m
[31m-        setFilteredMovies(result);[m
[31m-    }, [movies, searchQuery, selectedGenre, sortBy]);[m
[32m+[m[32m            newConnection.on('MovieCreated', refreshMovies);[m
[32m+[m[32m            newConnection.on('MovieUpdated', refreshMovies);[m
[32m+[m[32m            newConnection.on('MovieDeleted', refreshMovies);[m
[32m+[m[32m            newConnection.onreconnected(refreshMovies);[m
[32m+[m
[32m+[m[32m            try {[m
[32m+[m[32m                await newConnection.start();[m
[32m+[m
[32m+[m[32m                if (cancelled) {[m
[32m+[m[32m                    await newConnection.stop();[m
[32m+[m[32m                    return;[m
[32m+[m[32m                }[m
[32m+[m
[32m+[m[32m                console.info('SignalR đã kết nối:', hubUrl);[m
[32m+[m[32m            } catch (error) {[m
[32m+[m[32m                if (!cancelled) {[m
[32m+[m[32m                    console.error('Không thể kết nối SignalR:', error);[m
[32m+[m[32m   