package com.example.citytrail.plan;

import java.util.List;

/** What the visitor wants: ordered stops, and whether the plan should end with a ride back to the start point. */
public record Intent(List<Slot> slots, boolean returnHome) {
}
