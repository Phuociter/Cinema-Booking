using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ và tên không được để trống" });

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email không được để trống" });

        if (string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Mật khẩu không được để trống" });

        var normalizedEmail = request.Email.Trim();

        var exists = await _context.Users.AnyAsync(u => u.Email == normalizedEmail && u.DeletedAt == null);
        if (exists)
            return Conflict(new { message = "Email đã tồn tại" });

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

        await AssignCustomerRoleAsync(user);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var roles = GetRoles(user);
        var token = GenerateJwtToken(user, roles);

        return Ok(new AuthResponse
        {
            Token = token,
            ExpireAt = DateTime.UtcNow.AddHours(24),
            User = new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Roles = roles
            }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email và mật khẩu không được để trống" });

        var user = await _context.Users
            .Include(item => item.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email.Trim() && u.DeletedAt == null);

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email hoặc mật khẩu không hợp lệ" });

        var roles = GetRoles(user);
        var token = GenerateJwtToken(user, roles);

        return Ok(new AuthResponse
        {
            Token = token,
            ExpireAt = DateTime.UtcNow.AddHours(24),
            User = new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Roles = roles
            }
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var guid = Guid.Parse(userId);

        var user = await _context.Users
            .Include(item => item.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(u => u.Id == guid && u.DeletedAt == null);

        if (user == null)
            return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Roles = GetRoles(user)
        });
    }

    [HttpPost("clerk-sync")]
    [Authorize(AuthenticationSchemes = "ClerkJwt")]
    public async Task<IActionResult> ClerkSync()
    {
        var clerkUserId = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(clerkUserId))
            return Unauthorized(new { message = "Token Clerk không hợp lệ: thiếu sub claim" });

        var email = User.FindFirstValue("email") ?? User.FindFirstValue(ClaimTypes.Email);
        var fullName = User.FindFirstValue("name") ?? User.FindFirstValue(ClaimTypes.Name);
        var emailVerified = User.FindFirstValue("email_verified");

        // Nếu token Clerk không có sẵn claim email, Backend gọi Clerk API theo sub
        if (string.IsNullOrEmpty(email))
        {
            var clerkSecretKey = _configuration["CLERK_SECRET_KEY"] 
                ?? Environment.GetEnvironmentVariable("CLERK_SECRET_KEY");

            if (string.IsNullOrEmpty(clerkSecretKey))
                return Unauthorized(new { message = "Chưa cấu hình CLERK_SECRET_KEY để xác thực email người dùng" });

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", clerkSecretKey);
            var response = await httpClient.GetAsync($"https://api.clerk.com/v1/users/{clerkUserId}");
            if (!response.IsSuccessStatusCode)
                return Unauthorized(new { message = "Không thể lấy thông tin người dùng từ Clerk Backend API" });

            var userJson = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(userJson);
            var root = doc.RootElement;
            var primaryEmailId = root.TryGetProperty("primary_email_address_id", out var pId) ? pId.GetString() : null;

            if (root.TryGetProperty("email_addresses", out var emails) && emails.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var item in emails.EnumerateArray())
                {
                    var id = item.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                    var address = item.TryGetProperty("email_address", out var addrProp) ? addrProp.GetString() : null;
                    var isVerified = item.TryGetProperty("verification", out var vProp) 
                        && vProp.TryGetProperty("status", out var sProp) 
                        && sProp.GetString() == "verified";

                    if (isVerified && (id == primaryEmailId || string.IsNullOrEmpty(email)))
                    {
                        email = address;
                        emailVerified = "true";
                        if (id == primaryEmailId) break;
                    }
                }
            }

            if (string.IsNullOrEmpty(fullName))
            {
                var firstName = root.TryGetProperty("first_name", out var f) ? f.GetString() : "";
                var lastName = root.TryGetProperty("last_name", out var l) ? l.GetString() : "";
                fullName = $"{firstName} {lastName}".Trim();
            }
        }

        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { message = "Token Clerk không hợp lệ hoặc thiếu thông tin email" });

        if (!string.Equals(emailVerified, "true", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Email chưa được xác thực qua Clerk" });

        var normalizedEmail = email.Trim();

        // 1. Tìm theo clerk_id
        var user = await _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.ClerkId == clerkUserId && u.DeletedAt == null);

        if (user == null)
        {
            // 2. Tìm theo email để liên kết với tài khoản local có sẵn
            user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail && u.DeletedAt == null);

            if (user != null)
            {
                user.ClerkId = clerkUserId;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // 3. Tạo mới tài khoản Clerk
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

                await AssignCustomerRoleAsync(user);
                _context.Users.Add(user);
            }

            // TODO: xử lý race condition kỹ hơn nếu cần scale
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                _context.ChangeTracker.Clear();
                user = await _context.Users
                    .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Email == normalizedEmail && u.DeletedAt == null);

                if (user == null)
                    throw;
            }
        }

        var roles = GetRoles(user);
        var token = GenerateJwtToken(user, roles);

        return Ok(new AuthResponse
        {
            Token = token,
            ExpireAt = DateTime.UtcNow.AddHours(24),
            User = new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                Roles = roles
            }
        });
    }

    private async Task AssignCustomerRoleAsync(User user)
    {
        var customerRole = await _context.Roles.FirstOrDefaultAsync(role => role.Name == "Customer");
        if (customerRole != null)
        {
            user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = customerRole.Id, Role = customerRole });
        }
    }
    private static List<string> GetRoles(User user)
    {
        var roles = user.UserRoles
            .Where(userRole => userRole.Role != null)
            .Select(userRole => userRole.Role.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return roles.Count > 0 ? roles : new List<string> { "Customer" };
    }

    private string GenerateJwtToken(User user, IReadOnlyCollection<string> roles)
    {
        var jwtSecret = _configuration["JWT_SECRET"] ?? Environment.GetEnvironmentVariable("JWT_SECRET");
        if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
        {
            throw new InvalidOperationException("CẤU HÌNH BẢO MẬT KHÔNG HỢP LỆ: Biến môi trường JWT_SECRET chưa được thiết lập hoặc ngắn hơn 32 ký tự.");
        }
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName ?? user.Email)
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            issuer: null,
            audience: null,
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
