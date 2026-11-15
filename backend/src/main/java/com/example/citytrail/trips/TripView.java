package com.example.citytrail.trips;

import com.example.citytrail.plan.Plan;

/** A saved trip together with its freshly computed plan. */
public record TripView(Trip trip, Plan plan) {
}
