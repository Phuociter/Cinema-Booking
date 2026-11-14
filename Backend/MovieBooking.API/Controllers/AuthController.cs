using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        return ToActionResult(await _authService.RegisterAsync(request, cancellationToken));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        return ToActionResult(await _authService.LoginAsync(request, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        return ToActionResult(await _authService.ForgotPasswordAsync(request, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        return ToActionResult(await _authService.ResetPasswordAsync(request, cancellationToken));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return ToActionResult(await _authService.GetCurrentUserAsync(userId, cancellationToken));
    }

    [HttpPost("clerk-sync")]
    [Authorize(AuthenticationSchemes = "ClerkJwt")]
    public async Task<IActionResult> ClerkSync(CancellationToken cancellationToken)
    {
        return ToActionResult(await _authService.ClerkSyncAsync(User, cancellationToken));
    }

    private IActionResult ToActionResult(AuthOperationResult result)
    {
        return result.Value is null
            ? StatusCode(result.StatusCode)
            : StatusCode(result.StatusCode, result.Value);
    }
}
