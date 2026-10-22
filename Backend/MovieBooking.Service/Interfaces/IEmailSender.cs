namespace MovieBooking.Service.Interfaces;

public interface IEmailSender
{
    bool IsConfigured { get; }

    Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken);
}

public sealed class EmailDeliveryException : Exception
{
    public EmailDeliveryException(string message) : base(message)
    {
    }

    public EmailDeliveryException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
