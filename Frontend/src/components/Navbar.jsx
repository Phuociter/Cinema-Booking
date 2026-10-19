
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import {
    Menu,
    Search,
    TicketCheck,
    X,
    Home,
    Film,
    MapPin,
    Calendar,
    Heart,
    User,
    LogIn,
    LogOut
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import AuthModal from './AuthModal';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { user, isAuthenticated, logout } = useAuth();
    const [authModal, setAuthModal] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Hiệu ứng khi cuộn trang
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Đóng menu mobile khi chuyển trang
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Đồng bộ từ khóa khi URL có ?search=
    useEffect(() => {
        setSearchQuery(location.pathname === '/movies'
            ? new URLSearchParams(location.search).get('search') || ''
            : ''
        );
    }, [location.pathname, location.search]);

    const navigationItems = [
        {
            name: 'Trang chủ',
            path: '/',
            icon: Home,
            active: location.pathname === '/'
        },
        {
            name: 'Phim',
            path: '/movies',
            icon: Film,
            active: location.pathname === '/movies'
        },
        {
            name: 'Rạp chiếu',
            path: '/theaters',
            icon: MapPin,
            active: location.pathname === '/theaters'
        },
        {
            name: 'Lịch chiếu',
            path: '/releases',
            icon: Calendar,
            active: location.pathname === '/releases'
        },
        {
            name: 'Yêu thích',
            path: '/favorites',
            icon: Heart,
            active: location.pathname === '/favorites'
        }
    ];

    const handleLinkClick = () => {
        window.scrollTo(0, 0);
        setIsOpen(false);
    };

    // Tìm kiếm phim trên cả desktop và mobile
    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const query = searchQuery.trim();

        setIsOpen(false);
        window.scrollTo(0, 0);

        if (query) {
            navigate(`/movies?search=${encodeURIComponent(query)}`);
        } else {
            navigate('/movies');
        }
    };

    return (
        <>
            {/* Nền tối phía sau menu mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Navbar chính */}
            <nav
                className={`fixed top-0 left-0 z-50 w-full transition-all duration-500 ${isScrolled
                        ? 'bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl'
                        : 'bg-transparent'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 lg:h-20">

                        {/* Logo */}
                        <Link
                            to="/"
                            className="flex-shrink-0 group"
                            onClick={handleLinkClick}
                        >
                            <img
                                src={assets.logo}
                                alt="MovieHub Logo"
                                className="h-8 lg:h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>

                        {/* Menu desktop */}
                        <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
                            {navigationItems.map((item) => {
                                const IconComponent = item.icon;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={handleLinkClick}
                                        className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl font-medium transition-all duration-300 ${item.active
                                                ? 'text-white bg-red-500/20 border border-red-500/30'
                                                : 'text-gray-300 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                        <span className="text-sm lg:text-base">
                                            {item.name}
                                        </span>

                                        {item.active && (
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Khu vực bên phải */}
                        <div className="flex items-center gap-3 lg:gap-4">

                            {/* Tìm kiếm desktop */}
                            <form
                                onSubmit={handleSearchSubmit}
                                className="hidden sm:flex items-center gap-2"
                                role="search"
                            >
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Tìm kiếm phim..."
                                    aria-label="Tìm kiếm phim"
                                    className="w-32 lg:w-44 px-3 py-2 bg-white/10 border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-all"
                                />

                                <button
                                    type="submit"
                                    aria-label="Tìm kiếm"
                                    title="Tìm kiếm phim"
                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-300"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            </form>

                            {/* Đăng nhập hoặc thông tin tài khoản */}
                            {!isAuthenticated ? (
                                <button
                                    onClick={() => setAuthModal('login')}
                                    className="flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-full transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-red-500/25"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span className="hidden sm:inline">Đăng nhập</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="hidden lg:flex items-center gap-2 text-gray-300">
                                        <span className="text-sm">Chào,</span>
                                        <span className="text-white font-medium">
                                            {user?.fullName || 'Bạn'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={logout}
                                        className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/20 hover:text-white"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden sm:inline">Đăng xuất</span>
                                    </button>
                                </div>
                            )}

                            {/* Nút menu mobile */}
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-300"
                                aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
                                aria-expanded={isOpen}
                            >
                                {isOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Menu mobile */}
                <div
                    className={`md:hidden absolute top-full left-0 right-0 transition-all duration-500 ease-in-out ${isOpen
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 -translate-y-4 pointer-events-none'
                        }`}
                >
                    <div className="bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
                        <div className="px-4 py-6 space-y-2">

                            {/* Tìm kiếm mobile */}
                            <form
                                onSubmit={handleSearchSubmit}
                                className="mb-4"
                                role="search"
                            >
                                <label
                                    htmlFor="mobile-movie-search"
                                    className="sr-only"
                                >
                                    Tìm kiếm phim
                                </label>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                                    <input
                                        id="mobile-movie-search"
                                        type="search"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Tìm kiếm phim..."
                                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors duration-300"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full mt-2 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
                                >
                                    Tìm phim
                                </button>
                            </form>

                            {/* Các liên kết điều hướng */}
                            {navigationItems.map((item) => {
                                const IconComponent = item.icon;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={handleLinkClick}
                                        className={`flex items-center gap-4 px-4 py-4 rounded-xl font-medium transition-all duration-300 ${item.active
                                                ? 'text-white bg-red-500/20 border border-red-500/30'
                                                : 'text-gray-300 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <IconComponent className="w-5 h-5" />
                                        <span className="text-lg">{item.name}</span>

                                        {item.active && (
                                            <div className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}

                            {/* Thông tin tài khoản trên mobile */}
                            {isAuthenticated && (
                                <div className="pt-4 mt-4 border-t border-white/10">
                                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
                                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-white font-medium">
                                                {user?.fullName || 'Bạn'}
                                            </p>
                                            <p className="text-gray-400 text-sm truncate">
                                                {user?.email}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            navigate('/my-booking');
                                            setIsOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors duration-300"
                                    >
                                        <TicketCheck className="w-5 h-5" />
                                        <span>Vé đã đặt</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Khoảng trống tránh nội dung bị Navbar che */}
            <div className="h-16 lg:h-20" />

            {authModal && (
                <AuthModal
                    mode={authModal}
                    onClose={() => setAuthModal(null)}
                />
            )}
        </>
    );
};

export default Navbar;
