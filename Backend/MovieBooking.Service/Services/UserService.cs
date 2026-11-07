using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public sealed class UserService : IUserService
{
    private const int Ok = 200;
    private const int Created = 201;
    private const int BadRequest = 400;
    private const int NotFound = 404;
    private const int Conflict = 409;
    private const int InternalServerError = 500;
    private const int PageSizeLimit = 100;
    private static readonly string[] SupportedRoles = ["Customer", "Staff", "Admin"];

    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository userRepository, ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<UserServiceResult<AdminUsersPageDto>> GetPagedUsersAsync(
        AdminUsersQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page < 1 || query.PageSize < 1)
            return new(BadRequest, Message: "Số trang và kích thước trang phải lớn hơn 0.");

        if (!string.IsNullOrWhiteSpace(query.Role) && !TryGetSupportedRole(query.Role, out _))
            return new(BadRequest, Message: "Vai trò lọc không hợp lệ.");

        if (!string.IsNullOrWhiteSpace(query.Status)
            && !string.Equals(query.Status, "active", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(query.Status, "locked", StringComparison.OrdinalIgnoreCase))
        {
            return new(BadRequest, Message: "Trạng thái lọc không hợp lệ.");
        }

        var pageSize = Math.Min(query.PageSize, PageSizeLimit);
        var page = await _userRepository.GetPagedUsersAsync(
            query.Page,
            pageSize,
            query.Search,
            TryGetSupportedRole(query.Role, out var role) ? role : null,
            query.Status,
            cancellationToken);
        var items = page.Users.Select(user => MapAdminUser(
            user,
            user.DeletedAt is null,
            page.BookingStats.GetValueOrDefault(user.Id) ?? new UserBookingStats(0, 0m)));

        return new(
            Ok,
            new AdminUsersPageDto(
                items.ToList(),
                query.Page,
                pageSize,
                page.TotalCount,
                (int)Math.Ceiling(page.TotalCount / (double)pageSize)));
    }

    public async Task<AdminUserDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetUserByIdAsync(id, includeDeleted: true, includeRoles: true, cancellationToken);
        if (user is null)
            return null;

        var stats = await _userRepository.GetUserBookingStatsAsync(user.Id, cancellationToken);
        return MapAdminUser(user, user.DeletedAt is null, stats);
    }

    public async Task<UserServiceResult<AdminUserDto>> CreateUserAsync(
        CreateAdminUserRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetSupportedRole(request.Role, out var roleName))
            return new(BadRequest, Message: "Vai trò phải là Customer, Staff hoặc Admin.");
        if (!IsValidPhone(request.Phone))
            return new(BadRequest, Message: "Số điện thoại phải gồm đúng 10 chữ số.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _userRepository.ActiveEmailExistsAsync(email, null, cancellationToken))
            return new(Conflict, Message: "Email đã được sử dụng bởi một tài khoản đang hoạt động.");

        var role = await _userRepository.GetRoleByNameAsync(roleName, cancellationToken);
        if (role is null)
        {
            _logger.LogError("Required role {RoleName} was not found while creating an admin-managed user.", roleName);
            return new(InternalServerError, Message: "Không tìm thấy vai trò cần thiết trong hệ thống.");
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            AuthProvider = "local",
            CreatedAt = now,
            UpdatedAt = now
        };
        user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id, Role = role });

        if (!await _userRepository.AddUserAsync(user, cancellationToken))
            return new(Conflict, Message: "Email đã được sử dụng bởi một tài khoản đang hoạt động.");

        return new(Created, MapAdminUser(user, true, new UserBookingStats(0, 0m)));
    }

    public async Task<UserServiceResult<AdminUserDto>> UpdateUserAsync(
        Guid id,
        Guid currentUserId,
        UpdateAdminUserRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetSupportedRole(request.Role, out var roleName))
            return new(BadRequest, Message: "Vai trò phải là Customer, Staff hoặc Admin.");
        if (!IsValidPhone(request.Phone))
            return new(BadRequest, Message: "Số điện thoại phải gồm đúng 10 chữ số.");

        var user = await _userRepository.GetUserByIdAsync(id, includeDeleted: true, includeRoles: true, cancellationToken);
        if (user is null)
            return new(NotFound, Message: "Không tìm thấy tài khoản.");

        if (id == currentUserId && !string.Equals(roleName, "Admin", StringComparison.Ordinal))
        {
            return new(Conflict,
                Message: "Bạn không thể tự thu hồi hoặc hạ cấp vai trò Admin của chính mình.");
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword)
            && (!string.Equals(user.AuthProvider, "local", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(user.PasswordHash)))
        {
            return new(Conflict,
                Message: "Chỉ tài khoản Local đã có mật khẩu nội bộ mới có thể được đặt lại mật khẩu tại đây.");
        }

        var role = await _userRepository.GetRoleByNameAsync(roleName, cancellationToken);
        if (role is null)
        {
            _logger.LogError("Required role {RoleName} was not found while updating admin-managed user {UserId}.", roleName, id);
            return new(InternalServerError, Message: "Không tìm thấy vai trò cần thiết trong hệ thống.");
        }

        user.FullName = request.FullName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        var selectedRole = user.UserRoles.FirstOrDefault(userRole => userRole.RoleId == role.Id);
        foreach (var obsoleteRole in user.UserRoles.Where(userRole => userRole.RoleId != role.Id).ToList())
            user.UserRoles.Remove(obsoleteRole);
        if (selectedRole is null)
            user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id, Role = role });

        await _userRepository.UpdateUserAsync(user, cancellationToken);
        var stats = await _userRepository.GetUserBookingStatsAsync(user.Id, cancellationToken);
        return new(Ok, MapAdminUser(user, user.DeletedAt is null, stats));
    }

    public async Task<UserServiceResult<bool>> DeleteUserAsync(
        Guid id,
        Guid currentUserId,
        bool hardDelete,
        CancellationToken cancellationToken)
    {
        if (id == currentUserId)
            return new(Conflict, Message: "Bạn không thể khóa hoặc xóa chính tài khoản đang sử dụng.");

        var user = await _userRepository.GetUserByIdAsync(id, includeDeleted: true, includeRoles: true, cancellationToken);
        if (user is null || (user.DeletedAt is not null && !hardDelete))
            return new(NotFound, Message: "Không tìm thấy tài khoản phù hợp.");

        if (hardDelete)
        {
            if (await _userRepository.GetBookingsCountAsync(id, cancellationToken) > 0)
            {
                return new(Conflict,
                    Message: "Không thể xóa vĩnh viễn tài khoản đã phát sinh đơn đặt vé. Hãy khóa tài khoản để giữ nguyên lịch sử.");
            }

            await _userRepository.DeleteUserPermanentlyAsync(user, cancellationToken);
        }
        else
        {
            await _userRepository.SoftDeleteUserAsync(user, cancellationToken);
        }

        return new(204, true);
    }

    public async Task<UserServiceResult<bool>> RestoreUserAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetUserByIdAsync(id, includeDeleted: true, includeRoles: false, cancellationToken);
        if (user is null)
            return new(NotFound, Message: "Không tìm thấy tài khoản.");
        if (user.DeletedAt is null)
            return new(Conflict, Message: "Tài khoản này đang hoạt động.");

        if (await _userRepository.ActiveEmailExistsAsync(user.Email, id, cancellationToken))
        {
            return new(Conflict,
                Message: "Không thể khôi phục vì email đã được một tài khoản đang hoạt động khác sử dụng.");
        }

        if (!await _userRepository.RestoreUserAsync(user, cancellationToken))
        {
            return new(Conflict,
                Message: "Không thể khôi phục vì email đã được một tài khoản đang hoạt động khác sử dụng.");
        }
        return new(Ok, true);
    }

    private static AdminUserDto MapAdminUser(User user, bool isActive, UserBookingStats stats)
    {
        return new AdminUserDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Phone,
            user.AvatarUrl,
            user.AuthProvider,
            user.UserRoles
                .Where(userRole => userRole.Role is not null)
                .Select(userRole => userRole.Role.Name)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList(),
            isActive,
            stats.BookingsCount,
            stats.TotalSpent,
            new DateTimeOffset(DateTime.SpecifyKind(user.CreatedAt, DateTimeKind.Utc)));
    }

    private static bool IsValidPhone(string? phone) =>
        string.IsNullOrWhiteSpace(phone) || Regex.IsMatch(phone.Trim(), @"^[0-9]{10}$");

    private static bool TryGetSupportedRole(string? role, out string roleName)
    {
        roleName = SupportedRoles.FirstOrDefault(
            supportedRole => string.Equals(supportedRole, role?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
        return roleName.Length > 0;
    }
}
