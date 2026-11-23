
-- Store every signal state reported by the Python simulation
CREATE TABLE IF NOT EXISTS signal_state_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    intersection_id BIGINT NOT NULL
        REFERENCES intersections(id)
        ON DELETE RESTRICT,

    active_approach_id BIGINT
        REFERENCES approaches(id)
        ON DELETE RESTRICT,

    signal_state VARCHAR(20) NOT NULL
        CHECK (
            signal_state IN ('GREEN', 'YELLOW', 'ALL_RED')
        ),

    green_duration_seconds INTEGER
        CHECK (
            green_duration_seconds IS NULL
            OR green_duration_seconds BETWEEN 10 AND 60
        ),

    elapsed_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (elapsed_seconds >= 0),

    simulation_mode BOOLEAN NOT NULL DEFAULT TRUE,

    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_active_approach CHECK (
        (signal_state = 'ALL_RED' AND active_approach_id IS NULL)
        OR
        (signal_state IN ('GREEN', 'YELLOW')
            AND active_approach_id IS NOT NULL)
    )
);

-- Quickly retrieve the latest signal state for an intersection
CREATE INDEX IF NOT EXISTS idx_signal_history_intersection_time
ON signal_state_history(intersection_id, observed_at DESC);
