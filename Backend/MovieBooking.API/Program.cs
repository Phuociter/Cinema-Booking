using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MovieBooking.Data;
using MovieBooking.Data.Repositories;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.Interfaces;
using MovieBooking.Service.Mappings;
using MovieBooking.Service.Services;

var builder = WebApplication.CreateBuilder(args);

// Tự động nạp biến môi trường từ file .env nếu có
LoadDotEnv(builder);

// 1. Add Controllers & Swagger with JWT Bearer
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT token, không cần tự thêm chữ Bearer."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 2. Database Context (PostgreSQL via Npgsql with SnakeCase)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=cinema_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

// 3. Register AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

// 4. Register Repositories
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<IShowtimeSeatRepository, ShowtimeSeatRepository>();

// 5. Register Redis Cache (Singleton)
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
{
    var configuration = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString, true);
    configuration.AbortOnConnectFail = false;
    return StackExchange.Redis.ConnectionMultiplexer.Connect(configuration);
});
builder.Services.AddSingleton<IRedisService, RedisService>();

// 6. Register Application Services
builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<ISnackService, SnackService>();
builder.Services.AddScoped<ICinemaService, CinemaService>();

// 7. JWT Authentication & Authorization (Dual Schemes: InternalJwt + ClerkJwt)
const string InternalScheme = "InternalJwt";
const string ClerkScheme = "ClerkJwt";

var jwtSecret = builder.Configuration["JWT_SECRET"] 
    ?? Environment.GetEnvironmentVariable("JWT_SECRET");

if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException("CẤU HÌNH BẢO MẬT KHÔNG HỢP LỆ: Biến môi trường JWT_SECRET chưa được thiết lập hoặc ngắn hơn 32 ký tự. Vui lòng cấu hình JWT_SECRET trong file .env hoặc appsettings.json.");
}

var clerkAuthority = builder.Configuration["CLERK_FRONTEND_API_URL"] 
    ?? Environment.GetEnvironmentVariable("CLERK_FRONTEND_API_URL");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = InternalScheme;
    options.DefaultChallengeScheme = InternalScheme;
})
.AddJwtBearer(InternalScheme, options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };
})
.AddJwtBearer(ClerkScheme, options =>
{
    options.Authority = clerkAuthority;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateAudience = false,
        NameClaimType = "sub"
    };
});
builder.Services.AddAuthorization();

// 8. CORS Policy for Frontend
var allowedOrigins = ResolveAllowedOrigins(builder.Configuration);
Console.WriteLine($"[CORS] Allowed origins: {string.Join(", ", allowedOrigins)}");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                try
                {
                    var uri = new Uri(origin);
                    return uri.Host == "localhost" || allowedOrigins.Contains(origin);
                }
                catch
                {
                    return false;
                }
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static string[] ResolveAllowedOrigins(IConfiguration configuration)
{
    // Ưu tiên 1: mảng cấu hình chuẩn trong appsettings.json
    var fromConfigSection = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (fromConfigSection is { Length: > 0 })
    {
        return fromConfigSection;
    }

    // Ưu tiên 2: biến môi trường dạng danh sách phân tách bởi dấu phẩy
    var fromCommaSeparatedEnv = configuration["CORS_ALLOWED_ORIGINS"]
        ?? Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
    if (!string.IsNullOrWhiteSpace(fromCommaSeparatedEnv))
    {
        return fromCommaSeparatedEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    // Ưu tiên 3: 1 origin đơn lẻ từ FRONTEND_URL
    var singleOrigin = configuration["FRONTEND_URL"]
        ?? Environment.GetEnvironmentVariable("FRONTEND_URL");
    if (!string.IsNullOrWhiteSpace(singleOrigin))
    {
        return [singleOrigin];
    }

    // Fallback cuối cùng: cổng dev mặc định
    return ["http://localhost:3001"];
}

static void LoadDotEnv(WebApplicationBuilder builder)
{
    var candidates = new[]
    {
        Path.Combine(builder.Environment.ContentRootPath, ".env"),
        Path.Combine(builder.Environment.ContentRootPath, "..", ".env"),
        Path.Combine(builder.Environment.ContentRootPath, "..", "..", ".env")
    };

    foreach (var path in candidates)
    {
        var fullPath = Path.GetFullPath(path);
        if (!File.Exists(fullPath)) continue;

        foreach (var line in File.ReadAllLines(fullPath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#") || !trimmed.Contains('=')) continue;
            var parts = trimmed.Split('=', 2);
            var key = parts[0].Trim();
            var val = parts[1].Trim().Trim('\"', '\'');
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, val);
            }
            builder.Configuration[key] = val;
        }
    }
}
