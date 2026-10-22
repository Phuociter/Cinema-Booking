using System.ComponentModel.DataAnnotations;

namespace MovieBooking.Service.DTOs;

/// <summary>Request for updating the signed-in user's profile.</summary>
public sealed record UpdateUserProfileRequest
{
    [Required, MaxLength(150)]
    public string FullName { get; init; } = string.Empty;

    [RegularExpression(@"^(?:[0-9]{10})?$", ErrorMessage = "Số điện thoại phải gồm đúng 10 chữ số.")]
    public string? Phone { get; init; }

    [MaxLength(2048)]
    public string? AvatarUrl { get; init; }
}

/// <summary>Request for changing the signed-in user's local password.</summary>
public sealed record ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required, MinLength(6)]
    public string NewPassword { get; init; } = string.Empty;
}

/// <summary>Request for sending a password-reset link to an email address.</summary>
public sealed record ForgotPasswordRequest
{
    public string? Email { get; init; }
}

/// <summary>Request for setting a new local password using a one-time reset token.</summary>
public sealed record ResetPasswordRequest
{
    public string? Token { get; init; }

    [Required, MinLength(6)]
    public string NewPassword { get; init; } = string.Empty;
}

/// <summary>Request for creating a local account from the admin portal.</summary>
public sealed record CreateAdminUserRequest
{
    [Required, MaxLength(150)]
    public string FullName { get; init; } = string.Empty;

    [Required, EmailAddress, MaxLength(254)]
    public string Email { get; init; } = string.Empty;

    [RegularExpression(@"^(?:[0-9]{10})?$", ErrorMessage = "Số điện thoại phải gồm đúng 10 chữ số.")]
    public string? Phone { get; init; }

    [Required, MinLength(6)]
    public string Password { get; init; } = string.Empty;

    [Required]
    public string Role { get; init; } = string.Empty;
}

/// <summary>Request for changing a user's profile, role, or local password.</summary>
public sealed record UpdateAdminUserRequest
{
    [Required, MaxLength(150)]
    public string FullName { get; init; } = string.Empty;

    [RegularExpression(@"^(?:[0-9]{10})?$", ErrorMessage = "Số điện thoại phải gồm đúng 10 chữ số.")]
    public string? Phone { get; init; }

    [Required]
    public string Role { get; init; } = string.Empty;

    [MinLength(6)]
    public string? NewPassword { get; init; }
}

/// <summary>Filters and pagination options for the admin user directory.</summary>
public sealed record AdminUsersQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Search { get; init; }
    public string? Role { get; init; }
    public string? Status { get; init; }
}

/// <summary>User details and aggregate booking information for administrators.</summary>
public sealed record AdminUserDto(
    Guid Id,
    string? FullName,
    string Email,
    string? Phone,
    string? AvatarUrl,
    string AuthProvider,
    IReadOnlyList<string> Roles,
    bool IsActive,
    int BookingsCount,
    decimal TotalSpent,
    DateTimeOffset CreatedAt);

/// <summary>A page of users returned by the admin user directory.</summary>
public sealed record AdminUsersPageDto(
    IReadOnlyList<AdminUserDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
