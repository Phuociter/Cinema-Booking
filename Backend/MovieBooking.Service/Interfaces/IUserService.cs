using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IUserService
{
    Task<UserServiceResult<AdminUsersPageDto>> GetPagedUsersAsync(AdminUsersQuery query, CancellationToken cancellationToken);
    Task<AdminUserDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UserServiceResult<AdminUserDto>> CreateUserAsync(CreateAdminUserRequest request, CancellationToken cancellationToken);
    Task<UserServiceResult<AdminUserDto>> UpdateUserAsync(Guid id, Guid currentUserId, UpdateAdminUserRequest request, CancellationToken cancellationToken);
    Task<UserServiceResult<bool>> DeleteUserAsync(Guid id, Guid currentUserId, bool hardDelete, CancellationToken cancellationToken);
    Task<UserServiceResult<bool>> RestoreUserAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record UserServiceResult<T>(int StatusCode, T? Data = default, string? Message = null);
