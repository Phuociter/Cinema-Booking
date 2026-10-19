using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;
using StackExchange.Redis;

namespace MovieBooking.Service.Services;

public sealed class UserProfileService : IUserProfileService
{
    private const int ResetTokenLifetimeSeconds = 15 * 60;

    private const string ConsumeResetTokenScript = """
        local token = redis.call('GET', KEYS[1])
        if token then
            redis.call('DEL', KEYS[1])
            return token
        end
        return false
        """;

    private readonly AppDbContext _context;
    private readonly IDatabase _redis;
    private readonly IEmailSender _emailSender;

    public UserProfileService(
        AppDbContext context,
        IConnectionMultiplexer redis,
        IEmailSender emailSender)
    {
        _context = context;
        _redis = redis.GetDatabase();
        _emailSender = emailSender;
    }

    public async Task<UserDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await GetUserWithRolesAsync(userId, cancellationToken);
        return user is null ? null : MapUser(user);
    }

    public async Task<UserDto?> UpdateProfileAsync(
        Guid userId,
        UpdateUserProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await GetUserWithRolesAsync(userId, cancellationToken);
        if (user is null)
            return null;

        user.FullName = request.FullName.Trim();
        if (request.Phone is not null)
            user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (request.AvatarUrl is not null)
            user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return MapUser(user);
    }

    public async Task<UserDto?> UpdateAvatarAsync(
        Guid userId,
        string avatarUrl,
        CancellationToken cancellationToken)
    {
        var user = await GetUserWithRolesAsync(userId, cancellationToken);
        if (user is null)
            return null;

        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return MapUser(user);
    }

    public async Task<ChangePasswordResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(item => item.Id == userId && item.DeletedAt == null, cancellationToken);

        if (user is null)
            return ChangePasswordResult.UserNotFound;

        if (IsExternalOnlyAccount(user))
            return ChangePasswordResult.ExternalProvider;

        if (string.IsNullOrEmpty(user.PasswordHash))
            return ChangePasswordResult.LocalPasswordNotSet;

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return ChangePasswordResult.InvalidCurrentPassword;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return ChangePasswordResult.Success;
    }

    public async Task RequestPasswordResetAsync(
        string? email,
        string frontendUrl,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = email?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalizedEmail))
            return;

        var cooldownKey = $"reset-cooldown:{normalizedEmail}";
        var cooldownAcquired = await _redis.StringSetAsync(
            cooldownKey,
            "1",
            TimeSpan.FromSeconds(60),
            When.NotExists);
        if (!cooldownAcquired)
            return;

        if (!System.Net.Mail.MailAddress.TryCreate(normalizedEmail, out var parsedEmail)
            || !string.Equals(parsedEmail.Address, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            return;

        if (!_emailSender.IsConfigured)
        {
            await _emailSender.SendAsync(
                normalizedEmail,
                "Đặt lại mật khẩu Cinema",
                string.Empty,
                cancellationToken);
            return;
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Email.ToLower() == normalizedEmail && item.DeletedAt == null,
                cancellationToken);

        if (user is null
            || !string.Equals(user.AuthProvider, "local", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrEmpty(user.PasswordHash))
            return;

        if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out var baseUri)
            || (baseUri.Scheme != Uri.UriSchemeHttp && baseUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("FRONTEND_URL must be a valid HTTP or HTTPS URL.");
        }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        var tokenKey = $"reset:{tokenHash}";
        var stored = await _redis.StringSetAsync(
            tokenKey,
            user.Id.ToString(),
            TimeSpan.FromSeconds(ResetTokenLifetimeSeconds));
        if (!stored)
            throw new InvalidOperationException("Could not store the password-reset token.");

        var resetUrl = new UriBuilder(baseUri)
        {
            Path = $"{baseUri.AbsolutePath.TrimEnd('/')}/reset-password",
            Query = $"token={Uri.EscapeDataString(token)}",
            Fragment = string.Empty
        }.Uri.ToString();
        try
        {
            await _emailSender.SendAsync(
                user.Email,
                "Đặt lại mật khẩu Cinema",
                $"Bấm vào liên kết sau để đặt lại mật khẩu của bạn. Liên kết chỉ dùng một lần và hết hạn sau 15 phút:\n\n{resetUrl}\n\nNếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
                cancellationToken);
        }
        catch (EmailDeliveryException)
        {
            await _redis.KeyDeleteAsync(tokenKey);
            throw;
        }
    }

    public async Task<ResetPasswordResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return ResetPasswordResult.InvalidToken;

        var tokenHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(request.Token)));
        var tokenKey = $"reset:{tokenHash}";
        var userIdValue = await _redis.ScriptEvaluateAsync(
            ConsumeResetTokenScript,
            new RedisKey[] { tokenKey });
        if (userIdValue.IsNull)
            return ResetPasswordResult.InvalidToken;

        if (!Guid.TryParse((string?)userIdValue, out var userId))
            return ResetPasswordResult.InvalidToken;

        var user = await _context.Users.FirstOrDefaultAsync(
            item => item.Id == userId
                && item.DeletedAt == null
                && item.AuthProvider == "local"
                && item.PasswordHash != null
                && item.PasswordHash != string.Empty,
            cancellationToken);
        if (user is null)
            return ResetPasswordResult.InvalidToken;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return ResetPasswordResult.Success;
    }

    private Task<User?> GetUserWithRolesAsync(Guid userId, CancellationToken cancellationToken)
    {
        return _context.Users
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(user => user.Id == userId && user.DeletedAt == null, cancellationToken);
    }

    private static UserDto MapUser(User user)
    {
        var roles = user.UserRoles
            .Where(userRole => userRole.Role is not null)
            .Select(userRole => userRole.Role!.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            AvatarUrl = user.AvatarUrl,
            AuthProvider = user.AuthProvider,
            Roles = roles.Count > 0 ? roles : new List<string> { "Customer" }
        };
    }

    private static bool IsExternalOnlyAccount(User user)
    {
        return string.Equals(user.AuthProvider, "clerk", StringComparison.OrdinalIgnoreCase)
            || (string.IsNullOrEmpty(user.PasswordHash) && !string.IsNullOrEmpty(user.ClerkId));
    }

}
