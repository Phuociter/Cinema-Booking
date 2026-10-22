using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IUserProfileService
{
    Task<UserDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken);

    Task<UserDto?> UpdateProfileAsync(
        Guid userId,
        UpdateUserProfileRequest request,
        CancellationToken cancellationToken);

    Task<UserDto?> UpdateAvatarAsync(
        Guid userId,
        string avatarUrl,
        CancellationToken cancellationToken);

    Task<ChangePasswordResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken);

    Task RequestPasswordResetAsync(
        string? email,
        string frontendUrl,
        CancellationToken cancellationToken);

    Task<ResetPasswordResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken);
}

public enum ChangePasswordResult
{
    Success,
    UserNotFound,
    ExternalProvider,
    LocalPasswordNotSet,
    InvalidCurrentPassword
}

public enum ResetPasswordResult
{
    Success,
    InvalidToken
}
