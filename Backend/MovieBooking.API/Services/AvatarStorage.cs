using Microsoft.Extensions.Logging;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Services;

public sealed class AvatarStorage : IAvatarStorage
{
    private const string AvatarUrlPrefix = "/uploads/avatars/";
    private readonly string _storagePath;
    private readonly ILogger<AvatarStorage> _logger;

    public AvatarStorage(IWebHostEnvironment environment, ILogger<AvatarStorage> logger)
    {
        _storagePath = Path.Combine(environment.ContentRootPath, "wwwroot", "uploads", "avatars");
        _logger = logger;
    }

    public async Task<StoredAvatar?> SaveAsync(Stream source, CancellationToken cancellationToken)
    {
        string? destinationPath = null;
        try
        {
            Directory.CreateDirectory(_storagePath);
            var header = new byte[12];
            var bytesRead = await source.ReadAsync(header.AsMemory(), cancellationToken);
            var extension = DetectImageExtension(header, bytesRead);
            if (extension is null)
                return null;

            var fileName = $"{Guid.NewGuid():N}.{extension}";
            destinationPath = Path.Combine(_storagePath, fileName);
            await using var destination = new FileStream(
                destinationPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                useAsync: true);
            await destination.WriteAsync(header.AsMemory(0, bytesRead), cancellationToken);
            await source.CopyToAsync(destination, cancellationToken);
            return new StoredAvatar(fileName, $"{AvatarUrlPrefix}{fileName}");
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogError(exception, "Failed to store an uploaded profile avatar.");
            if (destinationPath is not null)
                DeleteFile(destinationPath);
            throw;
        }
    }

    public void DeletePreviousLocalAvatar(string? avatarUrl, string newFileName)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl)
            || !avatarUrl.StartsWith(AvatarUrlPrefix, StringComparison.Ordinal)
            || avatarUrl.Contains('?')
            || avatarUrl.Contains('#'))
            return;

        var previousFileName = avatarUrl[AvatarUrlPrefix.Length..];
        if (previousFileName == newFileName || previousFileName != Path.GetFileName(previousFileName))
            return;

        DeleteFile(Path.Combine(_storagePath, previousFileName));
    }

    public void DeleteFile(StoredAvatar file)
    {
        if (file.FileName == Path.GetFileName(file.FileName))
            DeleteFile(Path.Combine(_storagePath, file.FileName));
    }

    private void DeleteFile(string path)
    {
        try
        {
            if (File.Exists(path))
                File.Delete(path);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(exception, "Could not remove an avatar file.");
        }
    }

    private static string? DetectImageExtension(byte[] header, int bytesRead)
    {
        if (bytesRead >= 8
            && header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
            return "png";
        if (bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return "jpg";
        if (bytesRead == header.Length
            && header.AsSpan(0, 4).SequenceEqual("RIFF"u8)
            && header.AsSpan(8, 4).SequenceEqual("WEBP"u8))
            return "webp";
        return null;
    }
}
