# CityTrail (working title)

Tell the app what you feel like doing in Gdańsk ("a local café, a thrift shop, then a rock gig and a ride home")
and it plans the stops on a map. A district on the map "unlocks" (turns colourful) once you have visited it.

- **Backend:** Java 21, Spring Boot 4.1, Maven. Serves the mock dataset and (later) the planner.
- **Frontend:** React 19 + TypeScript on Vite+ (`vp`), MapLibre GL for the map, `motion` for animation.
- **Data:** 31 mock places in `backend/src/main/resources/data/gdansk_places.json`
  (see the `meta.notes` block in that file for what is real and what is mocked).

## Structure

```
.
├── backend/                          Spring Boot app
│   ├── pom.xml
│   └── src
│       ├── main/java/com/example/citytrail
│       │   ├── CityTrailApplication.java
│       │   ├── config/WebConfig.java        CORS for the Vite dev origin
│       │   ├── places/                      records, PlaceRepository, GET /api/places etc.
│       │   ├── plan/                        POST /api/plan: intent parsing + planner
│       │   └── trips/                       CRUD for saved trips (H2 in memory, JdbcClient)
│       ├── main/resources
│       │   ├── application.yml
│       │   ├── prompts/intent-system.txt    system prompt for the LLM parser
│       │   └── data/gdansk_places.json      the mock dataset
│       └── test/java/...                    PlaceRepositoryTest, KeywordIntentParserTest, PlannerTest
└── frontend/                         Vite+ React app
    ├── vite.config.ts                       dev proxy: /api -> http://localhost:8080
    └── src
        ├── api/client.ts                    typed fetch helpers
        ├── features/map/MapView.tsx         MapLibre map + place markers
        ├── features/chat/ChatBox.tsx        prompt box, posts to /api/plan
        ├── config.ts                        map style URL, centre, zoom
        └── types.ts                         TypeScript mirror of the dataset
```

## Prerequisites

- JDK 21 (or 17: change `java.version` in `backend/pom.xml`)
- Maven 3.9+ (or just open `backend/` in IntelliJ, which bundles Maven)
- Node.js 22+ and npm
- Optional: the global Vite+ CLI, `curl -fsSL https://vite.plus | bash`, then `vp help`

## Run it

Two terminals.

**1. Backend**

```bash
cd backend
mvn spring-boot:run        # or run CityTrailApplication from IntelliJ
```

Check it: <http://localhost:8080/api/places> returns 31 places, and <http://localhost:8080/actuator/health> returns `UP`.

Run the tests with `mvn test`.

Optional: add the Maven wrapper so teammates do not need Maven installed: `mvn -N wrapper:wrapper`.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev                # same as `vp dev`
```

Open <http://localhost:5173>. The pill in the top-right should say "31 places loaded from the backend"
and the map should show a marker per place. Type something like "a local cafe, a thrift shop, a rock gig and a ride home" in the prompt box
and the planned stops appear under it.

Other commands: `npm run build`, `npm run lint` (Vite+ runs Oxlint), `npm run preview`.

## API

| Method | Path                      | Notes                                              |
|--------|---------------------------|----------------------------------------------------|
| GET    | `/api/places`             | all places; optional `?category=food\|store\|event\|landmark` |
| GET    | `/api/places/{id}`        | one place, 404 if unknown                          |
| GET    | `/api/districts`          | districts used for the unlock mechanic             |
| POST   | `/api/plan`               | body `{ "text", "startLat?", "startLng?", "startTime?", "walkPace?": "slow\|normal\|fast" }`, returns a `Plan` (stops, times, legs, return leg, warnings); 400 with a message if nothing can be planned |
| GET    | `/api/trips`              | saved trips, newest first                          |
| POST   | `/api/trips`              | save a trip: `{ "stopIds": [...], "returnHome?", "title?", "startLat?", "startLng?", "prompt?" }`; 201 with the trip; 400 if no known stop |
| GET    | `/api/trips/{id}`         | the trip plus its re-planned `Plan`; 404 if unknown |
| PATCH  | `/api/trips/{id}`         | rename: `{ "title" }`                              |
| DELETE | `/api/trips/{id}`         | remove, 204                                        |
| DELETE | `/api/trips`              | remove all saved trips, 204                        |
| GET    | `/api/info`               | `{ aiParser, model }`: which intent parser is active |
| GET    | `/actuator/health`        | liveness                                           |

## How planning works

1. **Intent parsing** turns the text into ordered slots, e.g. `[food:coffee, store:thrift, event:rock]` plus `returnHome`.
   - `KeywordIntentParser` always works offline (English and a few Polish keywords).
   - `LlmIntentParser` is optional. If it is enabled and fails or returns nothing, the keyword parser is used.
     The model's JSON is never trusted: categories and tags are checked against the dataset (`IntentVocabulary`).
2. **Planner** (plain code, no AI) picks real places. An event slot is chosen first and becomes the anchor: the plan
   is scheduled on that event's day and the other stops are chosen near the venue. Without an event, each stop is
   chosen near the previous one. Travel is estimated from distance and each place's mocked nearest stop.
3. The response says which parser was used (`parsedBy`: `llm` or `keyword`).

## What to type

Without the LLM, the keyword parser reads your sentence. Stops are planned in the order you mention them.

- **Kinds of places:** cafe/coffee, restaurant, milk bar, thrift/vintage shop, bookshop, museum, church,
  sightseeing, and events (rock, jazz, opera, theatre, concert...).
- **A specific place by name:** just write it, accents and punctuation optional ("Jozef K", "Dwor Artusa",
  "Golden Gate"). A cafe word next to the name ("Jozef K caffe") does not add a second stop.
- **"Near X":** `a bookshop near Dwor Artusa` or `a park near the museum` picks the stop near that place
  (a named place, or a stop already in your route), not near the previous stop.
- **Nearby:** with no "near", each stop is picked near the previous one. With an event in the plan, the other stops are picked
  near the event venue and the plan runs on the event's day.
- **Follow-ups:** a later message adds stops to the route so far; "New trip" starts over.
- **Ride home:** say "home" or "back to the hotel" to end with a leg back to your start point.

Examples: `Jozef K, then a nearby museum` / `a coffee, a thrift shop, a rock gig and a ride home` /
`Dwor Artusa and then a milk bar`.

## The trail on the map

After a plan comes back, the frontend draws the route start -> stops (A, B, C...) -> home. Walking legs follow
real streets, looked up from the free OpenStreetMap community walking router
(`routing.openstreetmap.de/routed-foot`, no key, fair-use; see `frontend/src/api/routing.ts`). Transit legs, and any
walking leg whose lookup fails, are drawn as dashed straight lines. For real traffic, host your own OSRM or Valhalla
and change `FOOT_ROUTER`.

## Saved trips and the database

Saved trips live in an embedded in-memory H2 database (`schema.sql`, accessed with Spring's `JdbcClient`), so there is
nothing to install. They are lost when the backend stops, which the task allows. Only the stop ids are stored; opening a
trip re-plans it (`parsedBy: "saved"`). In the app: "Save trip" under a plan, then burger menu, "My trips" to open,
rename or delete. Each plan also shows a rough CO₂ comparison against driving the same legs (estimated factors in
`frontend/src/features/chat/eco.ts`).

## Settings

Burger menu, "Settings" (kept in `localStorage`): start location (your location or ul. Długa 11), trip start time,
walking pace (slow 60, normal 80, fast 100 m/min, used by the backend for walking legs), which parser is active, clearing
saved trips, and resetting the chat panel width. The menu also has the light/dark switch.

## Turning on the AI parser (free tier)

The AI parser switches on by itself when an API key is present; no key means the offline keyword parser.

1. Create a free key at https://console.groq.com (no card needed at the time of writing; check the console for your current limits).
2. Start the backend with the key:

```bash
export CITYTRAIL_LLM_API_KEY=your-key
mvn spring-boot:run
```

The log says `AI intent parser is on: model ...`. Defaults are Groq and `openai/gpt-oss-120b`; if that model name has been retired, pick a current one from the provider's model list and set `CITYTRAIL_LLM_MODEL`. Any OpenAI-compatible endpoint works via `CITYTRAIL_LLM_BASE_URL` (Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`, OpenRouter: `https://openrouter.ai/api/v1`). Set `CITYTRAIL_LLM_ENABLED=false` to force the keyword parser.

The model is given the list of places and the route so far, so it resolves place names ("jozef k"), "near X" and follow-ups ("a park near the museum"). Its answer is sanitized: unknown place ids and tags are dropped. On any error, rate limit or empty answer the keyword parser takes over, and `parsedBy` in the response shows which one ran.

## Next steps (suggested order)

1. Frontend: draw the returned route on the map and animate a marker along it; let the user click the map to set the start point.
2. Fog-of-war: GeoJSON fog polygon with holes for unlocked districts, ids kept in `localStorage`; unlock a district when a stop there is completed.
3. Polish: glass chat card, gradual bottom blur, ticket-style result card, loading and error states.
4. Replace estimated legs with something better only if time allows (the estimates are fine for the demo).

## Discover, saved places and preferences

- **Find something fun** (map, top right) opens Discover: filter pills (tags-based), place cards with a heart, and a detail page with "Show me the way" (sends the place name to the guide) and "Ask the guide".
- Hearted places live in `localStorage` (`citytrail.favorites`) and show on **Saved places**.
- **Your preferences** stores interests (`citytrail.interests`) that reorder Discover.
- The theme toggle is a single round button next to "Find something fun".

## All ways to get there

When a plan has a single destination, the chat lists walking, tram, bus and train options (duration, times, line numbers, changes). Tapping one draws it on the map in a mode colour. Data comes from the free Transitous journey planner (`api.transitous.org`, called from the browser); a mode with no connection is simply left out.
