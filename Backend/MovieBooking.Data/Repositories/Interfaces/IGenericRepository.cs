using System.Linq.Expressions;

namespace MovieBooking.Data.Repositories.Interfaces;

public interface IGenericRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, string? includeProperties = null);
    Task<T?> GetByIdAsync(Guid id);
    Task<T?> GetFirstOrDefaultAsync(Expression<Func<T, bool>> filter, string? includeProperties = null);
    Task AddAsync(T entity);
    void Update(T entity);
    void Delete(T entity);
    Task SoftDeleteAsync(Guid id);
    Task<int> SaveChangesAsync();
}
