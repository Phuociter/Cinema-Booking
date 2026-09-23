using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Data.Repositories;
using MovieBooking.Data.Repositories.Interfaces;
using MovieBooking.Service.Interfaces;
using MovieBooking.Service.Mappings;
using MovieBooking.Service.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Register Database Context (PostgreSQL via Npgsql)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 3. Register AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

// 4. Register Repositories (3-layer architecture)
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<IShowtimeSeatRepository, ShowtimeSeatRepository>();

// 5. Register Redis Connection Multiplexer & Shared Redis Service (Singleton)
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
{
    var configuration = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString, true);
    configuration.AbortOnConnectFail = false;
    return StackExchange.Redis.ConnectionMultiplexer.Connect(configuration);
});
builder.Services.AddSingleton<IRedisService, RedisService>();

// 6. Register Application Services
builder.Services.AddScoped<IScheduleService, ScheduleService>();

// 6. Configure CORS Policy for Frontend (Vite / React)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:3001"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
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
