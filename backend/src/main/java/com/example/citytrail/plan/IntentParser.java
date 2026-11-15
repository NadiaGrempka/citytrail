package com.example.citytrail.plan;

public interface IntentParser {

    /** Turns free text into an Intent. May throw a RuntimeException if it cannot (callers fall back). */
    Intent parse(String text);
}
