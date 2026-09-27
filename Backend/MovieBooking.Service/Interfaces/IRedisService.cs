namespace MovieBooking.Service.Interfaces;

// Service dùng chung cho toàn bộ thao tác với Redis Cache (Reusable Service)
// Phục vụ: Dev C (Tạm giữ ghế TTL 5 phút - SET NX EX), Dev E (Rate limit đăng nhập), Dashboard (Cache báo cáo)
public interface IRedisService
{
    // Đọc giá trị chuỗi theo key
    Task<string?> GetStringAsync(string key);

    Task<bool> SetStringAsync(string key, string value, TimeSpan? expiry = null, bool onlyIfNotExists = false);

    // Đọc và tự động deserialize JSON thành Object T (Hỗ trợ cả 2 tên GetAsync và GetObjectAsync)
    Task<T?> GetAsync<T>(string key);
    Task<T?> GetObjectAsync<T>(string key);

    // Tự động serialize JSON một Object T và ghi vào Redis kèm TTL (Hỗ trợ cả 2 tên SetAsync và SetObjectAsync)
    Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiry = null, bool onlyIfNotExists = false);
    Task<bool> SetObjectAsync<T>(string key, T value, TimeSpan? expiry = null, bool onlyIfNotExists = false);

    // Xóa key khỏi Redis
    Task<bool> RemoveAsync(string key);

    // Xóa tất cả các key bắt đầu bằng prefix (dùng cho cache invalidation)
    Task RemoveByPrefixAsync(string prefix);

    // Kiểm tra key có tồn tại trong Redis không
    Task<bool> ExistsAsync(string key);
}
