using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Services;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/actors")]
public class ActorsController : ControllerBase
{
    private readonly IActorService _actorService;

    public ActorsController(IActorService actorService)
    {
        _actorService = actorService;
    }

    // GET: api/actors?search=tom&page=1&pageSize=12
    // GET: api/actors?all=true
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActors(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] bool all = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (all)
            {
                var actors = await _actorService.GetAllActorsAsync(
                    search, cancellationToken);

                return Ok(actors);
            }

            var result = await _actorService.GetActorsAsync(
                search, page, pageSize, cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET: api/actors/{id}
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetActorById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var actor = await _actorService.GetActorByIdAsync(
            id, cancellationToken);

        if (actor == null)
        {
            return NotFound(new { message = "Không tìm thấy diễn viên." });
        }

        return Ok(actor);
    }

    // POST: api/actors
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateActor(
        [FromBody] CreateActorRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var actor = await _actorService.CreateActorAsync(
                request, cancellationToken);

            return CreatedAtAction(
                nameof(GetActorById),
                new { id = actor.Id },
                actor);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT: api/actors/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateActor(
        Guid id,
        [FromBody] UpdateActorRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var actor = await _actorService.UpdateActorAsync(
                id, request, cancellationToken);

            if (actor == null)
            {
                return NotFound(new { message = "Không tìm thấy diễn viên." });
            }

            return Ok(actor);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE: api/actors/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteActor(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _actorService.DeleteActorAsync(
                id, cancellationToken);

            if (!deleted)
            {
                return NotFound(new { message = "Không tìm thấy diễn viên." });
            }

            return Ok(new { message = "Xóa diễn viên thành công." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
