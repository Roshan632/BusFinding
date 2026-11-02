
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(20) NOT NULL DEFAULT 'passenger'
        CHECK (role IN ('passenger', 'driver', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),
    terms_accepted_at TIMESTAMPTZ,
    profile_photo_url TEXT,
    driver_license_url TEXT,
    bus_plate_number VARCHAR(50),
    nid_front_url TEXT,
    nid_back_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS driver_license_url TEXT,
    ADD COLUMN IF NOT EXISTS bus_plate_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS nid_front_url TEXT,
    ADD COLUMN IF NOT EXISTS nid_back_url TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS driver_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT
);

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    start_location VARCHAR(150) NOT NULL,
    end_location VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    route_name VARCHAR(150) NOT NULL,
    start_location VARCHAR(150) NOT NULL,
    end_location VARCHAR(150) NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    stop_name VARCHAR(150),
    stop_time TIME,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bus_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    stop_id UUID NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL CHECK (stop_order > 0),
    scheduled_minutes_from_start INTEGER,
    PRIMARY KEY (route_id, stop_id),
    UNIQUE (route_id, stop_order)
);

CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number VARCHAR(50) NOT NULL UNIQUE,
    registration_number VARCHAR(50) UNIQUE,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive'
        CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE buses
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE buses SET updated_at = NOW() WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bus_locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh REAL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bus_stops_location
    ON bus_stops USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_bus_locations_location
    ON bus_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_bus_locations_trip_time
    ON bus_locations (trip_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_active
    ON trips (status) WHERE status = 'active';
