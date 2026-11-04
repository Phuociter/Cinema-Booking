using MovieBooking.Data.Entities;

namespace MovieBooking.Data.Repositories.Interfaces;

public sealed record UserBookingStats(int BookingsCount, decimal TotalSpent);

public sealed record PagedUsersData(
    IReadOnlyList<User> Users,
    IReadOnlyDictionary<Guid, UserBookingStats> BookingStats,
    int TotalCount,
    int Page,
    int PageSize);

public interface IUserRepository
{
    Task<PagedUsersData> GetPagedUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? role,
        string? status,
        CancellationToken cancellationToken);

    Task<User?> GetUserByIdAsync(Guid id, bool includeDeleted, bool includeRoles, CancellationToken cancellationToken);
    Task<User?> GetUserByEmailAsync(string email, bool includeDeleted, bool includeRoles, CancellationToken cancellationToken);
    Task<User?> GetActiveUserByExactEmailAsync(string email, bool includeRoles, CancellationToken cancellationToken);
    Task<User?> GetUserByClerkIdAsync(string clerkId, CancellationToken cancellationToken);
    Task<User?> GetActiveUserByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<User?> GetLocalUserForPasswordResetAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> ActiveEmailExistsAsync(string email, Guid? excludingUserId, CancellationToken cancellationToken);
    Task<Role?> GetRoleByNameAsync(string roleName, CancellationToken cancellationToken);
    Task<UserBookingStats> GetUserBookingStatsAsync(Guid userId, CancellationToken cancellationToken);
    Task<int> GetBookingsCountAsync(Guid userId, CancellationToken cancellationToken);
    Task<decimal> GetTotalSpentAsync(Guid userId, CancellationToken cancellationToken);
    Task<bool> AddUserAsync(User user, CancellationToken cancellationToken);
    Task UpdateUserAsync(User user, CancellationToken cancellationToken);
    Task SoftDeleteUserAsync(User user, CancellationToken cancellationToken);
    Task<bool> RestoreUserAsync(User user, CancellationToken cancellationToken);
    Task DeleteUserPermanentlyAsync(User user, CancellationToken cancellationToken);
    void Add(User user);
    void ClearChangeTracker();
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
