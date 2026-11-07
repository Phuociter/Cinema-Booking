using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MovieBooking.Data.Repositories;

public static class DbErrors
{
    public static bool IsOverlapViolation(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23P01";
    }
}
