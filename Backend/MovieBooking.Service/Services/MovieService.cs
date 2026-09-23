using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public class MovieService : IMovieService
{
    private readonly AppDbContext _dbContext;

    public MovieService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<MovieListResponse> GetMoviesAsync(
        string? status,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = BuildMovieQuery(status, search);
        var totalItems = await query.CountAsync(cancellationToken);
        var movies = await query
            .OrderByDescending(movie => movie.ReleaseDate)
            .ThenBy(movie => movie.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        await PopulateRelationsAsync(movies, cancellationToken);

        return new MovieListResponse
        {
            Items = movies.Select(MapMovie).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        };
    }

    public async Task<MovieDto?> GetMovieByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var movie = await BuildMovieQuery(null, null)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (movie is null)
            return null;

        await PopulateRelationsAsync([movie], cancellationToken);
        return MapMovie(movie);
    }

    public async Task<List<GenreDto>> GetGenresAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Genres
            .AsNoTracking()
            .OrderBy(genre => genre.Name)
            .Select(genre => new GenreDto
            {
                Id = genre.Id,
                Name = genre.Name
            })
            .ToListAsync(cancellationToken);
    }

    private IQueryable<Movie> BuildMovieQuery(string? status, string? search)
    {
        var query = _dbContext.Movies
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(movie => movie.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(movie =>
                EF.Functions.ILike(movie.Title, $"%{normalizedSearch}%") ||
                (movie.OriginalTitle != null && EF.Functions.ILike(movie.OriginalTitle, $"%{normalizedSearch}%")));
        }

        return query;
    }

    private async Task PopulateRelationsAsync(List<Movie> movies, CancellationToken cancellationToken)
    {
        if (movies.Count == 0)
            return;

        var movieIds = movies.Select(movie => movie.Id).ToHashSet();
        var movieGenres = await _dbContext.MovieGenres
            .FromSqlRaw("SELECT movie_id, genre_id FROM moviegenres")
            .AsNoTracking()
            .Where(movieGenre => movieIds.Contains(movieGenre.MovieId))
            .ToListAsync(cancellationToken);
        var movieDirectors = await _dbContext.MovieDirectors
            .FromSqlRaw("SELECT movie_id, director_id FROM moviedirectors")
            .AsNoTracking()
            .Where(movieDirector => movieIds.Contains(movieDirector.MovieId))
            .ToListAsync(cancellationToken);
        var movieActors = await _dbContext.MovieActors
            .FromSqlRaw("SELECT movie_id, actor_id, character_name FROM movieactors")
            .AsNoTracking()
            .Where(movieActor => movieIds.Contains(movieActor.MovieId))
            .ToListAsync(cancellationToken);

        var genreIds = movieGenres.Select(item => item.GenreId).ToHashSet();
        var directorIds = movieDirectors.Select(item => item.DirectorId).ToHashSet();
        var actorIds = movieActors.Select(item => item.ActorId).ToHashSet();

        var genres = await _dbContext.Genres
            .AsNoTracking()
            .Where(genre => genreIds.Contains(genre.Id))
            .ToDictionaryAsync(genre => genre.Id, cancellationToken);
        var directors = await _dbContext.Directors
            .AsNoTracking()
            .Where(director => directorIds.Contains(director.Id))
            .ToDictionaryAsync(director => director.Id, cancellationToken);
        var actors = await _dbContext.Actors
            .AsNoTracking()
            .Where(actor => actorIds.Contains(actor.Id))
            .ToDictionaryAsync(actor => actor.Id, cancellationToken);

        foreach (var movie in movies)
        {
            movie.MovieGenres = movieGenres
                .Where(item => item.MovieId == movie.Id && genres.ContainsKey(item.GenreId))
                .Select(item => new MovieGenre { MovieId = item.MovieId, GenreId = item.GenreId, Genre = genres[item.GenreId] })
                .ToList();
            movie.MovieDirectors = movieDirectors
                .Where(item => item.MovieId == movie.Id && directors.ContainsKey(item.DirectorId))
                .Select(item => new MovieDirector { MovieId = item.MovieId, DirectorId = item.DirectorId, Director = directors[item.DirectorId] })
                .ToList();
            movie.MovieActors = movieActors
                .Where(item => item.MovieId == movie.Id && actors.ContainsKey(item.ActorId))
                .Select(item => new MovieActor { MovieId = item.MovieId, ActorId = item.ActorId, CharacterName = item.CharacterName, Actor = actors[item.ActorId] })
                .ToList();
        }
    }

    private static MovieDto MapMovie(Movie movie)
    {
        return new MovieDto
        {
            Id = movie.Id,
            Title = movie.Title,
            OriginalTitle = movie.OriginalTitle,
            Overview = movie.Overview,
            DurationMin = movie.DurationMin,
            AgeRating = movie.AgeRating,
            PosterUrl = movie.PosterUrl,
            BackdropUrl = movie.BackdropUrl,
            TrailerUrl = movie.TrailerUrl,
            ReleaseDate = movie.ReleaseDate,
            RatingScore = movie.RatingScore,
            Status = movie.Status,
            Genres = movie.MovieGenres
                .OrderBy(movieGenre => movieGenre.Genre.Name)
                .Select(movieGenre => movieGenre.Genre.Name)
                .ToList(),
            Directors = movie.MovieDirectors
                .OrderBy(movieDirector => movieDirector.Director.Name)
                .Select(movieDirector => movieDirector.Director.Name)
                .ToList(),
            Actors = movie.MovieActors
                .OrderBy(movieActor => movieActor.Actor.Name)
                .Select(movieActor => new MovieActorDto
                {
                    ActorId = movieActor.ActorId,
                    Name = movieActor.Actor.Name,
                    ProfilePath = movieActor.Actor.ProfilePath,
                    CharacterName = movieActor.CharacterName
                })
                .ToList()
        };
    }
}