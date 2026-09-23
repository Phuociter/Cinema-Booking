using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.Service.Services;

public class MovieService : IMovieService
{
    private readonly AppDbContext _context;

    public MovieService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(List<MovieDto> Items, int TotalItems)> GetAllMoviesAsync(
        string? status,
        string? search,
        int page,
        int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 100);

        var query = _context.Movies
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(m => m.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(m =>
                m.Title.ToLower().Contains(keyword) ||
                (m.OriginalTitle != null &&
                 m.OriginalTitle.ToLower().Contains(keyword)));
        }

        var totalItems = await query.CountAsync();

        var movies = await query
            .OrderByDescending(m => m.ReleaseDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MovieDto
            {
                Id = m.Id,
                Title = m.Title,
                OriginalTitle = m.OriginalTitle,
                Overview = m.Overview,
                DurationMin = m.DurationMin,
                AgeRating = m.AgeRating,
                PosterUrl = m.PosterUrl,
                BackdropUrl = m.BackdropUrl,
                TrailerUrl = m.TrailerUrl,
                ReleaseDate = m.ReleaseDate,
                RatingScore = m.RatingScore,
                Status = m.Status,

                Genres = m.MovieGenres
                    .Select(mg => mg.Genre.Name)
                    .ToList(),

                Directors = m.MovieDirectors
                    .Select(md => md.Director.Name)
                    .ToList(),

                Actors = m.MovieActors
                    .Select(ma => new MovieActorDto
                    {
                        ActorId = ma.Actor.Id,
                        Name = ma.Actor.Name,
                        ProfilePath = ma.Actor.ProfilePath,
                        CharacterName = ma.CharacterName
                    })
                    .ToList()
            })
            .ToListAsync();

        return (movies, totalItems);
    }

    public async Task<MovieDto?> GetMovieByIdAsync(Guid id)
    {
        return await _context.Movies
            .AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new MovieDto
            {
                Id = m.Id,
                Title = m.Title,
                OriginalTitle = m.OriginalTitle,
                Overview = m.Overview,
                DurationMin = m.DurationMin,
                AgeRating = m.AgeRating,
                PosterUrl = m.PosterUrl,
                BackdropUrl = m.BackdropUrl,
                TrailerUrl = m.TrailerUrl,
                ReleaseDate = m.ReleaseDate,
                RatingScore = m.RatingScore,
                Status = m.Status,

                Genres = m.MovieGenres
                    .Select(mg => mg.Genre.Name)
                    .ToList(),

                Directors = m.MovieDirectors
                    .Select(md => md.Director.Name)
                    .ToList(),

                Actors = m.MovieActors
                    .Select(ma => new MovieActorDto
                    {
                        ActorId = ma.Actor.Id,
                        Name = ma.Actor.Name,
                        ProfilePath = ma.Actor.ProfilePath,
                        CharacterName = ma.CharacterName
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<string>> GetGenresAsync()
    {
        return await _context.Genres
            .AsNoTracking()
            .OrderBy(g => g.Name)
            .Select(g => g.Name)
            .ToListAsync();
    }
}
