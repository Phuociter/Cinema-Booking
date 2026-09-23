namespace MovieBooking.Service.DTOs;

public class PagedResult<T>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int TotalCount { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    public IEnumerable<T> Items { get; set; } = new List<T>();
}
