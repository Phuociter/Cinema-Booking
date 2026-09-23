using System.Text.Json;
using Microsoft.Extensions.Logging;
using MovieBooking.Service.Interfaces;
using StackExchange.Redis;

namespace MovieBooking.Service.Services;

/// <summary>
/// Triển khai dịch vụ Redis dùng chung (Singleton) cho toàn hệ thống
/// </summary>
public class RedisService : IRedisService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly ILogger<RedisService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public RedisService(IConnectionMultiplexer redis, ILogger<RedisService> logger)
    {
        _redis = redis;
        _database = _redis.GetDatabase();
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }

    public async Task<string?> GetStringAsync(string key)
    {
        try
        {
            var value = await _database.StringGetAsync(key);
            return value.IsNullOrEmpty ? null : value.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi đọc chuỗi từ Redis với key: {Key}", key);
            return null;
        }
    }

    public async Task<bool> SetStringAsync(string key, string value, TimeSpan? expiry = null, bool onlyIfNotExists = false)
    {
        try
        {
            var when = onlyIfNotExists ? When.NotExists : When.Always;
            return await _database.StringSetAsync(key, value, expiry, when);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi ghi chuỗi vào Redis với key: {Key}", key);
            return false;
        }
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var json = await _database.StringGetAsync(key);
            if (json.IsNullOrEmpty)
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(json.ToString(), _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi đọc và deserialize object từ Redis với key: {Key}", key);
            return default;
        }
    }

    public async Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiry = null, bool onlyIfNotExists = false)
    {
        try
        {
            if (value == null)
            {
                return false;
            }

            var json = JsonSerializer.Serialize(value, _jsonOptions);
            return await SetStringAsync(key, json, expiry, onlyIfNotExists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi serialize và ghi object vào Redis với key: {Key}", key);
            return false;
        }
    }

    public Task<T?> GetObjectAsync<T>(string key) => GetAsync<T>(key);

    public Task<bool> SetObjectAsync<T>(string key, T value, TimeSpan? expiry = null, bool onlyIfNotExists = false)
        => SetAsync<T>(key, value, expiry, onlyIfNotExists);

    public async Task<bool> RemoveAsync(string key)
    {
        try
        {
            return await _database.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa key khỏi Redis: {Key}", key);
            return false;
        }
    }

    public async Task RemoveByPrefixAsync(string prefix)
    {
        try
        {
            var endpoints = _redis.GetEndPoints();
            foreach (var endpoint in endpoints)
            {
                var server = _redis.GetServer(endpoint);
                if (server.IsConnected)
                {
                    var keys = server.Keys(pattern: $"{prefix}*").ToArray();
                    if (keys.Length > 0)
                    {
                        await _database.KeyDeleteAsync(keys);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa key theo prefix: {Prefix}", prefix);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            return await _database.KeyExistsAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi kiểm tra key tồn tại trong Redis: {Key}", key);
            return false;
        }
    }
}
