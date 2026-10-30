using MovieBooking.Data.Entities;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Services;

public class MovieService : IMovieService
{
    private readonly IMovieRepository _movieRepository;
    private readonly IGenreRepository _genreRepository;

    public MovieService(
        IMovieRepository movieRepository,
        IGenreRepository genreRepository)
    {
        _movieRepository = movieRepository;
        _genreRepository = genreRepository;
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
        var (movies, totalItems) =
            await _movieRepository.GetMoviesPagedAsync(
                status,
                search,
                genre,
                sortBy,
                city,
                cinemaId,
                page,
                pageSize,
                cancellationToken);

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
        var movie = await _movieRepository.GetMovieByIdAsync(
            id,
            cancellationToken);

        return movie == null ? null : MapMovie(movie);
    }

    public async Task<List<GenreDto>> GetGenresAsync(
        CancellationToken cancellationToken = default)
    {
        var genres = await _genreRepository.GetAllAsync(cancellationToken);

        return genres.Select(genre => new GenreDto
        {
            Id = genre.Id,
            Name = genre.Name
        }).ToList();
    }

    public async Task<MovieDto> CreateMovieAsync(
        CreateMovieRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateMovieRequest(request);

        var genreIds = request.GenreIds.Distinct().ToList();
        var directorIds = request.DirectorIds.Distinct().ToList();

        var actors = request.Actors
            .GroupBy(actor => actor.ActorId)
            .Select(group => group.First())
            .ToList();

        if (!await _movieRepository.GenresExistAsync(genreIds, cancellationToken))
        {
            throw new ArgumentException("Một hoặc nhiều thể loại không tồn tại.");
        }

        if (!await _movieRepository.DirectorsExistAsync(directorIds, cancellationToken))
        {
            throw new ArgumentException("Một hoặc nhiều đạo diễn không tồn tại.");
        }

        var actorIds = actors.Select(actor => actor.ActorId).ToList();

        if (!await _movieRepository.ActorsExistAsync(actorIds, cancellationToken))
        {
            throw new ArgumentException("Một hoặc nhiều diễn viên không tồn tại.");
        }

        var now = DateTime.UtcNow;
        var movieId = Guid.NewGuid();

        var movie = new Movie
        {
            Id = movieId,
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
            UpdatedAt = now,

            MovieGenres = genreIds.Select(genreId => new MovieGenre
            {
                MovieId = movieId,
                GenreId = genreId
            }).ToList(),

            MovieDirectors = directorIds.Select(directorId => new MovieDirector
            {
                MovieId = movieId,
                DirectorId = directorId
            }).ToList(),

            MovieActors = actors.Select(actor => new MovieActor
            {
                MovieId = movieId,
                ActorId = actor.ActorId,
                CharacterName = actor.CharacterName
            }).ToList()
        };

        await _movieRepository.AddMovieAsync(movie, cancellationToken);

        await _movieRepository.PopulateRelationsAsync(
            new List<Movie> { movie }, cancellationToken);

        return MapMovie(movie);
    }
    public async Task<MovieDto?> UpdateMovieAsync(
        Guid id,
        UpdateMovieRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateMovieRequest(request);

        var movie = await _movieRepository.GetMovieByIdAsync(
            id, cancellationToken);

        if (movie == null)
        {
            return null;
        }

        var genreIds = request.GenreIds.Distinct().ToList();
        var directorIds = request.DirectorIds.Distinct().ToList();

        var actors = request.Actors
            .GroupBy(actor => actor.ActorId)
            .Select(group => group.First())
            .ToList();

        if (!await _movieRepository.GenresExistAsync(
                genreIds, cancellationToken))
        {
            throw new ArgumentException(
                "Một hoặc nhiều thể loại không tồn tại.");
        }

        if (!await _movieRepository.DirectorsExistAsync(
                directorIds, cancellationToken))
        {
            throw new ArgumentException(
                "Một hoặc nhiều đạo diễn không tồn tại.");
        }

        var actorIds = actors.Select(actor => actor.ActorId).ToList();

        if (!await _movieRepository.ActorsExistAsync(
                actorIds, cancellationToken))
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

        movie.MovieGenres = genreIds.Select(genreId => new MovieGenre
        {
            MovieId = id,
            GenreId = genreId
        }).ToList();

        movie.MovieDirectors = directorIds.Select(directorId => new MovieDirector
        {
            MovieId = id,
            DirectorId = directorId
        }).ToList();

        movie.MovieActors = actors.Select(actor => new MovieActor
        {
            MovieId = id,
            ActorId = actor.ActorId,
            CharacterName = actor.CharacterName
        }).ToList();

        await _movieRepository.UpdateMovieAsync(
            movie, cancellationToken);

        var updatedMovie = await _movieRepository.GetMovieByIdAsync(
            id, cancellationToken);

        return updatedMovie == null ? null : MapMovie(updatedMovie);
    }

    public Task<bool> SoftDeleteMovieAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return _movieRepository.SoftDeleteMovieAsync(
            id, cancellationToken);
    }

    public async Task<GenreDto> CreateGenreAsync(
        GenreRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateGenreRequest(request);

        var name = request.Name.Trim();

        if (await _genreRepository.ExistsByNameAsync(
                name, cancellationToken: cancellationToken))
        {
            throw new ArgumentException("Tên thể loại đã tồn tại.");
        }

        var genre = new Genre
        {
            Id = Guid.NewGuid(),
            Name = name
        };

        await _genreRepository.AddAsync(genre, cancellationToken);

        return new GenreDto
        {
            Id = genre.Id,
            Name = genre.Name
        };
    }

    public async Task<GenreDto?> UpdateGenreAsync(
        Guid id,
        GenreRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateGenreRequest(request);

        var genre = await _genreRepository.GetByIdAsync(
            id, cancellationToken);

        if (genre == null)
        {
            return null;
        }

        var name = request.Name.Trim();

        if (await _genreRepository.ExistsByNameAsync(
                name, id, cancellationToken))
        {
            throw new ArgumentException("Tên thể loại đã tồn tại.");
        }

        genre.Name = name;

        await _genreRepository.UpdateAsync(
            genre, cancellationToken);

        return new GenreDto
        {
            Id = genre.Id,
            Name = genre.Name
        };
    }

    public async Task<bool> DeleteGenreAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var genre = await _genreRepository.GetByIdAsync(
            id, cancellationToken);

        if (genre == null)
        {
            return false;
        }

        var deleted = await _genreRepository.DeleteAsync(
            id, cancellationToken);

        if (!deleted)
        {
            throw new ArgumentException(
                "Không thể xóa thể loại đang được sử dụng bởi phim.");
        }

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

        if (request.Actors.Any(actor => actor.ActorId == Guid.Empty))
            throw new ArgumentException(
                "ID diễn viên không hợp lệ.");
    }

    private static void ValidateGenreRequest(GenreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException(
                "Tên thể loại không được để trống.");
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
                .OrderBy(relation => relation.Genre.Name)
                .Select(relation => relation.Genre.Name)
                .ToList(),

            Directors = movie.MovieDirectors
                .OrderBy(relation => relation.Director.Name)
                .Select(relation => relation.Director.Name)
                .ToList(),

            Actors = movie.MovieActors
                .OrderBy(relation => relation.Actor.Name)
                .Select(relation => new MovieActorDto
                {
                    ActorId = relation.ActorId,
                    Name = relation.Actor.Name,
                    ProfilePath = relation.Actor.ProfilePath,
                    CharacterName = relation.CharacterName
                })
                .ToList()
        };
    }
}
