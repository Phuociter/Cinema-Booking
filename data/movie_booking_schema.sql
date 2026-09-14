-- ============================================================
-- MOVIE TICKET BOOKING APP - PRODUCTION-READY SCHEMA (PostgreSQL)
-- 21 tables. Soft delete applied ONLY to master/reference tables
-- referenced by financial transactions (see note below).
--
-- Soft delete tables (deleted_at): Users, Movies, Cinemas,
--   Auditoriums, Snacks, CinemaSnacks, SeatTypes
-- Hard-delete/relational tables (CASCADE as normal): Genres, Actors,
--   Directors, Roles, MovieGenres, MovieActors, MovieDirectors,
--   UserRoles, Seats
-- Transactional tables (use `status`, never delete): Showtimes,
--   ShowtimeSeats, Bookings, Tickets, Payments
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- GROUP 1 (Dev A): MOVIE CONTENT
-- ============================================================

CREATE TABLE Movies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    original_title  VARCHAR(255),
    overview        TEXT,
    duration_min    INT NOT NULL CHECK (duration_min > 0),
    age_rating      VARCHAR(10),
    poster_url      TEXT,
    backdrop_url    TEXT,
    trailer_url     TEXT,
    release_date    DATE,
    rating_score    NUMERIC(3,1),
    status          VARCHAR(20) DEFAULT 'coming_soon', -- coming_soon, now_showing, ended
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE Genres (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE MovieGenres (
    movie_id        UUID NOT NULL REFERENCES Movies(id) ON DELETE CASCADE,
    genre_id        UUID NOT NULL REFERENCES Genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE Directors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    photo_url       TEXT
);

CREATE TABLE MovieDirectors (
    movie_id        UUID NOT NULL REFERENCES Movies(id) ON DELETE CASCADE,
    director_id     UUID NOT NULL REFERENCES Directors(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, director_id)
);

-- ============================================================
-- GROUP 2 (Dev B): ACTORS & CINEMA
-- ============================================================

CREATE TABLE Actors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    profile_path    TEXT
);

CREATE TABLE MovieActors (
    movie_id        UUID NOT NULL REFERENCES Movies(id) ON DELETE CASCADE,
    actor_id        UUID NOT NULL REFERENCES Actors(id) ON DELETE CASCADE,
    character_name  VARCHAR(150),
    PRIMARY KEY (movie_id, actor_id)
);

CREATE TABLE Cinemas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    address         VARCHAR(255),
    city            VARCHAR(100),
    hotline         VARCHAR(20),
    image_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE Auditoriums (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cinema_id       UUID NOT NULL REFERENCES Cinemas(id) ON DELETE RESTRICT,
    name            VARCHAR(50) NOT NULL,
    hall_type       VARCHAR(20) DEFAULT '2D',
    -- total_rows/total_columns: UI layout metadata only (grid drawing),
    -- not the source of truth for seat positions (see Seats table)
    total_rows      INT,
    total_columns   INT,
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- GROUP 3 (Dev C): SHOWTIME & SEATS
-- ============================================================

CREATE TABLE Showtimes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id        UUID NOT NULL REFERENCES Movies(id) ON DELETE RESTRICT,
    auditorium_id   UUID NOT NULL REFERENCES Auditoriums(id) ON DELETE RESTRICT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    base_price      NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, cancelled, completed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time),
    CONSTRAINT no_overlapping_showtimes
        EXCLUDE USING gist (
            auditorium_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        )
);

CREATE TABLE SeatTypes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,
    color_code      VARCHAR(10) DEFAULT '#FFFFFF',
    extra_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE Seats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditorium_id   UUID NOT NULL REFERENCES Auditoriums(id) ON DELETE CASCADE,
    seat_type_id    UUID NOT NULL REFERENCES SeatTypes(id) ON DELETE RESTRICT,
    row_label       VARCHAR(5) NOT NULL,
    column_number   INT NOT NULL,
    seat_code       VARCHAR(10) NOT NULL,
    UNIQUE (auditorium_id, seat_code),
    UNIQUE (auditorium_id, row_label, column_number)
);

CREATE TABLE ShowtimeSeats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id     UUID NOT NULL REFERENCES Showtimes(id) ON DELETE CASCADE,
    seat_id         UUID NOT NULL REFERENCES Seats(id) ON DELETE CASCADE,
    -- Durable states only: available, reserved (paid).
    -- Temporary hold ("locked") is managed in Redis (key: showtime:{id}:seat:{id}, TTL 5min),
    -- not written to Postgres to avoid write contention during high-demand sales.
    status          VARCHAR(20) NOT NULL DEFAULT 'available',
    UNIQUE (showtime_id, seat_id)
);

-- ============================================================
-- GROUP 4 (Dev D): BOOKING & SNACKS
-- ============================================================

CREATE TABLE Snacks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    image_url       TEXT,
    description     TEXT,
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- Per-cinema menu & pricing (snack prices/availability vary by location)
CREATE TABLE CinemaSnacks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cinema_id       UUID NOT NULL REFERENCES Cinemas(id) ON DELETE RESTRICT,
    snack_id        UUID NOT NULL REFERENCES Snacks(id) ON DELETE RESTRICT,
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_available    BOOLEAN NOT NULL DEFAULT true,
    deleted_at      TIMESTAMPTZ DEFAULT NULL,
    UNIQUE (cinema_id, snack_id)
);

CREATE TABLE Bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,                -- FK -> Users.id (added below, ON DELETE RESTRICT)
    booking_code    VARCHAR(20) NOT NULL UNIQUE,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, cancelled
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE Tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID NOT NULL REFERENCES Bookings(id) ON DELETE CASCADE,
    showtime_seat_id    UUID NOT NULL REFERENCES ShowtimeSeats(id) ON DELETE RESTRICT,
    price               NUMERIC(10,2) NOT NULL,
    qr_code             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (showtime_seat_id)
);

CREATE TABLE BookingSnacks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES Bookings(id) ON DELETE CASCADE,
    cinema_snack_id UUID NOT NULL REFERENCES CinemaSnacks(id) ON DELETE RESTRICT,
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- GROUP 5 (Dev E): USER, AUTH & PAYMENT
-- ============================================================

CREATE TABLE Users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150),
    email           VARCHAR(150) NOT NULL,        -- uniqueness enforced by partial index below
    phone           VARCHAR(20),
    password_hash   TEXT NOT NULL,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- Email must be unique only among active (non-deleted) users,
-- so a soft-deleted account's email can be reused later.
CREATE UNIQUE INDEX uq_users_email_active ON Users(email) WHERE deleted_at IS NULL;

CREATE TABLE Roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE UserRoles (
    user_id         UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES Roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE Payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES Bookings(id) ON DELETE RESTRICT,
    provider        VARCHAR(30) NOT NULL,         -- VNPAY, MOMO, ZALOPAY, STRIPE...
    method          VARCHAR(30) NOT NULL,         -- QR, CC, ATM...
    amount          NUMERIC(12,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, failed
    transaction_ref VARCHAR(100),
    metadata        JSONB DEFAULT '{}'::jsonb,    -- raw webhook payload for reconciliation
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CROSS-GROUP FOREIGN KEYS
-- ============================================================

-- Never CASCADE-delete bookings when a user record is touched
ALTER TABLE Bookings
    ADD CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_movies_status ON Movies(status);
CREATE INDEX idx_movies_deleted_at ON Movies(deleted_at);
CREATE INDEX idx_showtimes_movie ON Showtimes(movie_id);
CREATE INDEX idx_showtimes_auditorium ON Showtimes(auditorium_id);
CREATE INDEX idx_showtimes_start_time ON Showtimes(start_time);
CREATE INDEX idx_showtimeseats_showtime ON ShowtimeSeats(showtime_id);
CREATE INDEX idx_showtimeseats_status ON ShowtimeSeats(status);
CREATE INDEX idx_bookings_user ON Bookings(user_id);
CREATE INDEX idx_bookings_status ON Bookings(status);
CREATE INDEX idx_tickets_booking ON Tickets(booking_id);
CREATE INDEX idx_payments_booking ON Payments(booking_id);
CREATE INDEX idx_auditoriums_cinema ON Auditoriums(cinema_id);
CREATE INDEX idx_auditoriums_deleted_at ON Auditoriums(deleted_at);
CREATE INDEX idx_seats_auditorium ON Seats(auditorium_id);
CREATE INDEX idx_moviedirectors_movie ON MovieDirectors(movie_id);
CREATE INDEX idx_cinemasnacks_cinema ON CinemaSnacks(cinema_id);
CREATE INDEX idx_cinemas_deleted_at ON Cinemas(deleted_at);
CREATE INDEX idx_users_deleted_at ON Users(deleted_at);
CREATE INDEX idx_snacks_deleted_at ON Snacks(deleted_at);
CREATE INDEX idx_seattypes_deleted_at ON SeatTypes(deleted_at);

-- ============================================================
-- TRIGGERS: cascade soft-delete
-- ============================================================

-- When a Cinema is soft-deleted, automatically soft-delete its
-- Auditoriums and CinemaSnacks so orphaned "active" child records
-- don't linger (app layer must not be relied on to do this manually).
CREATE OR REPLACE FUNCTION cascade_soft_delete_cinema()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE Auditoriums SET deleted_at = NEW.deleted_at
            WHERE cinema_id = NEW.id AND deleted_at IS NULL;
        UPDATE CinemaSnacks SET deleted_at = NEW.deleted_at
            WHERE cinema_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cascade_soft_delete_cinema
AFTER UPDATE OF deleted_at ON Cinemas
FOR EACH ROW EXECUTE FUNCTION cascade_soft_delete_cinema();

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO Roles (name) VALUES ('Customer'), ('Staff'), ('Admin');

COMMIT;