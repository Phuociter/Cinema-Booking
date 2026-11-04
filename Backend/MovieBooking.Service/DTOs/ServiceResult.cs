namespace MovieBooking.Service.DTOs;

public class ServiceResult<T>
{
    public bool Success { get; private set; }
    public T? Data { get; private set; }
    public string? Error { get; private set; }
    public int StatusCode { get; private set; }

    public static ServiceResult<T> Ok(T data) =>
        new() { Success = true, Data = data, StatusCode = 200 };

    public static ServiceResult<T> Fail(int statusCode, string error) =>
        new() { Success = false, Error = error, StatusCode = statusCode };
}