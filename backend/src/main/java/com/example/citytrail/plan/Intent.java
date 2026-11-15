package com.example.citytrail.plan;

import java.util.List;

public record Intent(List<Slot> slots, boolean returnHome) {
}
