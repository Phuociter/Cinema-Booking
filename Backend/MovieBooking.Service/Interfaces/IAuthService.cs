using System.Security.Claims;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Interfaces;

public interface IAuthService
{
    Task<AuthOperationResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthOperationResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthOperationResult> GetCurrentUserAsync(string? userId, CancellationToken cancellationToken);
    Task<AuthOperationResult> ClerkSyncAsync(ClaimsPrincipal principal, CancellationToken cancellationToken);
    Task<AuthOperationResult> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken);
    Task<AuthOperationResult> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
}

public sealed record AuthOperationResult(int StatusCode, object? Value = null);
