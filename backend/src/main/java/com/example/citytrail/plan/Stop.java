package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.UpcomingEvent;

import java.util.List;

public record Stop(
        Place place,
        String arrive,
        String depart,
        Leg legFromPrevious,
        UpcomingEvent event,
        List<String> notes) {
}
