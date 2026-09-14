# Movie Booking App — ASP.NET Core 3-Layer Project (Full Structure)

3-layer structure: `Controller → Service → Repository`, with all 22 Entities mapped to the 22 tables.

---

## 1. Project folder structure

```
MovieBooking.sln
│
├── MovieBooking.API/                  # Controllers, DTOs, Program.cs
│   ├── Controllers/
│   │   ├── MoviesController.cs
│   │   ├── CinemasController.cs
│   │   ├── ShowtimesController.cs
│   │   ├── BookingsController.cs
│   │   ├── SnacksController.cs
│   │   ├── AuthController.cs
│   │   └── PaymentsController.cs
│   ├── DTOs/
│   │   ├── Movie/
│   │   ├── Cinema/
│   │   ├── Booking/
│   │   └── User/
│   ├── Middlewares/
│   │   └── ExceptionHandlingMiddleware.cs
│   ├── appsettings.json
│   └── Program.cs
│
├── MovieBooking.Service/              # Business logic
│   ├── Interfaces/
│   │   ├── IMovieService.cs
│   │   ├── IBookingService.cs
│   │   ├── IScheduleService.cs
│   │   ├── IPaymentService.cs
│   │   └── IAuthService.cs
│   ├── Services/
│   │   ├── MovieService.cs
│   │   ├── BookingService.cs
│   │   ├── ScheduleService.cs
│   │   ├── PaymentService.cs
│   │   └── AuthService.cs
│   ├── Validators/
│   │   └── CheckoutRequestValidator.cs
│   └── Mappings/
│       └── MappingProfile.cs          # AutoMapper
│
└── MovieBooking.Data/                 # Entities, Repositories, DbContext
    ├── Entities/                      # 22 entities, listed in detail in section 2
    ├── Repositories/
    │   ├── Interfaces/
    │   │   ├── IGenericRepository.cs
    │   │   ├── IBookingRepository.cs
    │   │   └── IShowtimeSeatRepository.cs
    │   ├── GenericRepository.cs
    │   ├── BookingRepository.cs
    │   └── ShowtimeSeatRepository.cs
    ├── Configurations/                # EF Core Fluent API (1 file per entity)
    │   ├── MovieConfiguration.cs
    │   ├── BookingConfiguration.cs
    │   └── ...
    └── AppDbContext.cs
```

---

## 2. Entities (22 classes, under `MovieBooking.Data/Entities/`)

> **Note:** `MovieGenres`, `MovieDirectors`, `UserRoles` have no extra data columns beyond the two foreign keys, so technically they could use EF Core skip-navigation instead of an explicit Entity. The version below still keeps explicit Entities for all three to keep code style consistent across the project — revisit this if you'd rather simplify.

> **Important — DateTime & TIMESTAMPTZ:** PostgreSQL's `TIMESTAMPTZ` column requires the C# value to have `Kind = DateTimeKind.Utc`. Every place that sets `CreatedAt`/`UpdatedAt`/`DeletedAt` in the Service layer must use `DateTime.UtcNow`, **never** `DateTime.Now` — otherwise you'll hit a runtime `InvalidCastException: Cannot write DateTime with Kind=Local`.

### Movie content group

```csharp
// Movie.cs
public class Movie
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string? OriginalTitle { get; set; }
    public string? Overview { get; set; }
    public int DurationMin { get; set; }
    public string? AgeRating { get; set; }
    public string? PosterUrl { get; set; }
    public string? BackdropUrl { get; set; }
    public string? TrailerUrl { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public decimal? RatingScore { get; set; }
    public string Status { get; set; } = "coming_soon";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<MovieGenre> MovieGenres { get; set; } = new List<MovieGenre>();
    public ICollection<MovieDirector> MovieDirectors { get; set; } = new List<MovieDirector>();
    public ICollection<MovieActor> MovieActors { get; set; } = new List<MovieActor>();
    public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
}

// Genre.cs
public class Genre
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public ICollection<MovieGenre> MovieGenres { get; set; } = new List<MovieGenre>();
}

// MovieGenre.cs — composite key (MovieId, GenreId)
public class MovieGenre
{
    public Guid MovieId { get; set; }
    public Movie Movie { get; set; }
    public Guid GenreId { get; set; }
    public Genre Genre { get; set; }
}

// Director.cs
public class Director
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? PhotoUrl { get; set; }
    public ICollection<MovieDirector> MovieDirectors { get; set; } = new List<MovieDirector>();
}

// MovieDirector.cs — composite key
public class MovieDirector
{
    public Guid MovieId { get; set; }
    public Movie Movie { get; set; }
    public Guid DirectorId { get; set; }
    public Director Director { get; set; }
}

// Actor.cs
public class Actor
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? ProfilePath { get; set; }
    public ICollection<MovieActor> MovieActors { get; set; } = new List<MovieActor>();
}

// MovieActor.cs — composite key
public class MovieActor
{
    public Guid MovieId { get; set; }
    public Movie Movie { get; set; }
    public Guid ActorId { get; set; }
    public Actor Actor { get; set; }
    public string? CharacterName { get; set; }
}
```

### Cinema & auditorium group

```csharp
// Cinema.cs
public class Cinema
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Hotline { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<Auditorium> Auditoriums { get; set; } = new List<Auditorium>();
    public ICollection<CinemaSnack> CinemaSnacks { get; set; } = new List<CinemaSnack>();
}

// Auditorium.cs
public class Auditorium
{
    public Guid Id { get; set; }
    public Guid CinemaId { get; set; }
    public Cinema Cinema { get; set; }
    public string Name { get; set; }
    public string HallType { get; set; } = "2D";
    public int? TotalRows { get; set; }
    public int? TotalColumns { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
    public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
}

// SeatType.cs
public class SeatType
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string ColorCode { get; set; } = "#FFFFFF";
    public decimal ExtraPrice { get; set; }
    public DateTime? DeletedAt { get; set; }
    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
}

// Seat.cs
public class Seat
{
    public Guid Id { get; set; }
    public Guid AuditoriumId { get; set; }
    public Auditorium Auditorium { get; set; }
    public Guid SeatTypeId { get; set; }
    public SeatType SeatType { get; set; }
    public string RowLabel { get; set; }
    public int ColumnNumber { get; set; }
    public string SeatCode { get; set; }
    public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
}
```

### Showtime & seating group

```csharp
// Showtime.cs
public class Showtime
{
    public Guid Id { get; set; }
    public Guid MovieId { get; set; }
    public Movie Movie { get; set; }
    public Guid AuditoriumId { get; set; }
    public Auditorium Auditorium { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal BasePrice { get; set; }
    public string Status { get; set; } = "scheduled";
    public DateTime CreatedAt { get; set; }

    public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
}

// ShowtimeSeat.cs
public class ShowtimeSeat
{
    public Guid Id { get; set; }
    public Guid ShowtimeId { get; set; }
    public Showtime Showtime { get; set; }
    public Guid SeatId { get; set; }
    public Seat Seat { get; set; }
    public string Status { get; set; } = "available"; // available | reserved

    public Ticket? Ticket { get; set; }
}
```

### Booking & snacks group

```csharp
// Snack.cs
public class Snack
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public DateTime? DeletedAt { get; set; }
    public ICollection<CinemaSnack> CinemaSnacks { get; set; } = new List<CinemaSnack>();
}

// CinemaSnack.cs
public class CinemaSnack
{
    public Guid Id { get; set; }
    public Guid CinemaId { get; set; }
    public Cinema Cinema { get; set; }
    public Guid SnackId { get; set; }
    public Snack Snack { get; set; }
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTime? DeletedAt { get; set; }
    public ICollection<BookingSnack> BookingSnacks { get; set; } = new List<BookingSnack>();
}

// Booking.cs
public class Booking
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; }
    public string BookingCode { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "pending"; // pending | success | cancelled
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<BookingSnack> BookingSnacks { get; set; } = new List<BookingSnack>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

// Ticket.cs
public class Ticket
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; }
    public Guid ShowtimeSeatId { get; set; }
    public ShowtimeSeat ShowtimeSeat { get; set; }
    public decimal Price { get; set; }
    public string? QrCode { get; set; }
    public DateTime CreatedAt { get; set; }
}

// BookingSnack.cs
public class BookingSnack
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; }
    public Guid CinemaSnackId { get; set; }
    public CinemaSnack CinemaSnack { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
```

### Account & payment group

```csharp
// User.cs
public class User
{
    public Guid Id { get; set; }
    public string? FullName { get; set; }
    public string Email { get; set; }
    public string? Phone { get; set; }
    public string PasswordHash { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

// Role.cs
public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

// UserRole.cs — composite key
public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; }
    public Guid RoleId { get; set; }
    public Role Role { get; set; }
}

// Payment.cs
public class Payment
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; }
    public string Provider { get; set; }
    public string Method { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "pending";
    public string? TransactionRef { get; set; }
    public string Metadata { get; set; } = "{}"; // JSONB -> map as string or JsonDocument
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

---

## 3. AppDbContext (MovieBooking.Data/AppDbContext.cs)

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Movie> Movies { get; set; }
    public DbSet<Genre> Genres { get; set; }
    public DbSet<MovieGenre> MovieGenres { get; set; }
    public DbSet<Director> Directors { get; set; }
    public DbSet<MovieDirector> MovieDirectors { get; set; }
    public DbSet<Actor> Actors { get; set; }
    public DbSet<MovieActor> MovieActors { get; set; }
    public DbSet<Cinema> Cinemas { get; set; }
    public DbSet<Auditorium> Auditoriums { get; set; }
    public DbSet<SeatType> SeatTypes { get; set; }
    public DbSet<Seat> Seats { get; set; }
    public DbSet<Showtime> Showtimes { get; set; }
    public DbSet<ShowtimeSeat> ShowtimeSeats { get; set; }
    public DbSet<Snack> Snacks { get; set; }
    public DbSet<CinemaSnack> CinemaSnacks { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<Ticket> Tickets { get; set; }
    public DbSet<BookingSnack> BookingSnacks { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<Payment> Payments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Composite keys
        modelBuilder.Entity<MovieGenre>().HasKey(x => new { x.MovieId, x.GenreId });
        modelBuilder.Entity<MovieDirector>().HasKey(x => new { x.MovieId, x.DirectorId });
        modelBuilder.Entity<MovieActor>().HasKey(x => new { x.MovieId, x.ActorId });
        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });

        // Unique constraints
        modelBuilder.Entity<Genre>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<Role>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<Booking>().HasIndex(x => x.BookingCode).IsUnique();
        modelBuilder.Entity<Seat>().HasIndex(x => new { x.AuditoriumId, x.SeatCode }).IsUnique();
        modelBuilder.Entity<Seat>().HasIndex(x => new { x.AuditoriumId, x.RowLabel, x.ColumnNumber }).IsUnique();
        modelBuilder.Entity<ShowtimeSeat>().HasIndex(x => new { x.ShowtimeId, x.SeatId }).IsUnique();
        modelBuilder.Entity<Ticket>().HasIndex(x => x.ShowtimeSeatId).IsUnique();
        modelBuilder.Entity<CinemaSnack>().HasIndex(x => new { x.CinemaId, x.SnackId }).IsUnique();

        // Email must be unique only among non-deleted users (partial index)
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email)
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");

        // ON DELETE RESTRICT for financial data
        modelBuilder.Entity<Booking>()
            .HasOne(b => b.User).WithMany(u => u.Bookings)
            .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Booking).WithMany(b => b.Payments)
            .HasForeignKey(p => p.BookingId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.ShowtimeSeat).WithOne(ss => ss.Ticket)
            .HasForeignKey<Ticket>(t => t.ShowtimeSeatId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Showtime>()
            .HasOne(s => s.Movie).WithMany(m => m.Showtimes)
            .HasForeignKey(s => s.MovieId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Showtime>()
            .HasOne(s => s.Auditorium).WithMany(a => a.Showtimes)
            .HasForeignKey(s => s.AuditoriumId).OnDelete(DeleteBehavior.Restrict);

        // Payment.Metadata must map to the actual jsonb column type,
        // otherwise Npgsql will default it to plain text
        modelBuilder.Entity<Payment>()
            .Property(p => p.Metadata)
            .HasColumnType("jsonb");

        // Global query filter for soft delete (7 tables)
        modelBuilder.Entity<User>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Movie>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Cinema>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Auditorium>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<Snack>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<CinemaSnack>().HasQueryFilter(x => x.DeletedAt == null);
        modelBuilder.Entity<SeatType>().HasQueryFilter(x => x.DeletedAt == null);

        base.OnModelCreating(modelBuilder);
    }
}
```

> The exclusion constraint that prevents overlapping showtimes (`EXCLUDE USING gist`) **cannot be declared through EF Core's Fluent API** — it must be added via raw SQL inside a migration (see section 4, step 8).

---

## 4. Standard .NET setup guide (step by step)

> **Important — only one person runs migrations:** If all 5 developers each run `dotnet ef migrations add` on their own machine, merging into the shared branch will cause conflicts in `AppDbContextModelSnapshot.cs` that cannot be resolved by hand. The correct workflow: **one person (tech lead or the dev doing initial setup)** creates all 22 entities, writes `AppDbContext`, runs `migrations add InitialCreate` + `database update`, then pushes to the shared branch. **The other 4 developers just pull** that branch — they don't run `migrations add` themselves, they only build Controllers/Services/Repositories on top of the already-migrated schema. If a new column/table is needed later, only one person handles the migration at a time, and they notify the rest of the team beforehand.

### Step 1 — Install tooling

```bash
# Check you have the .NET SDK 8 installed
dotnet --version

# Install the EF Core CLI tool (if not already installed)
dotnet tool install --global dotnet-ef
```

### Step 2 — Create the solution and projects

```bash
mkdir MovieBooking && cd MovieBooking
dotnet new sln -n MovieBooking

dotnet new webapi -n MovieBooking.API --use-controllers
dotnet new classlib -n MovieBooking.Service
dotnet new classlib -n MovieBooking.Data

dotnet sln add MovieBooking.API/MovieBooking.API.csproj
dotnet sln add MovieBooking.Service/MovieBooking.Service.csproj
dotnet sln add MovieBooking.Data/MovieBooking.Data.csproj
```

### Step 3 — Set up project references

```bash
dotnet add MovieBooking.API reference MovieBooking.Service/MovieBooking.Service.csproj
dotnet add MovieBooking.Service reference MovieBooking.Data/MovieBooking.Data.csproj
```

### Step 4 — Install NuGet packages

```bash
# MovieBooking.Data — EF Core + Npgsql (PostgreSQL provider)
cd MovieBooking.Data
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
cd ..

# MovieBooking.API — migration tooling + Swagger + JWT
cd MovieBooking.API
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Swashbuckle.AspNetCore
cd ..

# MovieBooking.Service — AutoMapper, FluentValidation, StackExchange.Redis
cd MovieBooking.Service
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection
dotnet add package FluentValidation.DependencyInjectionExtensions
dotnet add package StackExchange.Redis
cd ..
```

### Step 5 — Configure `appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=moviebooking;Username=postgres;Password=yourpassword",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Key": "your-secret-key-min-32-chars",
    "Issuer": "MovieBookingApi",
    "Audience": "MovieBookingApp",
    "ExpireMinutes": 60
  }
}
```

### Step 6 — Register services in `Program.cs`

```csharp
// Required: forces Npgsql to require DateTime.Kind = Utc for TIMESTAMPTZ columns
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", false);

var builder = WebApplication.CreateBuilder(args);

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")));

// AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<CheckoutRequestValidator>();

// Repositories & Services (register each interface/implementation pair)
builder.Services.AddScoped<IGenericRepository<Movie>, GenericRepository<Movie>>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IMovieService, MovieService>();
// ... register the remaining Services/Repositories the same way

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Required: register BEFORE UseAuthentication, otherwise the centralized
// exception handler (Validation, PostgreSQL exceptions) won't run at all
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

### Step 7 — Create the first migration

```bash
cd MovieBooking.API
dotnet ef migrations add InitialCreate --project ../MovieBooking.Data --startup-project .
dotnet ef database update --project ../MovieBooking.Data --startup-project .
```

### Step 8 — Add the exclusion constraint via raw SQL (after the migration creates the `Showtimes` table)

Open the generated migration file (`Migrations/xxxx_InitialCreate.cs`) and add this at the end of the `Up()` method:

```csharp
migrationBuilder.Sql(@"
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    ALTER TABLE ""Showtimes"" ADD CONSTRAINT no_overlapping_showtimes
    EXCLUDE USING gist (
        ""AuditoriumId"" WITH =,
        tstzrange(""StartTime"", ""EndTime"") WITH &&
    );
");
```

Then run `dotnet ef database update` again.

### Step 9 — Run it

```bash
cd MovieBooking.API
dotnet run
```

Open `https://localhost:xxxx/swagger` to see the API list.

---

## 5. Controllers (under `MovieBooking.API/Controllers/`)

Each controller only coordinates HTTP — receives the request, does basic validation, calls a Service, returns an `IActionResult`. No business logic lives here.

```csharp
[ApiController]
[Route("api/movies")]
public class MoviesController : ControllerBase
{
    private readonly IMovieService _movieService;
    public MoviesController(IMovieService movieService) => _movieService = movieService;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] MovieFilterDto filter)
        => Ok(await _movieService.GetMoviesAsync(filter));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await _movieService.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CreateMovieDto dto)
        => Ok(await _movieService.CreateAsync(dto));
}
```

**Full controller list:**

| Controller | Route | Access |
|---|---|---|
| `MoviesController` | `/api/movies` | Public (GET), Admin (POST/PUT/DELETE) |
| `CinemasController` | `/api/cinemas` | Public (GET), Admin (POST/PUT/DELETE) |
| `ShowtimesController` | `/api/showtimes` | Public (GET), Staff/Admin (POST/PUT) |
| `SeatsController` | `/api/showtimes/{id}/seats` | Public (GET) |
| `SnacksController` | `/api/cinemas/{id}/snacks` | Public (GET), Admin (POST/PUT) |
| `BookingsController` | `/api/bookings` | Authenticated user |
| `PaymentsController` | `/api/payments` | Authenticated user + Webhook (public, verified by signature) |
| `AuthController` | `/api/auth` | Public (`register`, `login`) |
| `UsersController` | `/api/users/me` | Authenticated user |
| `AdminController` (optional) | `/api/admin/*` | Admin only — stats, user management |

**Centralized error handling** — no repeated try/catch in every controller, use a middleware instead:

```csharp
// Middlewares/ExceptionHandlingMiddleware.cs
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    public ExceptionHandlingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (ValidationException ex)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx)
        {
            // Catch PostgreSQL UNIQUE violation / EXCLUDE constraint specifically
            // to return a clear message instead of a generic 500
            context.Response.StatusCode = pgEx.SqlState switch
            {
                "23505" => 409, // unique_violation
                "23P01" => 409, // exclusion_violation (overlapping showtime)
                _ => 500
            };
            await context.Response.WriteAsJsonAsync(new { error = "Data conflict, please try again." });
        }
        catch (Exception)
        {
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new { error = "An error occurred." });
        }
    }
}
```

Register it in `Program.cs`: `app.UseMiddleware<ExceptionHandlingMiddleware>();` — placed **before** `app.UseAuthentication()`.

---

## 6. Server / Hosting

**Runtime environments (development → production):**

```
Program.cs (built-in Kestrel)
   → Development: dotnet run, auto-generated dev HTTPS cert
   → Production: runs behind a Reverse Proxy (Nginx) or IIS
```

**Per-environment configuration** (`appsettings.Development.json` / `appsettings.Production.json`):
- Development: connection string points to local DB, Swagger enabled, verbose (`Debug`-level) logging.
- Production: connection string pulled from **environment variables** or **Azure Key Vault / User Secrets**, never hardcoded in a JSON file committed to Git. Swagger disabled or restricted to internal IPs.

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts(); // HTTPS is mandatory in production
}
```

**Health check endpoint** (so a load balancer / K8s can check the server is alive):

```csharp
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection"))
    .AddRedis(builder.Configuration.GetConnectionString("Redis"));

app.MapHealthChecks("/health");
```

**Background job runner** — use Hangfire, either inside the same API process or split into a separate Worker Service if load is high:

```csharp
builder.Services.AddHangfire(config => config.UsePostgreSqlStorage(connectionString));
builder.Services.AddHangfireServer();
app.UseHangfireDashboard("/jobs"); // should sit behind [Authorize(Roles = "Admin")]
```

---

## 7. Security

### 7.1 Authentication — JWT

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });
```

- **Never store the JWT secret in an `appsettings.json` committed to Git** — use `dotnet user-secrets` (dev) or environment variables (production).
- Access tokens should be short-lived (15–60 minutes) plus a separate refresh token (stored hashed in the DB or Redis, with a longer TTL).

### 7.2 Password hashing

**Don't write your own hashing function.** Use the built-in `PasswordHasher<T>` from ASP.NET Core Identity (a standardized PBKDF2 implementation):

```csharp
var hasher = new PasswordHasher<User>();
user.PasswordHash = hasher.HashPassword(user, plainPassword);

// Verify at login
var result = hasher.VerifyHashedPassword(user, user.PasswordHash, inputPassword);
if (result == PasswordVerificationResult.Failed) throw new UnauthorizedException();
```

### 7.3 Authorization — role-based access

```csharp
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase { ... }

[Authorize(Roles = "Staff,Admin")]
[HttpPost("showtimes")]
public async Task<IActionResult> CreateShowtime(...) { ... }
```

Roles come from the `Roles`/`UserRoles` tables and get embedded into JWT claims at login:

```csharp
var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, user.Id.ToString()) };
claims.AddRange(user.UserRoles.Select(ur => new Claim(ClaimTypes.Role, ur.Role.Name)));
```

### 7.4 Input validation & injection

- **FluentValidation** at the Service layer rejects malformed input before it ever reaches the DB (already set up in section 4).
- EF Core uses **parameterized queries by default** — there's no SQL injection risk as long as you don't build `FromSqlRaw` strings by hand. If raw SQL is unavoidable (e.g. the exclusion constraint), always use `FromSqlInterpolated` or parameter binding, never string concatenation.

### 7.5 Protecting other sensitive endpoints

| Endpoint | Risk | Mitigation |
|---|---|---|
| `POST /api/auth/login` | Brute-force | Rate limiting (`AspNetCoreRateLimit` or the built-in `Microsoft.AspNetCore.RateLimiting`) |
| `POST /api/payments/webhook/{provider}` | Forged webhook | Verify the HMAC signature from the payment provider before processing — **don't** use a regular JWT `[Authorize]` here, since the payment gateway has no token from your system |
| `GET /api/users/me/bookings` | Cross-user data access | Get `UserId` from JWT claims (`User.FindFirst(ClaimTypes.NameIdentifier)`), never accept a client-supplied `userId` query parameter |
| Every API | Overly permissive CORS | Whitelist the real frontend domain (the React app) only — never use `AllowAnyOrigin()` alongside `AllowCredentials()` |

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("https://your-react-app.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});
```

### 7.6 Protecting sensitive data

- **Never return Entities directly from an API** — always go through a DTO (as covered earlier), to avoid leaking `PasswordHash` or `TransactionRef`.
- Connection strings, JWT key, Redis password: put them in **User Secrets** (dev) or **Azure Key Vault / AWS Secrets Manager** (production) — never commit them in `appsettings.json`.
- HTTPS is mandatory everywhere (`app.UseHttpsRedirection()` + `UseHsts()` in production).

---

## 8. Suggested work split for 5 developers (mapped back onto the 3-layer structure)

| Dev | Entities owned | Files to create |
|---|---|---|
| A | Movie, Genre, MovieGenre, Director, MovieDirector | `Entities/`, `MovieService.cs`, `MoviesController.cs` |
| B | Actor, MovieActor, Cinema, Auditorium | `CinemaService.cs`, `CinemasController.cs` |
| C | Showtime, SeatType, Seat, ShowtimeSeat | `ScheduleService.cs`, `ShowtimesController.cs` |
| D | Booking, Ticket, Snack, CinemaSnack, BookingSnack | `BookingService.cs`, `BookingsController.cs` |
| E | User, Role, UserRole, Payment | `AuthService.cs`, `PaymentService.cs`, `AuthController.cs`, `PaymentsController.cs` |

Each dev creates the Entities first (as coded in section 2) → then the matching Repository interface → then the Service → then the Controller. Since all Entities live in one shared `AppDbContext`, everyone can build/run from day one without waiting on anyone else (matching the "run everything in parallel" goal agreed earlier) — as long as only one person owns the migration, per the note in section 4.