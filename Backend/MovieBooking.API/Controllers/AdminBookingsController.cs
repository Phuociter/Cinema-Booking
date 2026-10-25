using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Service.DTOs;
using MovieBooking.Service.Interfaces;

namespace MovieBooking.API.Controllers;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Roles = "Admin")]
public class AdminBookingsController : ControllerBase
{
    private readonly IAdminBookingService _adminBookingService;

    public AdminBookingsController(IAdminBookingService adminBookingService)
    {
        _adminBookingService = adminBookingService;
    }

    [HttpGet]
    [ProducesResponseType<PagedResult<AdminBookingDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetBookings([FromQuery] AdminBookingsQuery query)
    {
        var result = await _adminBookingService.GetBookingsAsync(query);
        return result.Outcome switch
        {
            AdminBookingListOutcome.Success => Ok(result.Data),
            AdminBookingListOutcome.InvalidStatus => BadRequest(new { message = result.ErrorMessage }),
            AdminBookingListOutcome.InvalidSearch => BadRequest(new { message = result.ErrorMessage }),
            AdminBookingListOutcome.InvalidDateRange => BadRequest(new { message = result.ErrorMessage }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi không xác định." })
        };
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<AdminBookingDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBookingById(Guid id)
    {
        var result = await _adminBookingService.GetBookingDetailAsync(id);
        return result.Outcome switch
        {
            AdminBookingDetailOutcome.Success => Ok(result.Data),
            AdminBookingDetailOutcome.NotFound => NotFound(new { message = result.ErrorMessage }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi không xác định." })
        };
    }
}
