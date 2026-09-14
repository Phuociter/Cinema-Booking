using FluentValidation;
using MovieBooking.Service.DTOs;

namespace MovieBooking.Service.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Họ và tên không được để trống").MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().WithMessage("Email không được để trống").EmailAddress().WithMessage("Email không hợp lệ");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Mật khẩu không được để trống").MinimumLength(6).WithMessage("Mật khẩu phải có tối thiểu 6 ký tự");
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Email không được để trống").EmailAddress().WithMessage("Email không hợp lệ");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Mật khẩu không được để trống");
    }
}

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator()
    {
        RuleFor(x => x.ShowtimeId).NotEmpty().WithMessage("Suất chiếu không hợp lệ");
        RuleFor(x => x.ShowtimeSeatIds).NotEmpty().WithMessage("Vui lòng chọn ít nhất 1 ghế ngồi");
        RuleForEach(x => x.Snacks).ChildRules(snack =>
        {
            snack.RuleFor(s => s.CinemaSnackId).NotEmpty().WithMessage("Món bắp nước không hợp lệ");
            snack.RuleFor(s => s.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0");
        });
    }
}

public class CreateMovieRequestValidator : AbstractValidator<CreateMovieRequest>
{
    public CreateMovieRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Tên phim không được để trống").MaximumLength(255);
        RuleFor(x => x.DurationMin).GreaterThan(0).WithMessage("Thời lượng phim phải lớn hơn 0 phút");
        RuleFor(x => x.GenreIds).NotEmpty().WithMessage("Phải chọn ít nhất 1 thể loại phim");
        RuleFor(x => x.RatingScore).InclusiveBetween(0, 10).When(x => x.RatingScore.HasValue).WithMessage("Điểm đánh giá phải từ 0 đến 10");
    }
}

public class PaymentCallbackRequestValidator : AbstractValidator<PaymentCallbackRequest>
{
    public PaymentCallbackRequestValidator()
    {
        RuleFor(x => x.BookingId).NotEmpty().WithMessage("Mã đơn đặt vé không hợp lệ");
        RuleFor(x => x.Provider).NotEmpty().WithMessage("Cổng thanh toán không được để trống");
        RuleFor(x => x.TransactionRef).NotEmpty().WithMessage("Mã giao dịch không được để trống");
    }
}
