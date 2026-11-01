using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;
using StackExchange.Redis;

namespace MovieBooking.Service.Services;

public sealed class AuthService : IAuthService
{
    private const int Ok = 200;
    private const int BadRequest = 400;
    private const int Unauthorized = 401;
    private const int Conflict = 409;

    private readonly IUserRepository _userRepository;
    private readonly IUserProfileService _userProfileService;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IUserProfileService userProfileService,
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _userProfileService = userProfileService;
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<AuthOperationResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return new(BadRequest, new { message = "Họ và tên không được để trống" });
        if (string.IsNullOrWhiteSpace(request.Email))
            return new(BadRequest, new { message = "Email không được để trống" });
        if (string.IsNullOrWhiteSpace(request.Password))
            return new(BadRequest, new { message = "Mật khẩu không được để trống" });

        var normalizedEmail = request.Email.Trim();
        if (await _userRepository.GetActiveUserByExactEmailAsync(normalizedEmail, false, cancellationToken) is not null)
            return new(Conflict, new { message = "Email đã tồn tại" });

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Phone = request.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await AssignCustomerRoleAsync(user, cancellationToken);
        _userRepository.Add(user);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return new(Ok, CreateAuthResponse(user));
    }

    public async Task<AuthOperationResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return new(BadRequest, new { message = "Email và mật khẩu không được để trống" });

        var user = await _userRepository.GetUserByEmailAsync(
            request.Email.Trim(),
            includeDeleted: false,
            includeRoles: true,
            cancellationToken);
        if (user is null
            || string.IsNullOrEmpty(user.PasswordHash)
            || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return new(Unauthorized, new { message = "Email hoặc mật khẩu không hợp lệ" });
        }

        return new(Ok, CreateAuthResponse(user));
    }

    public async Task<AuthOperationResult> GetCurrentUserAsync(string? userId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return new(Unauthorized);

        var id = Guid.Parse(userId);
        var user = await _userRepository.GetActiveUserByIdAsync(id, cancellationToken);
        return user is null ? new(404) : new(Ok, MapUser(user));
    }

    public async Task<AuthOperationResult> ClerkSyncAsync(
        ClaimsPrincipal principal,
        CancellationToken cancellationToken)
    {
        var clerkUserId = principal.FindFirst("sub")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(clerkUserId))
            return new(Unauthorized, new { message = "Token Clerk không hợp lệ: thiếu sub claim" });

        var email = principal.FindFirst("email")?.Value ?? principal.FindFirst(ClaimTypes.Email)?.Value;
        var fullName = principal.FindFirst("name")?.Value ?? principal.FindFirst(ClaimTypes.Name)?.Value;
        var emailVerified = principal.FindFirst("email_verified")?.Value;

        if (string.IsNullOrEmpty(email))
        {
            var clerkSecretKey = _configuration["CLERK_SECRET_KEY"]
                ?? Environment.GetEnvironmentVariable("CLERK_SECRET_KEY");
            if (string.IsNullOrEmpty(clerkSecretKey))
                return new(Unauthorized, new { message = "Chưa cấu hình CLERK_SECRET_KEY để xác thực email người dùng" });

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", clerkSecretKey);
            var response = await _httpClient.GetAsync($"https://api.clerk.com/v1/users/{clerkUserId}", cancellationToken);
            if (!response.IsSuccessStatusCode)
                return new(Unauthorized, new { message = "Không thể lấy thông tin người dùng từ Clerk Backend API" });

            var userJson = await response.Content.ReadAsStringAsync(cancellationToken);
            using var document = JsonDocument.Parse(userJson);
            var root = document.RootElement;
            var primaryEmailId = root.TryGetProperty("primary_email_address_id", out var primaryId)
                ? primaryId.GetString()
                : null;

            if (root.TryGetProperty("email_addresses", out var emails)
                && emails.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in emails.EnumerateArray())
                {
                    var itemId = item.TryGetProperty("id", out var idProperty) ? idProperty.GetString() : null;
                    var address = item.TryGetProperty("email_address", out var addressProperty)
                        ? addressProperty.GetString()
                        : null;
                    var isVerified = item.TryGetProperty("verification", out var verification)
                        && verification.TryGetProperty("status", out var status)
                        && status.GetString() == "verified";

                    if (isVerified && (itemId == primaryEmailId || string.IsNullOrEmpty(email)))
                    {
                        email = address;
                        emailVerified = "true";
                        if (itemId == primaryEmailId)
                            break;
                    }
                }
            }

            if (string.IsNullOrEmpty(fullName))
            {
                var firstName = root.TryGetProperty("first_name", out var first) ? first.GetString() : "";
                var lastName = root.TryGetProperty("last_name", out var last) ? last.GetString() : "";
                fullName = $"{firstName} {lastName}".Trim();
            }
        }

        if (string.IsNullOrEmpty(email))
            return new(Unauthorized, new { message = "Token Clerk không hợp lệ hoặc thiếu thông tin email" });
        if (!string.Equals(emailVerified, "true", StringComparison.OrdinalIgnoreCase))
            return new(BadRequest, new { message = "Email chưa được xác thực qua Clerk" });

        var normalizedEmail = email.Trim();
        var user = await _userRepository.GetUserByClerkIdAsync(clerkUserId, cancellationToken);
        if (user is null)
        {
            user = await _userRepository.GetActiveUserByExactEmailAsync(
                normalizedEmail,
                includeRoles: true,
                cancellationToken);
            if (user is not null)
            {
                user.ClerkId = clerkUserId;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    FullName = fullName ?? normalizedEmail,
                    Email = normalizedEmail,
                    ClerkId = clerkUserId,
                    AuthProvider = "clerk",
                    PasswordHash = null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await AssignCustomerRoleAsync(user, cancellationToken);
                _userRepository.Add(user);
            }

            try
            {
                await _userRepository.SaveChangesAsync(cancellationToken);
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                _userRepository.ClearChangeTracker();
                user = await _userRepository.GetActiveUserByExactEmailAsync(
                    normalizedEmail,
                    includeRoles: true,
                    cancellationToken);
                if (user is null)
                    throw;
            }
        }

        return new(Ok, CreateAuthResponse(user));
    }

    public async Task<AuthOperationResult> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        const string responseMessage = "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";
        var frontendUrl = _configuration["FRONTEND_URL"]
            ?? Environment.GetEnvironmentVariable("FRONTEND_URL")
            ?? string.Empty;

        try
        {
            await _userProfileService.RequestPasswordResetAsync(request.Email, frontendUrl, cancellationToken);
        }
        catch (RedisException exception)
        {
            _logger.LogError(exception, "Password-reset request could not access Redis.");
        }
        catch (EmailDeliveryException exception)
        {
            _logger.LogError(exception, "Password-reset email delivery failed.");
        }
        catch (InvalidOperationException exception)
        {
            _logger.LogError(exception, "Password-reset request could not be completed due to invalid configuration.");
        }

        return new(Ok, new { message = responseMessage });
    }

    public async Task<AuthOperationResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        const string invalidTokenMessage = "Liên kết không hợp lệ hoặc đã hết hạn.";
        try
        {
            var result = await _userProfileService.ResetPasswordAsync(request, cancellationToken);
            return result switch
            {
                ResetPasswordResult.Success => new(Ok, new { message = "Đặt lại mật khẩu thành công." }),
                ResetPasswordResult.InvalidToken => new(BadRequest, new { message = invalidTokenMessage }),
                _ => throw new InvalidOperationException("Unexpected password-reset result.")
            };
        }
        catch (RedisException exception)
        {
            _logger.LogError(exception, "Password-reset token could not be verified because Redis is unavailable.");
            return new(BadRequest, new { message = invalidTokenMessage });
        }
    }

    private async Task AssignCustomerRoleAsync(User user, CancellationToken cancellationToken)
    {
        var customerRole = await _userRepository.GetRoleByNameAsync("Customer", cancellationToken);
        if (customerRole is not null)
        {
            user.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = customerRole.Id,
                Role = customerRole
            });
        }
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        var roles = GetRoles(user);
        return new AuthResponse
        {
            Token = GenerateJwtToken(user, roles),
            ExpireAt = DateTime.UtcNow.AddHours(24),
            User = MapUser(user, roles)
        };
    }

    private static UserDto MapUser(User user, List<string>? roles = null)
    {
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            AvatarUrl = user.AvatarUrl,
            AuthProvider = user.AuthProvider,
            Roles = roles ?? GetRoles(user)
        };
    }

    private static List<string> GetRoles(User user)
    {
        var roles = user.UserRoles
            .Where(userRole => userRole.Role is not null)
            .Select(userRole => userRole.Role.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        return roles.Count > 0 ? roles : ["Customer"];
    }

    private string GenerateJwtToken(User user, IReadOnlyCollection<string> roles)
    {
        var jwtSecret = _configuration["JWT_SECRET"] ?? Environment.GetEnvironmentVariable("JWT_SECRET");
        if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
        {
            throw new InvalidOperationException(
                "CẤU HÌNH BẢO MẬT KHÔNG HỢP LỆ: Biến môi trường JWT_SECRET chưa được thiết lập hoặc ngắn hơn 32 ký tự.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName ?? user.Email)
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            issuer: null,
            audience: null,
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
