using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Services;

public sealed class ConsoleEmailSender : IEmailSender
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ConsoleEmailSender> _logger;

    public ConsoleEmailSender(
        IWebHostEnvironment environment,
        ILogger<ConsoleEmailSender> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public bool IsConfigured => _environment.IsDevelopment();

    public Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (_environment.IsDevelopment())
        {
            _logger.LogInformation(
                "Development email to {Email}: {Subject}\n{Body}",
                email,
                subject,
                body);
        }
        else
        {
            _logger.LogWarning(
                "Password-reset email was not sent because email delivery is not configured.");
        }

        return Task.CompletedTask;
    }
}
