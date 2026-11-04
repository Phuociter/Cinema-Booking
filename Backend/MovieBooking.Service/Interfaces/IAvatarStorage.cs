namespace MovieBooking.Service.Interfaces;

public sealed record StoredAvatar(string FileName, string Url);

public interface IAvatarStorage
{
    Task<StoredAvatar?> SaveAsync(Stream source, CancellationToken cancellationToken);
    void DeletePreviousLocalAvatar(string? avatarUrl, string newFileName);
    void DeleteFile(StoredAvatar file);
}
