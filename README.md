# CityTrail

CityTrail is a trip planner for visitors to Gdańsk. You type what you feel like doing ("jozef k, then a nearby museum", "live music tonight and a ride home") and the app plans the stops with times, draws the walking route on a map, and shows every way to get to a place: on foot, by tram, bus or train. Built as a solo MVP for the Xelerit winter internship task (transport theme).
For now the application is only set for Gdańsk and instead of photos I decided to use placeholder background.

## What the app does

- **Plan a trip by writing a wish.** An AI parser understands the sentence, including misspelled place names, "near X" and follow-ups ("and a park near the museum"). The route grows with every message; "New trip" starts over.
- **Map with the route.** Stops appear as lettered dots, the walking legs follow real streets, and the start point (your location or one you chose) is on the map from the first second. Light and dark map styles.
- **Choose the ride.** When a trip needs a tram, bus or train, a small card on the map offers up to three connections for that ride (line, minutes, times, changes). Pick one and the route on the map follows it.
- **All ways to get there.** For a single destination the chat lists walking, tram, bus and train options with duration, times, line numbers and changes. Tapping an option draws it on the map in its own colour.
- **Find something fun.** One button picks a random place, flies the map there (keeping your location in view) and offers Details, Show me the way and Roll again.
- **Discover, Saved places and Your preferences.** Browse places with filters (Tonight, Coffee, Culture, Outside), heart favourites, open a place page, and pick interests that reorder the list.
- **Saved trips (full CRUD).** Save a plan, reopen it later, rename or delete it. Each plan shows a rough CO₂ comparison against driving.
- **Settings.** Start location (your location, the default ul. Długa 11, or a typed address), trip time (now or a set time), walking pace, light/dark theme, AI status, clearing saved trips, resetting the chat panel width.
- **Resizable chat panel**, a burger menu with counters for saved places and trips, and an accessible colour palette for both themes.

The creative twist: the AI only translates the sentence into structured stops chosen from our own dataset, while the route, times and transport options come from plain deterministic code and public data, so the demo cannot hallucinate a place.


## Demo
[Watch the demo](/demo.mp4)


## Technical overview

**Backend** (`backend/`): Java 21, Spring Boot 4.1.1, Maven.
- REST API with CORS for the Vite dev origin, Actuator health, validation messages returned to the client.
- In-memory H2 database accessed with Spring's `JdbcClient` for saved trips (`schema.sql`); nothing to install. A TCP port (9092) is opened so the in-memory database can be inspected from an IDE (see below).
- 31 mock places in `src/main/resources/data/gdansk_places.json` (categories food, store, event, landmark; tags; opening notes; mocked upcoming events; nearest transit stop).
- **Intent parsing** (`plan/`): `LlmIntentParser` calls any OpenAI-compatible endpoint (Groq by default, model `openai/gpt-oss-120b`) in JSON mode with the place list and the route so far; its answer is sanitized against the dataset (`IntentVocabulary`), so unknown places and tags are dropped. If there is no key, or the call fails or is rate limited, `KeywordIntentParser` takes over (English plus a few Polish keywords). The response reports which one ran (`parsedBy`).
- **Planner** (`Planner`): deterministic code. An event slot anchors the day and the other stops are chosen near the venue; otherwise each stop is near the previous one. Walking time uses the chosen pace; longer legs are estimated as transit from the places' nearest stops.
- Unit tests for the repository, both parsers, the sanitizer, the planner, the plan service and the trip service.

**Frontend** (`frontend/`): React 19, TypeScript, Vite+ (`vp`), MapLibre GL.
- No router and no state library: plain React state, small hooks for settings, favourites and interests (kept in `localStorage`).
- **Own map style** (`features/map/mapStyle.ts`): a flat "figure-ground" style (grey buildings, white roads, green parks, pale water) built on the free OpenFreeMap vector tiles, with a light and a dark variant. Marker and pin colours are chosen to keep at least 3:1 contrast against the map.
- **Walking routes** from the free OpenStreetMap community router (`api/routing.ts`); **tram, bus and train options** from the free Transitous journey planner (`api/transit.ts`), decoded from encoded polylines. Addresses typed in Settings are looked up with Nominatim (`geocode.ts`).
- Each component has its own stylesheet next to it; shared basics live in `src/styles/`.

```
.
├── backend/
│   ├── pom.xml
│   └── src
│       ├── main/java/com/example/citytrail
│       │   ├── config/                 CORS and clock
│       │   ├── places/                 dataset, repository, GET /api/places
│       │   ├── plan/                   intent parsers, planner, POST /api/plan
│       │   └── trips/                  saved trips (H2, JdbcClient)
│       ├── main/resources              application.yml, schema.sql, data/, prompts/
│       └── test/java                   unit tests
└── frontend/
    ├── vite.config.ts                  dev proxy: /api -> http://localhost:8080
    └── src
        ├── api/                        backend client, walking routes, transit options
        ├── components/                 shared components, each with its own .css
        ├── features/chat|map|menu/     chat, map, menu (component + .css per file)
        ├── pages/                      Discover, place, saved places, preferences, trips, settings
        ├── styles/                     base, typography, buttons
        └── App.tsx                     screen switching and shared state
```

## Run it locally

Prerequisites: JDK 21, Maven 3.9+ (or open `backend/` in IntelliJ), Node.js 22+ and npm. The optional AI parser needs a free API key (see below).

**1. Start the API** (terminal 1)

```bash
cd backend
mvn spring-boot:run
```

Check it: <http://localhost:8080/api/places> returns 31 places and <http://localhost:8080/actuator/health> returns `UP`. Run the tests with `mvn test`.

**2. Start the frontend** (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` to the backend on port 8080, so start the backend first. Other commands: `npm run build`, `npm run lint`, `npm run preview`.

**3. (Optional) Turn on the AI parser** before step 1, in the same terminal:

```bash
export CITYTRAIL_LLM_API_KEY=your-key
mvn spring-boot:run
```

Get a free key at https://console.groq.com. The log should say `AI intent parser is on`, and Settings shows "AI parser on". Without a key the offline keyword parser is used and everything still works. Defaults can be changed with `CITYTRAIL_LLM_BASE_URL` (any OpenAI-compatible endpoint), `CITYTRAIL_LLM_MODEL` and `CITYTRAIL_LLM_ENABLED=false`. Free-tier model names change, so if the default model is rejected, pick a current one from the provider's list.

Notes: the walking routes, transit options, address lookup and map tiles are live third-party services, so they need internet access. Saved trips are kept in memory and disappear when the backend restarts.

## Inspect the database (optional)

The saved trips live in an in-memory H2 database named `citytrail`. The backend opens a TCP server on port 9092 (`config/H2ServerConfig.java`), so you can browse it while the backend is running, for example in IntelliJ IDEA:

1. Start the backend (`mvn spring-boot:run`).
2. Open the **Database** panel, then **+ → Data Source → H2**.
3. Set **Connection type** to **Remote**, host `localhost`, port `9092`, database `mem:citytrail`, user `sa`, empty password. (Or paste the URL `jdbc:h2:tcp://localhost:9092/mem:citytrail`.)
4. Click **Test Connection** (let IntelliJ download the H2 driver if asked), then **OK**. The tables are under `PUBLIC`.

The data is lost when the backend stops, and it only exists while the backend is running, so start the backend first. The port listens on localhost only and is meant for development.

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/places` | all places, optional `?category=food\|store\|event\|landmark` |
| GET | `/api/places/{id}` | one place, 404 if unknown |
| GET | `/api/districts` | district centres (not used by the current UI) |
| POST | `/api/plan` | body `{ text, startLat?, startLng?, startTime?, walkPace?, previousStopIds?, previousReturnHome? }`, returns the plan; 400 with a message if nothing can be planned |
| GET | `/api/trips` | saved trips, newest first |
| POST | `/api/trips` | save a trip: `{ stopIds, returnHome?, title?, startLat?, startLng?, prompt? }`, 201 |
| GET | `/api/trips/{id}` | the trip plus a freshly planned route, 404 if unknown |
| PATCH | `/api/trips/{id}` | rename: `{ title }` |
| DELETE | `/api/trips/{id}` | delete, 204 |
| DELETE | `/api/trips` | delete all, 204 |
| GET | `/api/info` | `{ aiParser, model }` |
| GET | `/actuator/health` | liveness |

## What to type

Stops are planned in the order you write them.

- Kinds of places: café/coffee, restaurant, milk bar, vintage shop, bookshop, museum, church, park, sightseeing and events (rock, jazz, opera, theatre).
- A specific place by name, accents optional: `Jozef K`, `Dwor Artusa`.
- "Near X": `a bookshop near Dwor Artusa`, `a park near the museum`.
- Follow-ups extend the route; "home" or "back to the hotel" adds a ride home.

Examples: `jozef k, then a nearby museum` / `a coffee, a thrift shop, a rock gig and a ride home` / `take me to Westerplatte`.

## Known limits

- Mock data for 31 places and mocked event times; opening hours are notes, not checked.
- Saved trips use an in-memory database and reset on restart; favourites and interests live in the browser.
- Walking, transit and geocoding use free public services (fair use) and can be slow or unavailable; the app shows a message or leaves the option out.
- A transit mode with no good connection (or a trip faster on foot) is not listed.

## How I used AI tools

I built this with Claude (Anthropic) as a coding assistant, working in a chat-and-agent setup where it edited the project files and I reviewed and directed each step.

- **Backend:** Claude generated the Spring Boot boilerplate, the keyword and LLM parsers, the planner, the saved-trips CRUD and the unit tests. I chose the architecture (AI only parses, plain code plans) and ran `mvn test` myself.
- **Frontend:** Claude wrote the React components, the MapLibre map style, the transit options and the page screens from my UI references and screenshots; I decided the look and iterated on spacing, colours and behaviour.
- **Refactoring and docs:** Claude split the styles per component, removed code comments and wrote this README. I checked the result in the browser.
- **In the product:** the app itself calls an LLM (Groq, `openai/gpt-oss-120b`) at runtime to understand the user's sentence. This is a feature, not a development aid.
