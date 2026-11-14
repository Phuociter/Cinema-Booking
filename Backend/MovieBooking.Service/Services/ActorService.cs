using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public class ActorService : IActorService
{
    private readonly IActorRepository _actorRepository;

    public ActorService(IActorRepository actorRepository)
    {
        _actorRepository = actorRepository;
    }

    public async Task<PagedResult<ActorDto>> GetActorsAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
            throw new ArgumentException("page phải lớn hơn hoặc bằng 1.");

        if (pageSize is < 1 or > 100)
            throw new ArgumentException("pageSize phải từ 1 đến 100.");

        var (items, totalCount) =
            await _actorRepository.GetActorsAsync(
                search, page, pageSize, cancellationToken);

        return new PagedResult<ActorDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = items.Select(MapActor).ToList()
        };
    }

    public async Task<List<ActorDto>> GetAllActorsAsync(
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var actors = await _actorRepository.GetAllActorsAsync(
            search, cancellationToken);

        return actors.Select(MapActor).ToList();
    }

    public async Task<ActorDto?> GetActorByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var actor = await _actorRepository.GetActorByIdAsync(
            id, cancellationToken);

        return actor == null ? null : MapActor(actor);
    }

    public async Task<ActorDto> CreateActorAsync(
        CreateActorRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateActor(request.Name, request.ProfilePath);

        var name = request.Name.Trim();

        if (await _actorRepository.ExistsByNameAsync(
            name, cancellationToken: cancellationToken))
        {
            throw new ArgumentException("Tên diễn viên đã tồn tại.");
        }

        var actor = new Actor
        {
            Id = Guid.NewGuid(),
            Name = name,
            ProfilePath = NormalizeProfilePath(request.ProfilePath)
        };

        await _actorRepository.AddActorAsync(actor, cancellationToken);

        return MapActor(actor);
    }

    public async Task<ActorDto?> UpdateActorAsync(
        Guid id,
        UpdateActorRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateActor(request.Name, request.ProfilePath);

        var actor = await _actorRepository.GetActorByIdAsync(
            id, cancellationToken);

        if (actor == null)
            return null;

        var name = request.Name.Trim();

        if (await _actorRepository.ExistsByNameAsync(
            name, id, cancellationToken))
        {
            throw new ArgumentException("Tên diễn viên đã tồn tại.");
        }

        actor.Name = name;
        actor.ProfilePath = NormalizeProfilePath(request.ProfilePath);

        await _actorRepository.UpdateActorAsync(actor, cancellationToken);

        return MapActor(actor);
    }

    public async Task<bool> DeleteActorAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var actor = await _actorRepository.GetActorByIdAsync(
            id, cancellationToken);

        if (actor == null)
            return false;

        if (await _actorRepository.IsActorInUseAsync(
            id, cancellationToken))
        {
            throw new InvalidOperationException(
                "Không thể xóa diễn viên đang được liên kết với phim.");
        }

        return await _actorRepository.DeleteActorAsync(
            id, cancellationToken);
    }

    private static void ValidateActor(string? name, string? profilePath)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên diễn viên không được để trống.");

        if (name.Trim().Length > 150)
            throw new ArgumentException("Tên diễn viên không được vượt quá 150 ký tự.");

        if (!string.IsNullOrWhiteSpace(profilePath))
        {
            if (!Uri.TryCreate(profilePath.Trim(), UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp &&
                 uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new ArgumentException(
                    "Đường dẫn ảnh phải là URL bắt đầu bằng http:// hoặc https://.");
            }
        }
    }

    private static string? NormalizeProfilePath(string? profilePath) =>
        string.IsNullOrWhiteSpace(profilePath) ? null : profilePath.Trim();

    private static ActorDto MapActor(Actor actor)
    {
        return new ActorDto
        {
            Id = actor.Id,
            Name = actor.Name,
            ProfilePath = actor.ProfilePath,
            MoviesCount = actor.MovieActors?.Count ?? 0
        };
    }
}
