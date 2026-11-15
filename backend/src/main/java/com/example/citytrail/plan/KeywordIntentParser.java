package com.example.citytrail.plan;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Offline fallback: finds keywords in the text and emits one slot per matching rule, ordered by where the
 * first keyword appears. Keywords match at the start of a word, so "cafe" also matches "cafes" and
 * "thrift" matches "thriftshop". Tags from every matching keyword of a rule are merged into that rule's slot.
 */
@Component
public class KeywordIntentParser implements IntentParser {

    private record Rule(String category, Map<String, List<String>> keywordTags) {
    }

    private static final List<String> NONE = List.of();

    private static final List<Rule> RULES = List.of(
            new Rule("food", Map.ofEntries(
                    Map.entry("coffee", List.of("coffee")),
                    Map.entry("café", List.of("coffee")),
                    Map.entry("cafe", List.of("coffee")),
                    Map.entry("caff", List.of("coffee")),
                    Map.entry("espresso", List.of("coffee")),
                    Map.entry("kawa", List.of("coffee")),
                    Map.entry("kawiarn", List.of("coffee")))),
            new Rule("food", Map.ofEntries(
                    Map.entry("milk bar", List.of("budget", "polish")),
                    Map.entry("bar mleczny", List.of("budget", "polish")),
                    Map.entry("pierogi", List.of("pierogi")),
                    Map.entry("cheap eat", List.of("budget")))),
            new Rule("food", Map.ofEntries(
                    Map.entry("restaurant", NONE),
                    Map.entry("restaurac", NONE),
                    Map.entry("dinner", NONE),
                    Map.entry("lunch", List.of("quick-lunch")),
                    Map.entry("brunch", NONE),
                    Map.entry("dessert", List.of("dessert")),
                    Map.entry("hungry", NONE),
                    Map.entry("food", NONE),
                    Map.entry("obiad", NONE))),
            new Rule("store", Map.ofEntries(
                    Map.entry("thrift", List.of("thrift")),
                    Map.entry("second hand", List.of("thrift")),
                    Map.entry("second-hand", List.of("thrift")),
                    Map.entry("secondhand", List.of("thrift")),
                    Map.entry("vintage", List.of("vintage")),
                    Map.entry("lumpeks", List.of("thrift")),
                    Map.entry("szmateks", List.of("thrift")))),
            new Rule("store", Map.ofEntries(
                    Map.entry("book", List.of("books")),
                    Map.entry("antykwariat", List.of("books")),
                    Map.entry("księgarn", List.of("books")),
                    Map.entry("ksiegarn", List.of("books")))),
            new Rule("store", Map.ofEntries(
                    Map.entry("furniture", List.of("furniture")),
                    Map.entry("meble", List.of("furniture")))),
            new Rule("store", Map.ofEntries(
                    Map.entry("flea", List.of("flea-market")))),
            new Rule("store", Map.ofEntries(
                    Map.entry("design", List.of("design")),
                    Map.entry("concept store", List.of("design")),
                    Map.entry("gift", List.of("gifts")),
                    Map.entry("souvenir", List.of("gifts")))),
            new Rule("event", Map.ofEntries(
                    Map.entry("rock", List.of("rock")),
                    Map.entry("metal", List.of("metal")),
                    Map.entry("punk", List.of("rock")),
                    Map.entry("indie", List.of("indie")),
                    Map.entry("jazz", List.of("jazz")),
                    Map.entry("electronic", List.of("electronic")),
                    Map.entry("techno", List.of("electronic")),
                    Map.entry("gig", List.of("concert")),
                    Map.entry("concert", List.of("concert")),
                    Map.entry("koncert", List.of("concert")),
                    Map.entry("live music", List.of("concert")),
                    Map.entry("music", List.of("concert")),
                    Map.entry("event", NONE))),
            new Rule("event", Map.ofEntries(
                    Map.entry("opera", List.of("opera")),
                    Map.entry("ballet", List.of("ballet")),
                    Map.entry("theatre", List.of("theatre")),
                    Map.entry("theater", List.of("theatre")),
                    Map.entry("teatr", List.of("theatre")),
                    Map.entry("classical", List.of("classical")),
                    Map.entry("philharmon", List.of("classical")),
                    Map.entry("filharmon", List.of("classical")),
                    Map.entry("symphon", List.of("classical")))),
            new Rule("event", Map.ofEntries(
                    Map.entry("museum", List.of("museum")),
                    Map.entry("muzeum", List.of("museum")),
                    Map.entry("exhibition", List.of("museum")))),
            new Rule("landmark", Map.ofEntries(
                    Map.entry("sightsee", List.of("historic")),
                    Map.entry("landmark", NONE),
                    Map.entry("historic", List.of("historic")),
                    Map.entry("monument", List.of("historic")),
                    Map.entry("church", List.of("church")),
                    Map.entry("cathedral", List.of("church")),
                    Map.entry("basilica", List.of("church")),
                    Map.entry("westerplatte", List.of("ww2")),
                    Map.entry("ww2", List.of("ww2")))));

    private static final List<String> HOME_KEYWORDS = List.of("home", "hotel", "back to", "way back", "return");

    private final IntentVocabulary vocabulary;

    public KeywordIntentParser(IntentVocabulary vocabulary) {
        this.vocabulary = vocabulary;
    }

    @Override
    public Intent parse(String text) {
        record Hit(int index, Slot slot) {
        }

        List<Hit> hits = new ArrayList<>();
        for (Rule rule : RULES) {
            int first = Integer.MAX_VALUE;
            Set<String> tags = new LinkedHashSet<>();
            for (Map.Entry<String, List<String>> entry : rule.keywordTags().entrySet()) {
                Matcher matcher = wordStart(entry.getKey()).matcher(text);
                if (matcher.find()) {
                    first = Math.min(first, matcher.start());
                    tags.addAll(entry.getValue());
                }
            }
            if (first != Integer.MAX_VALUE) {
                hits.add(new Hit(first, new Slot(rule.category(), vocabulary.filterTags(tags))));
            }
        }
        hits.sort(Comparator.comparingInt(Hit::index));

        List<Slot> slots = hits.stream()
                .map(Hit::slot)
                .limit(IntentVocabulary.MAX_SLOTS)
                .toList();

        boolean returnHome = HOME_KEYWORDS.stream().anyMatch(k -> wordStart(k).matcher(text).find());
        return new Intent(slots, returnHome);
    }

    private static Pattern wordStart(String keyword) {
        return Pattern.compile("(?<![\\p{L}])" + Pattern.quote(keyword),
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }
}
