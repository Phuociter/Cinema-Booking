using System.Net.Sockets;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Services;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration configuration, ILogger<SmtpEmailSender> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured
    {
        get
        {
            if (string.IsNullOrWhiteSpace(_configuration["SMTP_HOST"])
                || !System.Net.Mail.MailAddress.TryCreate(_configuration["SMTP_FROM_EMAIL"], out _))
            {
                return false;
            }

            var portSetting = _configuration["SMTP_PORT"];
            if ((!string.IsNullOrWhiteSpace(portSetting)
                    && !int.TryParse(portSetting, out _))
                || (int.TryParse(portSetting, out var parsedPort) && (parsedPort < 1 || parsedPort > 65535)))
            {
                return false;
            }

            var securitySetting = _configuration["SMTP_SECURE_SOCKET_OPTIONS"]
                ?? nameof(SecureSocketOptions.StartTls);
            if (!Enum.TryParse<SecureSocketOptions>(securitySetting, ignoreCase: true, out var socketOptions)
                || !Enum.IsDefined(socketOptions))
            {
                return false;
            }

            return string.IsNullOrWhiteSpace(_configuration["SMTP_USERNAME"])
                || !string.IsNullOrWhiteSpace(_configuration["SMTP_PASSWORD"]);
        }
    }

    public async Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Password-reset email was not sent because SMTP is not configured.");
            return;
        }

        var host = _configuration["SMTP_HOST"]!;
        var portSetting = _configuration["SMTP_PORT"];
        var port = string.IsNullOrWhiteSpace(portSetting) ? 587 : int.Parse(portSetting);
        var username = _configuration["SMTP_USERNAME"];
        var password = _configuration["SMTP_PASSWORD"];
        var fromEmail = _configuration["SMTP_FROM_EMAIL"]!;
        var fromName = _configuration["SMTP_FROM_NAME"] ?? "Cinema Booking";
        var securityValue = _configuration["SMTP_SECURE_SOCKET_OPTIONS"] ?? nameof(SecureSocketOptions.StartTls);

        if (!Enum.TryParse<SecureSocketOptions>(securityValue, ignoreCase: true, out var socketOptions)
            || !Enum.IsDefined(socketOptions))
        {
            throw new EmailDeliveryException("SMTP security settings are invalid.");
        }

        using var client = new SmtpClient();
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = subject;
            message.Body = new BodyBuilder
            {
                TextBody = body,
                HtmlBody = CreateHtmlBody(body)
            }.ToMessageBody();

            await client.ConnectAsync(host, port, socketOptions, cancellationToken);
            if (!string.IsNullOrWhiteSpace(username))
                await client.AuthenticateAsync(username, password ?? string.Empty, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception exception) when (
            exception is MailKit.Net.Smtp.SmtpCommandException
            or MailKit.Net.Smtp.SmtpProtocolException
            or SocketException
            or MailKit.Security.AuthenticationException
            or IOException
            or TimeoutException
            or FormatException
            or ArgumentException
            or MimeKit.ParseException)
        {
            _logger.LogError(exception, "Failed to send a password-reset email.");
            throw new EmailDeliveryException("The password-reset email could not be delivered.", exception);
        }
    }

    private static string CreateHtmlBody(string body)
    {
        var html = new StringBuilder();
        var position = 0;
        foreach (Match match in Regex.Matches(body, @"https?://[^\s<>]+", RegexOptions.IgnoreCase))
        {
            AppendEncodedText(html, body[position..match.Index]);

            var url = match.Value.TrimEnd('.', ',', ';', ')', ']', '}');
            var trailingText = match.Value[url.Length..];
            if (Uri.TryCreate(url, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                var encodedUrl = HtmlEncoder.Default.Encode(url);
                html.Append("<a href=\"")
                    .Append(encodedUrl)
                    .Append("\">Đặt lại mật khẩu</a>");
            }
            else
            {
                AppendEncodedText(html, url);
            }

            AppendEncodedText(html, trailingText);
            position = match.Index + match.Length;
        }

        AppendEncodedText(html, body[position..]);
        return html.ToString();
    }

    private static void AppendEncodedText(StringBuilder html, string text)
    {
        html.Append(HtmlEncoder.Default.Encode(text)
            .Replace("\r\n", "<br>", StringComparison.Ordinal)
            .Replace("\n", "<br>", StringComparison.Ordinal));
    }
}
