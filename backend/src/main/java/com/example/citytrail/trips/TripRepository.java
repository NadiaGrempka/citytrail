package com.example.citytrail.trips;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Saved trips in the embedded H2 database (see schema.sql). Data lives until the backend stops. */
@Repository
public class TripRepository {

    private static final String COLUMNS =
            "id, title, stop_ids, return_home, start_lat, start_lng, prompt, created_at";

    private final JdbcClient jdbc;

    public TripRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Trip insert(String title, List<String> stopIds, boolean returnHome,
                       double startLat, double startLng, String prompt) {
        String id = UUID.randomUUID().toString();
        jdbc.sql("INSERT INTO trips (" + COLUMNS + ") VALUES (:id, :title, :stops, :home, :lat, :lng, :prompt, :created)")
                .param("id", id)
                .param("title", title)
                .param("stops", String.join(",", stopIds))
                .param("home", returnHome)
                .param("lat", startLat)
                .param("lng", startLng)
                .param("prompt", prompt)
                .param("created", System.currentTimeMillis())
                .update();
        return findById(id).orElseThrow();
    }

    public List<Trip> findAll() {
        return jdbc.sql("SELECT " + COLUMNS + " FROM trips ORDER BY created_at DESC")
                .query(TripRepository::map)
                .list();
    }

    public Optional<Trip> findById(String id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM trips WHERE id = :id")
                .param("id", id)
                .query(TripRepository::map)
                .optional();
    }

    /** True when a trip with this id existed and was renamed. */
    public boolean rename(String id, String title) {
        return jdbc.sql("UPDATE trips SET title = :title WHERE id = :id")
                .param("title", title)
                .param("id", id)
                .update() > 0;
    }

    /** True when a trip with this id existed and was removed. */
    public boolean delete(String id) {
        return jdbc.sql("DELETE FROM trips WHERE id = :id").param("id", id).update() > 0;
    }

    /** Removes every saved trip and returns how many there were. */
    public int deleteAll() {
        return jdbc.sql("DELETE FROM trips").update();
    }

    private static Trip map(ResultSet rs, int row) throws SQLException {
        String stops = rs.getString("stop_ids");
        return new Trip(
                rs.getString("id"),
                rs.getString("title"),
                stops.isBlank() ? List.of() : Arrays.asList(stops.split(",")),
                rs.getBoolean("return_home"),
                rs.getDouble("start_lat"),
                rs.getDouble("start_lng"),
                rs.getString("prompt"),
                Instant.ofEpochMilli(rs.getLong("created_at")).toString());
    }
}
