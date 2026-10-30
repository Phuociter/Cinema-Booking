using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public interface IActorService
{
    Task<PagedResult<ActorDto>> GetActorsAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<List<ActorDto>> GetAllActorsAsync(
        string? search = null,
        CancellationToken cancellationToken = default);

    Task<ActorDto?> GetActorByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ActorDto> CreateActorAsync(
        CreateActorRequest request,
        CancellationToken cancellationToken = default);

    Task<ActorDto?> UpdateActorAsync(
        Guid id,
        UpdateActorRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteActorAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
