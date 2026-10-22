using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;
using Npgsql;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private const long MaxAvatarFileSizeBytes = 5 * 1024 * 1024;
    private const long MaxAvatarRequestSizeBytes = MaxAvatarFileSizeBytes + 64 * 1024;
    private const string AvatarUrlPrefix = "/uploads/avatars/";

    private readonly IUserProfileService _userProfileService;
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUserProfileService userProfileService,
        AppDbContext context,
        IWebHostEnvironment environment,
        ILogger<UsersController> logger)
    {
        _userProfileService = userProfileService;
        _context = context;
        _environment = environment;
        _logger = logger;
    }

    [HttpGet("~/api/admin/users")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType<AdminUsersPageDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetAdminUsers(
        [FromQuery] AdminUsersQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page < 1 || query.PageSize < 1)
            return BadRequest(new { message = "Số trang và kích thước trang phải lớn hơn 0." });

        if (!IsSupportedRoleFilter(query.Role))
            return BadRequest(new { message = "Vai trò lọc không hợp lệ." });

        if (!string.IsNullOrWhiteSpace(query.Status)
            && !string.Equals(query.Status, "active", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(query.Status, "locked", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Trạng thái lọc không hợp lệ." });
        }

        var pageSize = Math.Min(query.PageSize, 100);
        var users = _context.Users.IgnoreQueryFilters().AsNoTracking();

        if (string.Equals(query.Status, "active", StringComparison.OrdinalIgnoreCase))
            users = users.Where(user => user.DeletedAt == null);
        else if (string.Equals(query.Status, "locked", StringComparison.OrdinalIgnoreCase))
            users = users.Where(user => user.DeletedAt != null);

        if (TryGetSupportedRole(query.Role, out var filteredRole))
            users = users.Where(user => user.UserRoles.Any(userRole =>
                userRole.Role.Name == filteredRole));

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            users = users.Where(user =>
                (user.FullName != null && user.FullName.ToLower().Contains(search))
                || user.Email.ToLower().Contains(search)
                || (user.Phone != null && user.Phone.Contains(search)));
        }

        var totalCount = await users.CountAsync(cancellationToken);
        var results = await users
            .OrderByDescending(user => user.CreatedAt)
            .ThenBy(user => user.Id)
            .Skip((query.Page - 1) * pageSize)
            .Take(pageSize)
            .Select(user => new AdminUserDto(
                user.Id,
                user.FullName,
                user.Email,
                user.Phone,
                user.AvatarUrl,
                user.AuthProvider,
                user.UserRoles.Select(userRole => userRole.Role.Name).ToList(),
                user.DeletedAt == null,
                user.Bookings.Count,
                user.Bookings
                    .Where(booking => booking.Status == "success")
                    .Sum(booking => (decimal?)booking.TotalAmount) ?? 0m,
                new DateTimeOffset(DateTime.SpecifyKind(user.CreatedAt, DateTimeKind.Utc))))
            .ToListAsync(cancellationToken);

        return Ok(new AdminUsersPageDto(
            results,
            query.Page,
            pageSize,
            totalCount,
            (int)Math.Ceiling(totalCount / (double)pageSize)));
    }

    [HttpGet("~/api/admin/users/{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAdminUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new AdminUserDto(
                item.Id,
                item.FullName,
                item.Email,
                item.Phone,
                item.AvatarUrl,
                item.AuthProvider,
                item.UserRoles.Select(userRole => userRole.Role.Name).ToList(),
                item.DeletedAt == null,
                item.Bookings.Count,
                item.Bookings
                    .Where(booking => booking.Status == "success")
                    .Sum(booking => (decimal?)booking.TotalAmount) ?? 0m,
                new DateTimeOffset(DateTime.SpecifyKind(item.CreatedAt, DateTimeKind.Utc))))
            .FirstOrDefaultAsync(cancellationToken);

        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost("~/api/admin/users")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAdminUser(
        [FromBody] CreateAdminUserRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetSupportedRole(request.Role, out var roleName))
            return BadRequest(new { message = "Vai trò phải là Customer, Staff hoặc Admin." });

        if (!IsValidPhone(request.Phone))
            return BadRequest(new { message = "Số điện thoại phải gồm đúng 10 chữ số." });

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _context.Users.IgnoreQueryFilters().AnyAsync(
            user => user.DeletedAt == null && user.Email.ToLower() == email.ToLower(),
            cancellationToken))
        {
            return Conflict(new { message = "Email đã được sử dụng bởi một tài khoản đang hoạt động." });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(
            item => item.Name == roleName,
            cancellationToken);
        if (role is null)
        {
            _logger.LogError("Required role {RoleName} was not found while creating an admin-managed user.", roleName);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Không tìm thấy vai trò cần thiết trong hệ thống."
            });
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
        user.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            Role = role
        });

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        _context.Users.Add(user);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            _context.Entry(user).State = EntityState.Detached;
            return Conflict(new { message = "Email đã được sử dụng bởi một tài khoản đang hoạt động." });
        }

        var response = MapAdminUser(user, true, 0, 0m);
        return CreatedAtAction(
            nameof(GetAdminUser),
            new { id = user.Id },
            response);
    }

    [HttpPut("~/api/admin/users/{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateAdminUser(
        Guid id,
        [FromBody] UpdateAdminUserRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetSupportedRole(request.Role, out var roleName))
            return BadRequest(new { message = "Vai trò phải là Customer, Staff hoặc Admin." });

        if (!IsValidPhone(request.Phone))
            return BadRequest(new { message = "Số điện thoại phải gồm đúng 10 chữ số." });

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(item => item.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null)
            return NotFound(new { message = "Không tìm thấy tài khoản." });

        if (IsCurrentUser(id) && !string.Equals(roleName, "Admin", StringComparison.Ordinal))
        {
            return Conflict(new
            {
                message = "Bạn không thể tự thu hồi hoặc hạ cấp vai trò Admin của chính mình."
            });
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword)
            && (!string.Equals(user.AuthProvider, "local", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(user.PasswordHash)))
        {
            return Conflict(new
            {
                message = "Chỉ tài khoản Local đã có mật khẩu nội bộ mới có thể được đặt lại mật khẩu tại đây."
            });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(
            item => item.Name == roleName,
            cancellationToken);
        if (role is null)
        {
            _logger.LogError("Required role {RoleName} was not found while updating admin-managed user {UserId}.", roleName, id);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Không tìm thấy vai trò cần thiết trong hệ thống."
            });
        }

        user.FullName = request.FullName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        var selectedRole = user.UserRoles.FirstOrDefault(userRole => userRole.RoleId == role.Id);
        var obsoleteRoles = user.UserRoles.Where(userRole => userRole.RoleId != role.Id).ToList();
        if (obsoleteRoles.Count > 0)
        {
            _context.UserRoles.RemoveRange(obsoleteRoles);
            foreach (var obsoleteRole in obsoleteRoles)
                user.UserRoles.Remove(obsoleteRole);
        }
        if (selectedRole is null)
        {
            user.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                Role = role
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(MapAdminUser(user, user.DeletedAt is null, await _context.Bookings.CountAsync(
            booking => booking.UserId == user.Id,
            cancellationToken), await _context.Bookings
            .Where(booking => booking.UserId == user.Id && booking.Status == "success")
            .SumAsync(booking => (decimal?)booking.TotalAmount, cancellationToken) ?? 0m));
    }

    [HttpDelete("~/api/admin/users/{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteAdminUser(
        Guid id,
        [FromQuery] bool hardDelete = false,
        CancellationToken cancellationToken = default)
    {
        if (IsCurrentUser(id))
            return Conflict(new { message = "Bạn không thể khóa hoặc xóa chính tài khoản đang sử dụng." });

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(item => item.UserRoles)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null || (user.DeletedAt is not null && !hardDelete))
            return NotFound(new { message = "Không tìm thấy tài khoản phù hợp." });

        if (hardDelete)
        {
            if (await _context.Bookings.AnyAsync(booking => booking.UserId == id, cancellationToken))
            {
                return Conflict(new
                {
                    message = "Không thể xóa vĩnh viễn tài khoản đã phát sinh đơn đặt vé. Hãy khóa tài khoản để giữ nguyên lịch sử."
                });
            }

            _context.UserRoles.RemoveRange(user.UserRoles);
            _context.Users.Remove(user);
        }
        else
        {
            user.DeletedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPatch("~/api/admin/users/{id:guid}/restore")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RestoreAdminUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null)
            return NotFound(new { message = "Không tìm thấy tài khoản." });
        if (user.DeletedAt is null)
            return Conflict(new { message = "Tài khoản này đang hoạt động." });

        if (await _context.Users.IgnoreQueryFilters().AnyAsync(
            item => item.Id != id
                && item.DeletedAt == null
                && item.Email.ToLower() == user.Email.ToLower(),
            cancellationToken))
        {
            return Conflict(new
            {
                message = "Không thể khôi phục vì email đã được một tài khoản đang hoạt động khác sử dụng."
            });
        }

        user.DeletedAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueConstraintViolation(exception))
        {
            return Conflict(new
            {
                message = "Không thể khôi phục vì email đã được một tài khoản đang hoạt động khác sử dụng."
            });
        }
        return Ok(new { message = "Đã khôi phục tài khoản." });
    }

    [HttpGet("profile")]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ." });

        var user = await _userProfileService.GetProfileAsync(userId, cancellationToken);
        return user is null ? NotFound(new { message = "Không tìm thấy tài khoản." }) : Ok(user);
    }

    [HttpPost("profile/avatar")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxAvatarRequestSizeBytes)]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadAvatar(
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ." });

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn một tệp ảnh." });

        if (file.Length > MaxAvatarFileSizeBytes)
            return BadRequest(new { message = "Ảnh đại diện không được vượt quá 5 MB." });

        var imageType = await DetectImageTypeAsync(file, cancellationToken);
        if (imageType is null)
            return BadRequest(new { message = "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ." });

        var storagePath = Path.Combine(
            _environment.ContentRootPath,
            "wwwroot",
            "uploads",
            "avatars");
        Directory.CreateDirectory(storagePath);

        var fileName = $"{Guid.NewGuid():N}.{imageType.Value.Extension}";
        var destinationPath = Path.Combine(storagePath, fileName);
        var avatarUrl = $"{AvatarUrlPrefix}{fileName}";
        var avatarSaved = false;

        try
        {
            await using (var destination = new FileStream(
                destinationPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                useAsync: true))
            {
                await file.CopyToAsync(destination, cancellationToken);
            }

            var previousProfile = await _userProfileService.GetProfileAsync(userId, cancellationToken);
            if (previousProfile is null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            var updatedProfile = await _userProfileService.UpdateAvatarAsync(
                userId,
                avatarUrl,
                cancellationToken);

            if (updatedProfile is null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            avatarSaved = true;
            DeletePreviousLocalAvatar(previousProfile.AvatarUrl, fileName, storagePath);
            return Ok(updatedProfile);
        }
        catch (IOException exception)
        {
            _logger.LogError(exception, "Failed to store an uploaded profile avatar.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Không thể lưu ảnh đại diện. Vui lòng thử lại."
            });
        }
        finally
        {
            if (!avatarSaved)
                TryDeleteFile(destinationPath);
        }
    }

    [HttpPut("profile")]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateUserProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ." });

        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ và tên không được để trống." });

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl)
            && (!Uri.TryCreate(request.AvatarUrl, UriKind.Absolute, out var avatarUri)
                || (avatarUri.Scheme != Uri.UriSchemeHttp && avatarUri.Scheme != Uri.UriSchemeHttps)))
        {
            return BadRequest(new { message = "Đường dẫn ảnh đại diện phải là URL HTTP hoặc HTTPS hợp lệ." });
        }

        var user = await _userProfileService.UpdateProfileAsync(userId, request, cancellationToken);
        return user is null ? NotFound(new { message = "Không tìm thấy tài khoản." }) : Ok(user);
    }

    [HttpPut("change-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ." });

        var result = await _userProfileService.ChangePasswordAsync(userId, request, cancellationToken);
        return result switch
        {
            ChangePasswordResult.Success => Ok(new { message = "Đổi mật khẩu thành công." }),
            ChangePasswordResult.UserNotFound => NotFound(new { message = "Không tìm thấy tài khoản." }),
            ChangePasswordResult.ExternalProvider => StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Tài khoản liên kết Clerk/Google không dùng mật khẩu nội bộ. Hãy quản lý mật khẩu qua Clerk/Google."
            }),
            ChangePasswordResult.LocalPasswordNotSet => Conflict(new
            {
                message = "Tài khoản chưa thiết lập mật khẩu nội bộ. Hãy quản lý phương thức đăng nhập qua Clerk/Google."
            }),
            ChangePasswordResult.InvalidCurrentPassword => BadRequest(new
            {
                message = "Mật khẩu hiện tại không chính xác."
            }),
            _ => throw new InvalidOperationException("Unexpected password-change result.")
        };
    }

    private bool TryGetUserId(out Guid userId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(userIdClaim, out userId);
    }

    private bool IsCurrentUser(Guid userId) =>
        TryGetUserId(out var currentUserId) && currentUserId == userId;

    private static bool IsSupportedRoleFilter(string? role) =>
        string.IsNullOrWhiteSpace(role) || TryGetSupportedRole(role, out _);

    private static bool TryGetSupportedRole(string? role, out string roleName)
    {
        roleName = role?.Trim() switch
        {
            string value when value.Equals("Customer", StringComparison.OrdinalIgnoreCase) => "Customer",
            string value when value.Equals("Staff", StringComparison.OrdinalIgnoreCase) => "Staff",
            string value when value.Equals("Admin", StringComparison.OrdinalIgnoreCase) => "Admin",
            _ => string.Empty
        };
        return roleName.Length > 0;
    }

    private static bool IsValidPhone(string? phone) =>
        string.IsNullOrWhiteSpace(phone) || System.Text.RegularExpressions.Regex.IsMatch(phone.Trim(), @"^[0-9]{10}$");

    private static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private static AdminUserDto MapAdminUser(
        User user,
        bool isActive,
        int bookingsCount,
        decimal totalSpent) =>
        new(
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
            bookingsCount,
            totalSpent,
            new DateTimeOffset(DateTime.SpecifyKind(user.CreatedAt, DateTimeKind.Utc)));

    private static async Task<AvatarImageType?> DetectImageTypeAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(header.AsMemory(), cancellationToken);

        if (bytesRead >= 8
            && header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
        {
            return new AvatarImageType("png");
        }

        if (bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return new AvatarImageType("jpg");

        if (bytesRead == header.Length
            && header.AsSpan(0, 4).SequenceEqual("RIFF"u8)
            && header.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            return new AvatarImageType("webp");
        }

        return null;
    }

    private void DeletePreviousLocalAvatar(string? avatarUrl, string newFileName, string storagePath)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl)
            || !avatarUrl.StartsWith(AvatarUrlPrefix, StringComparison.Ordinal)
            || avatarUrl.Contains('?')
            || avatarUrl.Contains('#'))
        {
            return;
        }

        var previousFileName = avatarUrl[AvatarUrlPrefix.Length..];
        if (previousFileName == newFileName
            || previousFileName != Path.GetFileName(previousFileName))
        {
            return;
        }

        var previousPath = Path.Combine(storagePath, previousFileName);
        try
        {
            if (System.IO.File.Exists(previousPath))
                System.IO.File.Delete(previousPath);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(exception, "Could not remove the previous profile avatar.");
        }
    }

    private void TryDeleteFile(string path)
    {
        try
        {
            if (System.IO.File.Exists(path))
                System.IO.File.Delete(path);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(exception, "Could not remove a failed avatar upload.");
        }
    }

    private readonly record struct AvatarImageType(string Extension);
}
