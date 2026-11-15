package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
                    Map.entry("park", List.of("park")),
                    Map.entry("garden", List.of("green")),
                    Map.entry("green space", List.of("green")),
                    Map.entry("greenery", List.of("green")),
                    Map.entry("nature", List.of("green")))),
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

    private static final int NAME_REACH = 15;

    private final IntentVocabulary vocabulary;
    private final PlaceRepository repository;

    public KeywordIntentParser(IntentVocabulary vocabulary, PlaceRepository repository) {
        this.vocabulary = vocabulary;
        this.repository = repository;
    }

    @Override
    public Intent parse(String text) {
        record Hit(int index, Slot slot) {
        }

        record Named(int start, int end, Place place) {
        }

        List<Hit> hits = new ArrayList<>();
        List<Named> named = new ArrayList<>();
        String folded = fold(text);
        for (Place place : repository.findAll()) {
            for (Pattern pattern : namePatterns(place.name())) {
                Matcher matcher = pattern.matcher(folded);
                if (matcher.find()) {
                    named.add(new Named(matcher.start(), matcher.end(), place));
                    hits.add(new Hit(matcher.start(), new Slot(place.category(), List.of(), place.id())));
                    break;
                }
            }
        }

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
            final int keywordAt = first;
            boolean describesNamedPlace = named.stream().anyMatch(n -> n.place().category().equals(rule.category())
                    && keywordAt >= n.start() - NAME_REACH && keywordAt <= n.end() + NAME_REACH);
            if (first != Integer.MAX_VALUE && !describesNamedPlace) {
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

    public Place findNamedPlace(String text) {
        String folded = fold(text);
        for (Place place : repository.findAll()) {
            for (Pattern pattern : namePatterns(place.name())) {
                if (pattern.matcher(folded).find()) {
                    return place;
                }
            }
        }
        return null;
    }

    private static String fold(String text) {
        String decomposed = Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}+", "").replace('ł', 'l');
    }

    private static List<Pattern> namePatterns(String name) {
        Set<String> variants = new LinkedHashSet<>();
        variants.add(name);
        variants.add(name.replaceAll("\\(.*?\\)", " ").split("&")[0]);
        Matcher bracketed = Pattern.compile("\\((.*?)\\)").matcher(name);
        while (bracketed.find()) {
            variants.add(bracketed.group(1));
        }

        List<Pattern> patterns = new ArrayList<>();
        for (String variant : variants) {
            String[] tokens = fold(variant).replaceAll("[^a-z0-9]+", " ").trim().split(" ");
            if (tokens.length == 1 && tokens[0].length() < 3) {
                continue;
            }
            patterns.add(Pattern.compile("(?<![a-z0-9])" + String.join("[^a-z0-9]+", tokens) + "(?![a-z0-9])"));
        }
        return patterns;
    }

    private static Pattern wordStart(String keyword) {
        return Pattern.compile("(?<![\\p{L}])" + Pattern.quote(keyword),
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }
}
