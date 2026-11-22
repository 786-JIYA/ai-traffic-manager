
-- 1. Store monitored intersections
CREATE TABLE IF NOT EXISTS intersections (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    intersection_key VARCHAR(100) NOT NULL UNIQUE,

    name VARCHAR(200) NOT NULL,

    location TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. Store approaches belonging to intersections
CREATE TABLE IF NOT EXISTS approaches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    intersection_id BIGINT NOT NULL
        REFERENCES intersections(id)
        ON DELETE RESTRICT,

    approach_key VARCHAR(100) NOT NULL,

    name VARCHAR(150) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_intersection_approach
        UNIQUE (intersection_id, approach_key)
);


-- 3. Store periodic traffic analytics
CREATE TABLE IF NOT EXISTS traffic_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    approach_id BIGINT NOT NULL
        REFERENCES approaches(id)
        ON DELETE RESTRICT,

    total_vehicles INTEGER NOT NULL
        CHECK (total_vehicles >= 0),

    waiting_vehicles INTEGER NOT NULL
        CHECK (waiting_vehicles >= 0),

    moving_vehicles INTEGER NOT NULL
        CHECK (moving_vehicles >= 0),

    arrival_rate NUMERIC(10, 2) NOT NULL
        CHECK (arrival_rate >= 0),

    congestion_level VARCHAR(20) NOT NULL
        CHECK (
            congestion_level IN ('low', 'medium', 'high')
        ),

    observed_at TIMESTAMPTZ NOT NULL,

    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_vehicle_count
        CHECK (
            total_vehicles = waiting_vehicles + moving_vehicles
        )
);


-- Indexes for historical traffic queries
CREATE INDEX IF NOT EXISTS idx_approaches_intersection
ON approaches(intersection_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_approach_time
ON traffic_snapshots(approach_id, observed_at DESC);
