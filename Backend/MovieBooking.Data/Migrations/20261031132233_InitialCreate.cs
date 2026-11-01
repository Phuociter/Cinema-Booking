using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieBooking.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "actors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    profile_path = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_actors", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cinemas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    address = table.Column<string>(type: "text", nullable: true),
                    city = table.Column<string>(type: "text", nullable: true),
                    hotline = table.Column<string>(type: "text", nullable: true),
                    image_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cinemas", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "directors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    photo_url = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_directors", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "genres",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_genres", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "movies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    original_title = table.Column<string>(type: "text", nullable: true),
                    overview = table.Column<string>(type: "text", nullable: true),
                    duration_min = table.Column<int>(type: "integer", nullable: false),
                    age_rating = table.Column<string>(type: "text", nullable: true),
                    poster_url = table.Column<string>(type: "text", nullable: true),
                    backdrop_url = table.Column<string>(type: "text", nullable: true),
                    trailer_url = table.Column<string>(type: "text", nullable: true),
                    release_date = table.Column<DateOnly>(type: "date", nullable: true),
                    rating_score = table.Column<decimal>(type: "numeric", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movies", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "seattypes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    color_code = table.Column<string>(type: "text", nullable: false),
                    extra_price = table.Column<decimal>(type: "numeric", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seattypes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "snacks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    image_url = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_snacks", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: false),
                    phone = table.Column<string>(type: "text", nullable: true),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    auth_provider = table.Column<string>(type: "text", nullable: false),
                    clerk_id = table.Column<string>(type: "text", nullable: true),
                    avatar_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "auditoriums",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cinema_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    hall_type = table.Column<string>(type: "text", nullable: false),
                    total_rows = table.Column<int>(type: "integer", nullable: true),
                    total_columns = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoriums", x => x.id);
                    table.ForeignKey(
                        name: "FK_auditoriums_cinemas_cinema_id",
                        column: x => x.cinema_id,
                        principalTable: "cinemas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "movieactors",
                columns: table => new
                {
                    movie_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    character_name = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movieactors", x => new { x.movie_id, x.actor_id });
                    table.ForeignKey(
                        name: "FK_movieactors_actors_actor_id",
                        column: x => x.actor_id,
                        principalTable: "actors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_movieactors_movies_movie_id",
                        column: x => x.movie_id,
                        principalTable: "movies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "moviedirectors",
                columns: table => new
                {
                    movie_id = table.Column<Guid>(type: "uuid", nullable: false),
                    director_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moviedirectors", x => new { x.movie_id, x.director_id });
                    table.ForeignKey(
                        name: "FK_moviedirectors_directors_director_id",
                        column: x => x.director_id,
                        principalTable: "directors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_moviedirectors_movies_movie_id",
                        column: x => x.movie_id,
                        principalTable: "movies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "moviegenres",
                columns: table => new
                {
                    movie_id = table.Column<Guid>(type: "uuid", nullable: false),
                    genre_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moviegenres", x => new { x.movie_id, x.genre_id });
                    table.ForeignKey(
                        name: "FK_moviegenres_genres_genre_id",
                        column: x => x.genre_id,
                        principalTable: "genres",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_moviegenres_movies_movie_id",
                        column: x => x.movie_id,
                        principalTable: "movies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cinemasnacks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cinema_id = table.Column<Guid>(type: "uuid", nullable: false),
                    snack_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price = table.Column<decimal>(type: "numeric", nullable: false),
                    is_available = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cinemasnacks", x => x.id);
                    table.ForeignKey(
                        name: "FK_cinemasnacks_cinemas_cinema_id",
                        column: x => x.cinema_id,
                        principalTable: "cinemas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cinemasnacks_snacks_snack_id",
                        column: x => x.snack_id,
                        principalTable: "snacks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    booking_code = table.Column<string>(type: "text", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.id);
                    table.ForeignKey(
                        name: "FK_bookings_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "userroles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_userroles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "FK_userroles_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_userroles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "seats",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    auditorium_id = table.Column<Guid>(type: "uuid", nullable: false),
                    seat_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    row_label = table.Column<string>(type: "text", nullable: false),
                    column_number = table.Column<int>(type: "integer", nullable: false),
                    seat_code = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seats", x => x.id);
                    table.ForeignKey(
                        name: "FK_seats_auditoriums_auditorium_id",
                        column: x => x.auditorium_id,
                        principalTable: "auditoriums",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_seats_seattypes_seat_type_id",
                        column: x => x.seat_type_id,
                        principalTable: "seattypes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "showtimes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    movie_id = table.Column<Guid>(type: "uuid", nullable: false),
                    auditorium_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    base_price = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showtimes", x => x.id);
                    table.ForeignKey(
                        name: "FK_showtimes_auditoriums_auditorium_id",
                        column: x => x.auditorium_id,
                        principalTable: "auditoriums",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_showtimes_movies_movie_id",
                        column: x => x.movie_id,
                        principalTable: "movies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bookingsnacks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    booking_id = table.Column<Guid>(type: "uuid", nullable: false),
                    cinema_snack_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookingsnacks", x => x.id);
                    table.ForeignKey(
                        name: "FK_bookingsnacks_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_bookingsnacks_cinemasnacks_cinema_snack_id",
                        column: x => x.cinema_snack_id,
                        principalTable: "cinemasnacks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    booking_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "text", nullable: false),
                    method = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    transaction_ref = table.Column<string>(type: "text", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: false),
                    paid_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_payments_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "showtimeseats",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    showtime_id = table.Column<Guid>(type: "uuid", nullable: false),
                    seat_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showtimeseats", x => x.id);
                    table.ForeignKey(
                        name: "FK_showtimeseats_seats_seat_id",
                        column: x => x.seat_id,
                        principalTable: "seats",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_showtimeseats_showtimes_showtime_id",
                        column: x => x.showtime_id,
                        principalTable: "showtimes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tickets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    booking_id = table.Column<Guid>(type: "uuid", nullable: false),
                    showtime_seat_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price = table.Column<decimal>(type: "numeric", nullable: false),
                    qr_code = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tickets", x => x.id);
                    table.ForeignKey(
                        name: "FK_tickets_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tickets_showtimeseats_showtime_seat_id",
                        column: x => x.showtime_seat_id,
                        principalTable: "showtimeseats",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_auditoriums_cinema_id",
                table: "auditoriums",
                column: "cinema_id");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_booking_code",
                table: "bookings",
                column: "booking_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_user_id",
                table: "bookings",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_bookingsnacks_booking_id",
                table: "bookingsnacks",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_bookingsnacks_cinema_snack_id",
                table: "bookingsnacks",
                column: "cinema_snack_id");

            migrationBuilder.CreateIndex(
                name: "IX_cinemasnacks_cinema_id_snack_id",
                table: "cinemasnacks",
                columns: new[] { "cinema_id", "snack_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cinemasnacks_snack_id",
                table: "cinemasnacks",
                column: "snack_id");

            migrationBuilder.CreateIndex(
                name: "IX_movieactors_actor_id",
                table: "movieactors",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "IX_moviedirectors_director_id",
                table: "moviedirectors",
                column: "director_id");

            migrationBuilder.CreateIndex(
                name: "IX_moviegenres_genre_id",
                table: "moviegenres",
                column: "genre_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_booking_id",
                table: "payments",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_seats_auditorium_id_row_label_column_number",
                table: "seats",
                columns: new[] { "auditorium_id", "row_label", "column_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_seats_auditorium_id_seat_code",
                table: "seats",
                columns: new[] { "auditorium_id", "seat_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_seats_seat_type_id",
                table: "seats",
                column: "seat_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_showtimes_auditorium_id",
                table: "showtimes",
                column: "auditorium_id");

            migrationBuilder.CreateIndex(
                name: "IX_showtimes_movie_id",
                table: "showtimes",
                column: "movie_id");

            migrationBuilder.CreateIndex(
                name: "IX_showtimeseats_seat_id",
                table: "showtimeseats",
                column: "seat_id");

            migrationBuilder.CreateIndex(
                name: "IX_showtimeseats_showtime_id_seat_id",
                table: "showtimeseats",
                columns: new[] { "showtime_id", "seat_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tickets_booking_id",
                table: "tickets",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_showtime_seat_id",
                table: "tickets",
                column: "showtime_seat_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_userroles_role_id",
                table: "userroles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true,
                filter: "\"deleted_at\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bookingsnacks");

            migrationBuilder.DropTable(
                name: "movieactors");

            migrationBuilder.DropTable(
                name: "moviedirectors");

            migrationBuilder.DropTable(
                name: "moviegenres");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "tickets");

            migrationBuilder.DropTable(
                name: "userroles");

            migrationBuilder.DropTable(
                name: "cinemasnacks");

            migrationBuilder.DropTable(
                name: "actors");

            migrationBuilder.DropTable(
                name: "directors");

            migrationBuilder.DropTable(
                name: "genres");

            migrationBuilder.DropTable(
                name: "bookings");

            migrationBuilder.DropTable(
                name: "showtimeseats");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "snacks");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "seats");

            migrationBuilder.DropTable(
                name: "showtimes");

            migrationBuilder.DropTable(
                name: "seattypes");

            migrationBuilder.DropTable(
                name: "auditoriums");

            migrationBuilder.DropTable(
                name: "movies");

            migrationBuilder.DropTable(
                name: "cinemas");
        }
    }
}
