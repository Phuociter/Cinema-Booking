using Microsoft.EntityFrameworkCore;
using MovieBooking.Data.Entities;

namespace MovieBooking.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Movie> Movies => Set<Movie>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<MovieGenre> MovieGenres => Set<MovieGenre>();
    public DbSet<Director> Directors => Set<Director>();
    public DbSet<MovieDirector> MovieDirectors => Set<MovieDirector>();
    public DbSet<Actor> Actors => Set<Actor>();
    public DbSet<MovieActor> MovieActors => Set<MovieActor>();
    public DbSet<Cinema> Cinemas => Set<Cinema>();
    public DbSet<Auditorium> Auditoriums => Set<Auditorium>();
    public DbSet<SeatType> SeatTypes => Set<SeatType>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<Showtime> Showtimes => Set<Showtime>();
    public DbSet<ShowtimeSeat> ShowtimeSeats => Set<ShowtimeSeat>();
    public DbSet<Snack> Snacks => Set<Snack>();
    public DbSet<CinemaSnack> CinemaSnacks => Set<CinemaSnack>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<BookingSnack> BookingSnacks => Set<BookingSnack>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MovieGenre>().ToTable("moviegenres");
        modelBuilder.Entity<MovieDirector>().ToTable("moviedirectors");
        modelBuilder.Entity<MovieActor>().ToTable("movieactors");
        modelBuilder.Entity<UserRole>().ToTable("userroles");

        // Composite Keys
        modelBuilder.Entity<MovieGenre>().HasKey(x => new { x.MovieId, x.GenreId });
        modelBuilder.Entity<MovieDirector>().HasKey(x => new { x.MovieId, x.DirectorId });
        modelBuilder.Entity<MovieActor>().HasKey(x => new { x.MovieId, x.ActorId });
        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });

        // Unique Constraints & Indexes
        modelBuilder.Entity<Seat>().HasIndex(x => new { x.AuditoriumId, x.SeatCode }).IsUnique();
        modelBuilder.Entity<Seat>().HasIndex(x => new { x.AuditoriumId, x.RowLabel, x.ColumnNumber }).IsUnique();
        modelBuilder.Entity<ShowtimeSeat>().HasIndex(x => new { x.ShowtimeId, x.SeatId }).IsUnique();
        modelBuilder.Entity<Ticket>().HasIndex(x => x.ShowtimeSeatId).IsUnique();
        modelBuilder.Entity<CinemaSnack>().HasIndex(x => new { x.CinemaId, x.SnackId }).IsUnique();
        modelBuilder.Entity<Booking>().HasIndex(x => x.BookingCode).IsUnique();

        // Partial unique index for active users only
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email)
            .IsUnique()
            .HasFilter("\"deleted_at\" IS NULL");

        // Relationships & Delete Behaviors (Protect financial & structural records)
        modelBuilder.Entity<Booking>()
            .HasOne(b => b.User)
            .WithMany(u => u.Bookings)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Booking)
            .WithMany(b => b.Payments)
            .HasForeignKey(p => p.BookingId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Auditorium>()
            .HasOne(a => a.Cinema)
            .WithMany(c => c.Auditoriums)
            .HasForeignKey(a => a.CinemaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Showtime>()
            .HasOne(s => s.Movie)
            .WithMany(m => m.Showtimes)
            .HasForeignKey(s => s.MovieId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Showtime>()
            .HasOne(s => s.Auditorium)
            .WithMany(a => a.Showtimes)
            .HasForeignKey(s => s.AuditoriumId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Seat>()
            .HasOne(s => s.SeatType)
            .WithMany(st => st.Seats)
            .HasForeignKey(s => s.SeatTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.ShowtimeSeat)
            .WithOne(ss => ss.Ticket)
            .HasForeignKey<Ticket>(t => t.ShowtimeSeatId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CinemaSnack>()
            .HasOne(cs => cs.Cinema)
            .WithMany(c => c.CinemaSnacks)
            .HasForeignKey(cs => cs.CinemaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CinemaSnack>()
            .HasOne(cs => cs.Snack)
            .WithMany(s => s.CinemaSnacks)
            .HasForeignKey(cs => cs.SnackId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BookingSnack>()
            .HasOne(bs => bs.CinemaSnack)
            .WithMany(cs => cs.BookingSnacks)
            .HasForeignKey(bs => bs.CinemaSnackId)
            .OnDelete(DeleteBehavior.Restrict);

        // JSONB column mapping for Payment.Metadata
        modelBuilder.Entity<Payment>()
            .Property(p => p.Metadata)
            .HasColumnType("jsonb");

        // Global Query Filters for the 7 Soft-Deletable entities
        modelBuilder.Entity<User>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Movie>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Cinema>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Auditorium>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Snack>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<CinemaSnack>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<SeatType>().HasQueryFilter(x => x.DeletedAt == null);
    }
}
