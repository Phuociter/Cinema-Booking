import axiosInstance from './axiosInstance';

/**
 * API Module: Payments Gateway (Phụ trách: Dev E)
 * Quản lý tạo URL thanh toán (MoMo ) và Kiểm tra trạng thái giao dịch
 */
export const usePayments = {
  // Tạo thanh toán MoMo sandbox cho đơn đặt vé
  createPayment: async (bookingId) => {
    return await axiosInstance.post('/payments/create', { bookingId });
  },

  // Polling tra cứu trạng thái thanh toán đơn đặt vé
  getPaymentStatus: async (bookingId) => {
    return await axiosInstance.get(`/payments/${bookingId}/status`);
  },
};

export default usePayments;
