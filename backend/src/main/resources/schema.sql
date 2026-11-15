CREATE TABLE IF NOT EXISTS trips (
    id          VARCHAR(36)  PRIMARY KEY,
    title       VARCHAR(80)  NOT NULL,
    stop_ids    VARCHAR(500) NOT NULL,
    return_home BOOLEAN      NOT NULL,
    start_lat   DOUBLE       NOT NULL,
    start_lng   DOUBLE       NOT NULL,
    prompt      VARCHAR(500),
    created_at  BIGINT       NOT NULL
);
