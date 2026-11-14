using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;

namespace MovieBooking.Data.Repositories;

public class MovieRepository : GenericRepository<Movie>, IMovieRepository
{
    public MovieRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<(List<Movie> Items, int TotalItems)> GetMoviesPagedAsync(
        string? status,
        string? search,
        string? genre,
        string sortBy,
        string? city,
        Guid? cinemaId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = BuildMovieQuery(status, search, genre);

        var selectedCity = city?.Trim();

        if (!string.IsNullOrWhiteSpace(selectedCity) || cinemaId.HasValue)
        {
            query = query.Where(movie => _context.Showtimes.Any(showtime =>
                showtime.MovieId == movie.Id
                && (!cinemaId.HasValue || showtime.Auditorium.CinemaId == cinemaId.Value)
                && (string.IsNullOrWhiteSpace(selectedCity)
                    || (showtime.Auditorium.Cinema.City != null
                        && EF.Functions.ILike(showtime.Auditorium.Cinema.City, selectedCity)))));
        }

        var totalItems = await query.CountAsync(cancellationToken);

        query = sortBy?.ToLowerInvariant() switch
        {
            "title" => query
                .OrderBy(movie => movie.Title)
                .ThenBy(movie => movie.Id),

            "rating" => query
                .OrderByDescending(movie => movie.RatingScore ?? -1m)
                .ThenBy(movie => movie.Title)
                .ThenBy(movie => movie.Id),

            _ => query
                .OrderByDescending(movie => movie.ReleaseDate)
                .ThenBy(movie => movie.Title)
                .ThenBy(movie => movie.Id)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        await PopulateRelationsAsync(items, cancellationToken);

        return (items, totalItems);
    }

    public async Task<Movie?> GetMovieByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var movie = await BuildMovieQuery(null, null, null)
            .FirstOrDefaultAsync(movie => movie.Id == id, cancellationToken);

        if (movie != null)
        {
            await PopulateRelationsAsync(new List<Movie> { movie }, cancellationToken);
        }

        return movie;
    }

    public async Task PopulateRelationsAsync(
        List<Movie> movies,
        CancellationToken cancellationToken = default)
    {
        if (movies.Count == 0)
        {
            return;
        }

        var movieIds = movies.Select(movie => movie.Id).ToHashSet();

        var movieGenres = await _context.MovieGenres
            .FromSqlRaw("SELECT movie_id, genre_id FROM moviegenres")
            .AsNoTracking()
            .Where(relation => movieIds.Contains(relation.MovieId))
            .ToListAsync(cancellationToken);

        var movieDirectors = await _context.MovieDirectors
            .FromSqlRaw("SELECT movie_id, director_id FROM moviedirectors")
            .AsNoTracking()
            .Where(relation => movieIds.Contains(relation.MovieId))
            .ToListAsync(cancellationToken);

        var movieActors = await _context.MovieActors
            .FromSqlRaw("SELECT movie_id, actor_id, character_name FROM movieactors")
            .AsNoTracking()
            .Where(relation => movieIds.Contains(relation.MovieId))
            .ToListAsync(cancellationToken);

        var genreIds = movieGenres.Select(relation => relation.GenreId).Distinct().ToList();
        var directorIds = movieDirectors.Select(relation => relation.DirectorId).Distinct().ToList();
        var actorIds = movieActors.Select(relation => relation.ActorId).Distinct().ToList();

        var genres = await _context.Genres
            .AsNoTracking()
            .Where(genre => genreIds.Contains(genre.Id))
            .ToDictionaryAsync(genre => genre.Id, cancellationToken);

        var directors = await _context.Directors
            .AsNoTracking()
            .Where(director => directorIds.Contains(director.Id))
            .ToDictionaryAsync(director => director.Id, cancellationToken);

        var actors = await _context.Actors
            .AsNoTracking()
            .Where(actor => actorIds.Contains(actor.Id))
            .ToDictionaryAsync(actor => actor.Id, cancellationToken);

        foreach (var movie in movies)
        {
            movie.MovieGenres = movieGenres
                .Where(relation => relation.MovieId == movie.Id && genres.ContainsKey(relation.GenreId))
                .Select(relation => new MovieGenre
                {
                    MovieId = relation.MovieId,
                    GenreId = relation.GenreId,
                    Genre = genres[relation.GenreId]
                })
                .ToList();

            movie.MovieDirectors = movieDirectors
                .Where(relation => relation.MovieId == movie.Id && directors.ContainsKey(relation.DirectorId))
                .Select(relation => new MovieDirector
                {
                    MovieId = relation.MovieId,
                    DirectorId = relation.DirectorId,
                    Director = directors[relation.DirectorId]
                })
                .ToList();

            movie.MovieActors = movieActors
                .Where(relation => relation.MovieId == movie.Id && actors.ContainsKey(relation.ActorId))
                .Select(relation => new MovieActor
                {
                    MovieId = relation.MovieId,
                    ActorId = relation.ActorId,
                    CharacterName = relation.CharacterName,
                    Actor = actors[relation.ActorId]
                })
                .ToList();
        }
    }

    public async Task AddMovieAsync(
        Movie movie,
        CancellationToken cancellationToken = default)
    {
        await _context.Movies.AddAsync(movie, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateMovieAsync(
        Movie movie,
        CancellationToken cancellationToken = default)
    {
        var existingMovie = await _context.Movies
            .FirstOrDefaultAsync(item => item.Id == movie.Id, cancellationToken);

        if (existingMovie == null)
        {
            return;
        }

        existingMovie.Title = movie.Title;
        existingMovie.OriginalTitle = movie.OriginalTitle;
        existingMovie.Overview = movie.Overview;
        existingMovie.DurationMin = movie.DurationMin;
        existingMovie.AgeRating = movie.AgeRating;
        existingMovie.PosterUrl = movie.PosterUrl;
        existingMovie.BackdropUrl = movie.BackdropUrl;
        existingMovie.TrailerUrl = movie.TrailerUrl;
        existingMovie.ReleaseDate = movie.ReleaseDate;
        existingMovie.RatingScore = movie.RatingScore;
        existingMovie.Status = movie.Status;
        existingMovie.UpdatedAt = movie.UpdatedAt;

        var oldGenres = await _context.MovieGenres
            .Where(relation => relation.MovieId == movie.Id)
            .ToListAsync(cancellationToken);

        var oldDirectors = await _context.MovieDirectors
            .Where(relation => relation.MovieId == movie.Id)
            .ToListAsync(cancellationToken);

        var oldActors = await _context.MovieActors
            .Where(relation => relation.MovieId == movie.Id)
            .ToListAsync(cancellationToken);

        _context.MovieGenres.RemoveRange(oldGenres);
        _context.MovieDirectors.RemoveRange(oldDirectors);
        _context.MovieActors.RemoveRange(oldActors);

        // Giữ lần lưu thứ nhất như luồng cập nhật hiện tại.
        await _context.SaveChangesAsync(cancellationToken);

        var newGenres = movie.MovieGenres.Select(relation => new MovieGenre
        {
            MovieId = movie.Id,
            GenreId = relation.GenreId
        });

        var newDirectors = movie.MovieDirectors.Select(relation => new MovieDirector
        {
            MovieId = movie.Id,
            DirectorId = relation.DirectorId
        });

        var newActors = movie.MovieActors.Select(relation => new MovieActor
        {
            MovieId = movie.Id,
            ActorId = relation.ActorId,
            CharacterName = relation.CharacterName
        });

        await _context.MovieGenres.AddRangeAsync(newGenres, cancellationToken);
        await _context.MovieDirectors.AddRangeAsync(newDirectors, cancellationToken);
        await _context.MovieActors.AddRangeAsync(newActors, cancellationToken);

        // Giữ lần lưu thứ hai như luồng cập nhật hiện tại.
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteMovieAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var movie = await _context.Movies
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (movie == null)
        {
            return false;
        }

        var now = DateTime.UtcNow;
        movie.DeletedAt = now;
        movie.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> GenresExistAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken = default)
    {
        var selectedIds = ids.Distinct().ToList();

        return await _context.Genres
            .CountAsync(item => selectedIds.Contains(item.Id), cancellationToken)
            == selectedIds.Count;
    }

    public async Task<bool> DirectorsExistAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken = default)
    {
        var selectedIds = ids.Distinct().ToList();

        return await _context.Directors
            .CountAsync(item => selectedIds.Contains(item.Id), cancellationToken)
            == selectedIds.Count;
    }

    public async Task<bool> ActorsExistAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken = default)
    {
        var selectedIds = ids.Distinct().ToList();

        return await _context.Actors
            .CountAsync(item => selectedIds.Contains(item.Id), cancellationToken)
            == selectedIds.Count;
    }

    private IQueryable<Movie> BuildMovieQuery(
        string? status,
        string? search,
        string? genre)
    {
        var query = _context.Movies
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(movie => movie.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";

            query = query.Where(movie =>
                EF.Functions.ILike(movie.Title, pattern)
                || (movie.OriginalTitle != null && EF.Functions.ILike(movie.OriginalTitle, pattern))
                || movie.MovieGenres.Any(relation =>
                    EF.Functions.ILike(relation.Genre.Name, pattern)));
        }

        if (!string.IsNullOrWhiteSpace(genre))
        {
            var selectedGenre = genre.Trim();

            query = query.Where(movie =>
                movie.MovieGenres.Any(relation =>
                    EF.Functions.ILike(relation.Genre.Name, selectedGenre)));
        }

        return query;
    }
}
