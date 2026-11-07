using System.Security.Claims;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private const long MaxAvatarFileSizeBytes = 5 * 1024 * 1024;
    private const long MaxAvatarRequestSizeBytes = MaxAvatarFileSizeBytes + 64 * 1024;

    private readonly IUserService _userService;
    private readonly IUserProfileService _userProfileService;

    public UsersController(
        IUserService userService,
        IUserProfileService userProfileService)
    {
        _userService = userService;
        _userProfileService = userProfileService;
    }

    [HttpGet("~/api/admin/users")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType<AdminUsersPageDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetAdminUsers(
        [FromQuery] AdminUsersQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _userService.GetPagedUsersAsync(query, cancellationToken);
        return result.StatusCode == StatusCodes.Status200OK
            ? Ok(result.Data)
            : BadRequest(new { message = result.Message });
    }

    [HttpGet("~/api/admin/users/{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAdminUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetUserByIdAsync(id, cancellationToken);
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
        var result = await _userService.CreateUserAsync(request, cancellationToken);
        if (result.StatusCode == StatusCodes.Status201Created)
        {
            return CreatedAtAction(
                nameof(GetAdminUser),
                new { id = result.Data!.Id },
                result.Data);
        }

        return result.StatusCode == StatusCodes.Status400BadRequest
            ? BadRequest(new { message = result.Message })
            : StatusCode(result.StatusCode, new { message = result.Message });
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
        var currentUserId = TryGetUserId(out var userId) ? userId : Guid.Empty;
        var result = await _userService.UpdateUserAsync(id, currentUserId, request, cancellationToken);
        return result.StatusCode switch
        {
            StatusCodes.Status200OK => Ok(result.Data),
            StatusCodes.Status400BadRequest => BadRequest(new { message = result.Message }),
            StatusCodes.Status404NotFound => NotFound(new { message = result.Message }),
            StatusCodes.Status409Conflict => Conflict(new { message = result.Message }),
            _ => StatusCode(result.StatusCode, new { message = result.Message })
        };
    }

    [HttpDelete("~/api/admin/users/{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteAdminUser(
        Guid id,
        [FromQuery] bool hardDelete = false,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = TryGetUserId(out var userId) ? userId : Guid.Empty;
        var result = await _userService.DeleteUserAsync(id, currentUserId, hardDelete, cancellationToken);
        if (result.StatusCode == StatusCodes.Status204NoContent)
            return NoContent();
        if (result.StatusCode == StatusCodes.Status404NotFound)
            return NotFound(new { message = result.Message });
        return Conflict(new { message = result.Message });
    }

    [HttpPatch("~/api/admin/users/{id:guid}/restore")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RestoreAdminUser(Guid id, CancellationToken cancellationToken)
    {
        var result = await _userService.RestoreUserAsync(id, cancellationToken);
        if (result.StatusCode == StatusCodes.Status200OK)
            return Ok(new { message = "Đã khôi phục tài khoản." });
        if (result.StatusCode == StatusCodes.Status404NotFound)
            return NotFound(new { message = result.Message });
        return Conflict(new { message = result.Message });
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

        try
        {
            await using var source = file.OpenReadStream();
            var result = await _userProfileService.UploadAvatarAsync(
                userId,
                source,
                file.Length,
                cancellationToken);
            return result.Status switch
            {
                AvatarUploadStatus.Success => Ok(result.User),
                AvatarUploadStatus.FileTooLarge => BadRequest(new { message = "Ảnh đại diện không được vượt quá 5 MB." }),
                AvatarUploadStatus.InvalidImage => BadRequest(new { message = "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ." }),
                AvatarUploadStatus.UserNotFound => NotFound(new { message = "Không tìm thấy tài khoản." }),
                _ => throw new InvalidOperationException("Unexpected avatar-upload result.")
            };
        }
        catch (IOException)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Không thể lưu ảnh đại diện. Vui lòng thử lại."
            });
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

}
