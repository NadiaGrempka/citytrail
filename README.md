# CityTrail (working title)

Tell the app what you feel like doing in Gdańsk ("a local café, a thrift shop, then a rock gig and a ride home")
and it plans the stops on a map. A district on the map "unlocks" (turns colourful) once you have visited it.

- **Backend:** Java 21, Spring Boot 4.1, Maven. Serves the mock dataset and (later) the planner.
- **Frontend:** React 19 + TypeScript on Vite+ (`vp`), MapLibre GL for the map, `motion` for animation.
- **Data:** 30 mock places in `backend/src/main/resources/data/gdansk_places.json`
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
│       │   └── plan/                        POST /api/plan: intent parsing + planner
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

Check it: <http://localhost:8080/api/places> returns 30 places, and <http://localhost:8080/actuator/health> returns `UP`.

Run the tests with `mvn test`.

Optional: add the Maven wrapper so teammates do not need Maven installed: `mvn -N wrapper:wrapper`.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev                # same as `vp dev`
```

Open <http://localhost:5173>. The pill in the top-right should say "30 places loaded from the backend"
and the map should show a marker per place. Type something like "a local cafe, a thrift shop, a rock gig and a ride home" in the prompt box
and the planned stops appear under it.

Other commands: `npm run build`, `npm run lint` (Vite+ runs Oxlint), `npm run preview`.

## API

| Method | Path                      | Notes                                              |
|--------|---------------------------|----------------------------------------------------|
| GET    | `/api/places`             | all places; optional `?category=food\|store\|event\|landmark` |
| GET    | `/api/places/{id}`        | one place, 404 if unknown                          |
| GET    | `/api/districts`          | districts used for the unlock mechanic             |
| POST   | `/api/plan`               | body `{ "text", "startLat?", "startLng?", "startTime?" }`, returns a `Plan` (stops, times, legs, return leg, warnings); 400 with a message if nothing can be planned |
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

## Turning on the LLM parser (optional, free tiers)

Any OpenAI-compatible `/chat/completions` endpoint works (Groq, OpenRouter, Gemini's OpenAI-compatible endpoint, local Ollama).
Pick a provider, create a key, check its current free-tier limits and model names, then:

```bash
export CITYTRAIL_LLM_API_KEY=your-key
cd backend
mvn spring-boot:run \
  -Dspring-boot.run.arguments="--citytrail.llm.enabled=true --citytrail.llm.base-url=https://api.groq.com/openai/v1 --citytrail.llm.model=MODEL_NAME"
```

Or set `citytrail.llm.*` in `application.yml`. The app refuses to start if `enabled=true` but base URL, key or model is empty.
Leave it disabled for the demo-safe path; the keyword parser needs nothing.

## Next steps (suggested order)

1. Frontend: draw the returned route on the map and animate a marker along it; let the user click the map to set the start point.
2. Fog-of-war: GeoJSON fog polygon with holes for unlocked districts, ids kept in `localStorage`; unlock a district when a stop there is completed.
3. Polish: glass chat card, gradual bottom blur, ticket-style result card, loading and error states.
4. Replace estimated legs with something better only if time allows (the estimates are fine for the demo).
