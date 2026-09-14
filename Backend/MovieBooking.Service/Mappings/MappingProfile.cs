using AutoMapper;
using MovieBooking.Data.Entities;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Movie, MovieDto>()
            .ForMember(d => d.Genres, opt => opt.MapFrom(s => s.MovieGenres.Select(mg => mg.Genre.Name)))
            .ForMember(d => d.Directors, opt => opt.MapFrom(s => s.MovieDirectors.Select(md => md.Director.Name)))
            .ForMember(d => d.Actors, opt => opt.MapFrom(s => s.MovieActors.Select(ma => new MovieActorDto
            {
                ActorId = ma.ActorId,
                Name = ma.Actor.Name,
                ProfilePath = ma.Actor.ProfilePath,
                CharacterName = ma.CharacterName
            })));

        CreateMap<Cinema, CinemaDto>()
            .ForMember(d => d.Auditoriums, opt => opt.MapFrom(s => s.Auditoriums));

        CreateMap<Auditorium, AuditoriumDto>();

        CreateMap<Showtime, ShowtimeDto>()
            .ForMember(d => d.MovieTitle, opt => opt.MapFrom(s => s.Movie.Title))
            .ForMember(d => d.PosterUrl, opt => opt.MapFrom(s => s.Movie.PosterUrl))
            .ForMember(d => d.AuditoriumName, opt => opt.MapFrom(s => s.Auditorium.Name))
            .ForMember(d => d.CinemaId, opt => opt.MapFrom(s => s.Auditorium.CinemaId))
            .ForMember(d => d.CinemaName, opt => opt.MapFrom(s => s.Auditorium.Cinema.Name));

        CreateMap<ShowtimeSeat, ShowtimeSeatDto>()
            .ForMember(d => d.RowLabel, opt => opt.MapFrom(s => s.Seat.RowLabel))
            .ForMember(d => d.ColumnNumber, opt => opt.MapFrom(s => s.Seat.ColumnNumber))
            .ForMember(d => d.SeatCode, opt => opt.MapFrom(s => s.Seat.SeatCode))
            .ForMember(d => d.SeatTypeName, opt => opt.MapFrom(s => s.Seat.SeatType.Name))
            .ForMember(d => d.ColorCode, opt => opt.MapFrom(s => s.Seat.SeatType.ColorCode))
            .ForMember(d => d.ExtraPrice, opt => opt.MapFrom(s => s.Seat.SeatType.ExtraPrice))
            .ForMember(d => d.TotalPrice, opt => opt.MapFrom(s => s.Showtime.BasePrice + s.Seat.SeatType.ExtraPrice));

        CreateMap<Snack, SnackDto>();

        CreateMap<CinemaSnack, CinemaSnackDto>()
            .ForMember(d => d.Name, opt => opt.MapFrom(s => s.Snack.Name))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.Snack.Description))
            .ForMember(d => d.ImageUrl, opt => opt.MapFrom(s => s.Snack.ImageUrl));

        CreateMap<User, UserDto>()
            .ForMember(d => d.Roles, opt => opt.MapFrom(s => s.UserRoles.Select(ur => ur.Role.Name)));

        CreateMap<Payment, PaymentResponseDto>();
    }
}
