import {
  LayoutDashboard,
  Film,
  Building2,
  CalendarDays,
  Ticket,
  Popcorn,
  Users,
} from 'lucide-react';

export const ADMIN_MODULES = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'movies',
    label: 'Phim',
    path: '/admin/movies',
    icon: Film,
  },
  {
    id: 'cinemas',
    label: 'Rạp & phòng chiếu',
    path: '/admin/cinemas',
    icon: Building2,
  },
  {
    id: 'showtimes',
    label: 'Lịch chiếu',
    path: '/admin/showtimes',
    icon: CalendarDays,
  },
  {
    id: 'orders',
    label: 'Đơn đặt vé',
    path: '/admin/orders',
    icon: Ticket,
  },
  {
    id: 'snacks',
    label: 'Bắp nước',
    path: '/admin/snacks',
    icon: Popcorn,
  },
  {
    id: 'users',
    label: 'Người dùng',
    path: '/admin/users',
    icon: Users,
  },
];
