
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

        if (!string.IsNullOrWhiteSpace(selectedCity) ||
            cinemaId.HasValue)
        {
            query = query.Where(movie =>
                _dbContext.Showtimes.Any(showtime =>
                    showtime.MovieId == movie.Id &&
                    (!cinemaId.HasValue ||
                     showtime.Auditorium.CinemaId == cinemaId.Value) &&
                    (string.IsNullOrWhiteSpace(selectedCity) ||
                     (showtime.Auditorium.Cinema.City != null &&
                      EF.Functions.ILike(
                          showtime.Auditorium.Cinema.City,
                          selectedCity)))));
        }

        var totalItems = await query.CountAsync(cancellationToken);

        IOrderedQueryable<Movie> orderedQuery = sortBy switch
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

        var movies = await orderedQuery
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
            TotalPages = (int)Math.Ceiling(
                totalItems / (double)pageSize)
        };
    }

    public async Task<MovieDto?> GetMovieByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var movie = await BuildMovieQuery(null, null, null)
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (movie is null)
            return null;

        await PopulateRelationsAsync(
            new List<Movie> { movie },
            cancellationToken);

        return MapMovie(movie);
    }

    public async Task<List<GenreDto>> GetGenresAsync(
        CancellationToken cancellationToken = default)
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

    public async Task<MovieDto> CreateMovieAsync(
        CreateMovieRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateMovieRequest(request);

        var genreIds = request.GenreIds.Distinct().ToList();
        var directorIds = request.DirectorIds.Distinct().ToList();

        var actors = request.Actors
            .GroupBy(x => x.ActorId)
            .Select(g => g.First())
            .ToList();

        if (await _dbContext.Genres.CountAsync(
                x => genreIds.Contains(x.Id),
                cancellationToken) != genreIds.Count)
        {
            throw new ArgumentException(
                "Một hoặc nhiều thể loại không tồn tại.");
        }

        if (await _dbContext.Directors.CountAsync(
                x => directorIds.Contains(x.Id),
                cancellationToken) != directorIds.Count)
        {
            throw new ArgumentException(
                "Một hoặc nhiều đạo diễn không tồn tại.");
        }

        var actorIds = actors.Select(x => x.ActorId).ToList();

        if (await _dbContext.Actors.CountAsync(
                x => actorIds.Contains(x.Id),
                cancellationToken) != actorIds.Count)
        {
            throw new ArgumentException(
                "Một hoặc nhiều diễn viên không tồn tại.");
        }

        var now = DateTime.UtcNow;

        var movie = new Movie
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            OriginalTitle = request.OriginalTitle,
            Overview = request.Overview,
            DurationMin = request.DurationMin,
            AgeRating = request.AgeRating,
            PosterUrl = request.PosterUrl,
            BackdropUrl = request.BackdropUrl,
            TrailerUrl = request.TrailerUrl,
            ReleaseDate = request.ReleaseDate,
            RatingScore = request.RatingScore,
            Status = request.Status,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Movies.Add(movie);

        foreach (var genreId in genreIds)
        {
            _dbContext.MovieGenres.Add(new MovieGenre
            {
                MovieId = movie.Id,
                GenreId = genreId
            });
        }

        foreach (var directorId in directorIds)
        {
            _dbContext.MovieDirectors.Add(new MovieDirector
            {
                MovieId = movie.Id,
                DirectorId = directorId
            });
        }

        foreach (var actor in actors)
        {
            _dbContext.MovieActors.Add(new MovieActor
            {
                MovieId = movie.Id,
                ActorId = actor.ActorId,
                CharacterName = actor.CharacterName
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await PopulateRelationsAsync(
            new List<Movie> { movie },
            cancellationToken);

        return MapMovie(movie);
    }

    public async Task<MovieDto?> UpdateMovieAsync(
        Guid id,
        UpdateMovieRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateMovieRequest(request);

        var movie = await _dbContext.Movies
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (movie is null)
            return null;

        var genreIds = request.GenreIds.Distinct().ToList();
        var directorIds = request.DirectorIds.Distinct().ToList();

        var actors = request.Actors
            .GroupBy(x => x.ActorId)
            .Select(g => g.First())
            .ToList();

        if (await _dbContext.Genres.CountAsync(
                x => genreIds.Contains(x.Id),
                cancellationToken) != genreIds.Count)
        {
            throw new ArgumentException(
                "Một hoặc nhiều thể loại không tồn tại.");
        }

        if (await _dbContext.Directors.CountAsync(
                x => directorIds.Contains(x.Id),
                cancellationToken) != directorIds.Count)
        {
            throw new ArgumentException(
                "Một hoặc nhiều đạo diễn không tồn tại.");
        }

        var actorIds = actors.Select(x => x.ActorId).ToList();

        if (await _dbContext.Actors.CountAsync(
                x => actorIds.Contains(x.Id),
                cancellationToken) != actorIds.Count)
        {
            throw new ArgumentException(
                "Một hoặc nhiều diễn viên không tồn tại.");
        }

        movie.Title = request.Title.Trim();
        movie.OriginalTitle = request.OriginalTitle;
        movie.Overview = request.Overview;
        movie.DurationMin = request.DurationMin;
        movie.AgeRating = request.AgeRating;
        movie.PosterUrl = request.PosterUrl;
        movie.BackdropUrl = request.BackdropUrl;
        movie.TrailerUrl = request.TrailerUrl;
        movie.ReleaseDate = request.ReleaseDate;
        movie.RatingScore = request.RatingScore;
        movie.Status = request.Status;
        movie.UpdatedAt = DateTime.UtcNow;

        var oldGenres = await _dbContext.MovieGenres
            .Where(x => x.MovieId == id)
            .ToListAsync(cancellationToken);

        var oldDirectors = await _dbContext.MovieDirectors
            .Where(x => x.MovieId == id)
            .ToListAsync(cancellationToken);

        var oldActors = await _dbContext.MovieActors
            .Where(x => x.MovieId == id)
            .ToListAsync(cancellationToken);

        _dbContext.MovieGenres.RemoveRange(oldGenres);
        _dbContext.MovieDirectors.RemoveRange(oldDirectors);
        _dbContext.MovieActors.RemoveRange(oldActors);

        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var genreId in genreIds)
        {
            _dbContext.MovieGenres.Add(new MovieGenre
            {
                MovieId = id,
                GenreId = genreId
            });
        }

        foreach (var directorId in directorIds)
        {
            _dbContext.MovieDirectors.Add(new MovieDirector
            {
                MovieId = id,
                DirectorId = directorId
            });
        }

        foreach (var actor in actors)
        {
            _dbContext.MovieActors.Add(new MovieActor
            {
                MovieId = id,
                ActorId = actor.ActorId,
                CharacterName = actor.CharacterName
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        movie.MovieGenres = new List<MovieGenre>();
        movie.MovieDirectors = new List<MovieDirector>();
        movie.MovieActors = new List<MovieActor>();

        await PopulateRelationsAsync(
            new List<Movie> { movie },
            cancellationToken);

        return MapMovie(movie);
    }

    public async Task<bool> SoftDeleteMovieAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var movie = await _dbContext.Movies
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (movie is null)
            return false;

        movie.DeletedAt = DateTime.UtcNow;
        movie.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static void ValidateMovieRequest(
        CreateMovieRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException(
                "Tên phim không được để trống.");

        if (request.DurationMin <= 0)
            throw new ArgumentException(
                "Thời lượng phim phải lớn hơn 0.");

        if (request.RatingScore is < 0 or > 10)
            throw new ArgumentException(
                "Điểm đánh giá phải từ 0 đến 10.");

        if (request.GenreIds.Count == 0)
            throw new ArgumentException(
                "Phải chọn ít nhất một thể loại.");

        if (request.Actors.Any(x => x.ActorId == Guid.Empty))
            throw new ArgumentException(
                "ID diễn viên không hợp lệ.");
    }

    private IQueryable<Movie> BuildMovieQuery(
        string? status,
        string? search,
        string? genre)
    {
        var query = _dbContext.Movies
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(
                movie => movie.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";

            query = query.Where(movie =>
                EF.Functions.ILike(movie.Title, pattern) ||
                (movie.OriginalTitle != null &&
                 EF.Functions.ILike(
                     movie.OriginalTitle, pattern)) ||
                movie.MovieGenres.Any(movieGenre =>
                    EF.Functions.ILike(
                        movieGenre.Genre.Name, pattern)));
        }

        if (!string.IsNullOrWhiteSpace(genre))
        {
            var selectedGenre = genre.Trim();

            query = query.Where(movie =>
                movie.MovieGenres.Any(movieGenre =>
                    EF.Functions.ILike(
                        movieGenre.Genre.Name,
                        selectedGenre)));
        }

        return query;
    }

    private async Task PopulateRelationsAsync(
        List<Movie> movies,
        CancellationToken cancellationToken)
    {
        if (movies.Count == 0)
            return;

        var movieIds = movies
            .Select(movie => movie.Id)
            .ToHashSet();

        var movieGenres = await _dbContext.MovieGenres
            .FromSqlRaw(
                "SELECT movie_id, genre_id FROM moviegenres")
            .AsNoTracking()
            .Where(x => movieIds.Contains(x.MovieId))
            .ToListAsync(cancellationToken);

        var movieDirectors = await _dbContext.MovieDirectors
            .FromSqlRaw(
                "SELECT movie_id, director_id FROM moviedirectors")
            .AsNoTracking()
            .Where(x => movieIds.Contains(x.MovieId))
            .ToListAsync(cancellationToken);

        var movieActors = await _dbContext.MovieActors
            .FromSqlRaw(
                "SELECT movie_id, actor_id, character_name FROM movieactors")
            .AsNoTracking()
            .Where(x => movieIds.Contains(x.MovieId))
            .ToListAsync(cancellationToken);

        var genreIds = movieGenres
            .Select(x => x.GenreId)
            .ToHashSet();

        var directorIds = movieDirectors
            .Select(x => x.DirectorId)
            .ToHashSet();

        var actorIds = movieActors
            .Select(x => x.ActorId)
            .ToHashSet();

        var genres = await _dbContext.Genres
            .AsNoTracking()
            .Where(x => genreIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var directors = await _dbContext.Directors
            .AsNoTracking()
            .Where(x => directorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var actors = await _dbContext.Actors
            .AsNoTracking()
            .Where(x => actorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        foreach (var movie in movies)
        {
            movie.MovieGenres = movieGenres
                .Where(x =>
                    x.MovieId == movie.Id &&
                    genres.ContainsKey(x.GenreId))
                .Select(x => new MovieGenre
                {
                    MovieId = x.MovieId,
                    GenreId = x.GenreId,
                    Genre = genres[x.GenreId]
                })
                .ToList();

            movie.MovieDirectors = movieDirectors
                .Where(x =>
                    x.MovieId == movie.Id &&
                    directors.ContainsKey(x.DirectorId))
                .Select(x => new MovieDirector
                {
                    MovieId = x.MovieId,
                    DirectorId = x.DirectorId,
                    Director = directors[x.DirectorId]
                })
                .ToList();

            movie.MovieActors = movieActors
                .Where(x =>
                    x.MovieId == movie.Id &&
                    actors.ContainsKey(x.ActorId))
                .Select(x => new MovieActor
                {
                    MovieId = x.MovieId,
                    ActorId = x.ActorId,
                    CharacterName = x.CharacterName,
                    Actor = actors[x.ActorId]
                })
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
                .OrderBy(x => x.Genre.Name)
                .Select(x => x.Genre.Name)
                .ToList(),

            Directors = movie.MovieDirectors
                .OrderBy(x => x.Director.Name)
                .Select(x => x.Director.Name)
                .ToList(),

            Actors = movie.MovieActors
                .OrderBy(x => x.Actor.Name)
                .Select(x => new MovieActorDto
                {
                    ActorId = x.ActorId,
                    Name = x.Actor.Name,
                    ProfilePath = x.Actor.ProfilePath,
                    CharacterName = x.CharacterName
                })
                .ToList()
        };
    }
}
