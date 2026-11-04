using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;
using Npgsql;

namespace MovieBooking.Data.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedUsersData> GetPagedUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? role,
        string? status,
        CancellationToken cancellationToken)
    {
        var users = _context.Users.IgnoreQueryFilters().AsNoTracking();

        if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase))
            users = users.Where(user => user.DeletedAt == null);
        else if (string.Equals(status, "locked", StringComparison.OrdinalIgnoreCase))
            users = users.Where(user => user.DeletedAt != null);

        if (!string.IsNullOrWhiteSpace(role))
            users = users.Where(user => user.UserRoles.Any(userRole => userRole.Role.Name == role));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLowerInvariant();
            users = users.Where(user =>
                (user.FullName != null && user.FullName.ToLower().Contains(normalizedSearch))
                || user.Email.ToLower().Contains(normalizedSearch)
                || (user.Phone != null && user.Phone.Contains(normalizedSearch)));
        }

        var totalCount = await users.CountAsync(cancellationToken);
        var results = await users
            .OrderByDescending(user => user.CreatedAt)
            .ThenBy(user => user.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .ToListAsync(cancellationToken);

        var userIds = results.Select(user => user.Id).ToArray();
        var stats = await _context.Bookings
            .AsNoTracking()
            .Where(booking => userIds.Contains(booking.UserId))
            .GroupBy(booking => booking.UserId)
            .Select(group => new
            {
                UserId = group.Key,
                BookingsCount = group.Count(),
                TotalSpent = group.Where(booking => booking.Status == "success")
                    .Sum(booking => (decimal?)booking.TotalAmount) ?? 0m
            })
            .ToDictionaryAsync(
                item => item.UserId,
                item => new UserBookingStats(item.BookingsCount, item.TotalSpent),
                cancellationToken);

        return new PagedUsersData(results, stats, totalCount, page, pageSize);
    }

    public Task<User?> GetUserByIdAsync(
        Guid id,
        bool includeDeleted,
        bool includeRoles,
        CancellationToken cancellationToken)
    {
        IQueryable<User> query = _context.Users;
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        if (includeRoles)
        {
            query = query
                .Include(user => user.UserRoles)
                    .ThenInclude(userRole => userRole.Role);
        }

        return query.FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public Task<User?> GetUserByEmailAsync(
        string email,
        bool includeDeleted,
        bool includeRoles,
        CancellationToken cancellationToken)
    {
        IQueryable<User> query = _context.Users;
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        if (includeRoles)
        {
            query = query
                .Include(user => user.UserRoles)
                    .ThenInclude(userRole => userRole.Role);
        }

        return query.FirstOrDefaultAsync(user => user.Email.ToLower() == email.ToLower(), cancellationToken);
    }

    public Task<User?> GetActiveUserByExactEmailAsync(
        string email,
        bool includeRoles,
        CancellationToken cancellationToken)
    {
        IQueryable<User> query = _context.Users.Where(user => user.DeletedAt == null);
        if (includeRoles)
        {
            query = query
                .Include(user => user.UserRoles)
                    .ThenInclude(userRole => userRole.Role);
        }

        return query.FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    public Task<User?> GetUserByClerkIdAsync(string clerkId, CancellationToken cancellationToken)
    {
        return _context.Users
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(
                user => user.ClerkId == clerkId && user.DeletedAt == null,
                cancellationToken);
    }

    public Task<User?> GetActiveUserByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _context.Users
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(user => user.Id == id && user.DeletedAt == null, cancellationToken);
    }

    public Task<User?> GetLocalUserForPasswordResetAsync(Guid id, CancellationToken cancellationToken)
    {
        return _context.Users.FirstOrDefaultAsync(
            user => user.Id == id
                && user.DeletedAt == null
                && user.AuthProvider == "local"
                && user.PasswordHash != null
                && user.PasswordHash != string.Empty,
            cancellationToken);
    }

    public Task<bool> ActiveEmailExistsAsync(
        string email,
        Guid? excludingUserId,
        CancellationToken cancellationToken)
    {
        var users = _context.Users.IgnoreQueryFilters()
            .Where(user => user.DeletedAt == null && user.Email.ToLower() == email.ToLower());
        if (excludingUserId.HasValue)
            users = users.Where(user => user.Id != excludingUserId.Value);

        return users.AnyAsync(cancellationToken);
    }

    public Task<Role?> GetRoleByNameAsync(string roleName, CancellationToken cancellationToken)
    {
        return _context.Roles.FirstOrDefaultAsync(role => role.Name == roleName, cancellationToken);
    }

    public async Task<UserBookingStats> GetUserBookingStatsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var stats = await _context.Bookings
            .AsNoTracking()
            .Where(booking => booking.UserId == userId)
            .GroupBy(_ => 1)
            .Select(group => new UserBookingStats(
                group.Count(),
                group.Where(booking => booking.Status == "success")
                    .Sum(booking => (decimal?)booking.TotalAmount) ?? 0m))
            .FirstOrDefaultAsync(cancellationToken);

        return stats ?? new UserBookingStats(0, 0m);
    }

    public Task<int> GetBookingsCountAsync(Guid userId, CancellationToken cancellationToken)
    {
        return _context.Bookings.CountAsync(booking => booking.UserId == userId, cancellationToken);
    }

    public async Task<decimal> GetTotalSpentAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Where(booking => booking.UserId == userId && booking.Status == "success")
            .SumAsync(booking => (decimal?)booking.TotalAmount, cancellationToken) ?? 0m;
    }

    public async Task<bool> AddUserAsync(User user, CancellationToken cancellationToken)
    {
        await _context.Users.AddAsync(user, cancellationToken);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        })
        {
            _context.Entry(user).State = EntityState.Detached;
            return false;
        }
    }

    public async Task UpdateUserAsync(User user, CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task SoftDeleteUserAsync(User user, CancellationToken cancellationToken)
    {
        user.DeletedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> RestoreUserAsync(User user, CancellationToken cancellationToken)
    {
        user.DeletedAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        })
        {
            _context.Entry(user).State = EntityState.Detached;
            return false;
        }
    }

    public async Task DeleteUserPermanentlyAsync(User user, CancellationToken cancellationToken)
    {
        _context.UserRoles.RemoveRange(user.UserRoles);
        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public void Add(User user) => _context.Users.Add(user);

    public void ClearChangeTracker() => _context.ChangeTracker.Clear();

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
