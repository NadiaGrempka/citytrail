# CityTrail demo script (about 2 minutes, 7 scenes, text captions only)

One continuous screen recording with no voice-over. You do the actions, and short on-screen captions explain them. Add the captions afterwards in any video editor (CapCut, Clipchamp, iMovie, DaVinci Resolve), as plain text near the bottom of the screen, white on a dark rounded bar, a clean sans-serif font, 3 to 5 seconds each. Keep them short enough to read in a few seconds, and leave the cursor still while a caption is up.

| # | Scene | Time | Running total |
|---|-------|------|---------------|
| 1 | Title and map | 10 s | 0:10 |
| 2 | A wish in plain words | 25 s | 0:35 |
| 3 | Follow-up keeps the route | 10 s | 0:45 |
| 4 | Every way to get there | 30 s | 1:15 |
| 5 | Find something fun | 15 s | 1:30 |
| 6 | Save a trip, Discover | 15 s | 1:45 |
| 7 | Dark mode and tech stack | 15 s | 2:00 |

## Before you record (not on camera)
- Backend running with `CITYTRAIL_LLM_API_KEY` set (the log shows `AI intent parser is on`). Frontend on http://localhost:5173.
- Settings: start = **Set manually: `ul. Paneckiego, Gdańsk`**, time = Now, pace = Normal.
- Light theme, a fresh page load, chat panel not docked, no saved trips (Settings > Clear saved trips), no hearted places.
- Window about 1440 x 900, browser zoom 100%, network on (routes, transit options and map tiles are live).
- Do one full dry run first so the tiles and routes are cached. Type at a steady, readable speed, because typing is the main thing viewers watch.

## 1. Title and map (10 s)
- **Do:** show the opening screen, nothing else.
- **Caption 1 (0:00):** `CityTrail: tell it what you feel like doing in Gdańsk`
- **Caption 2 (0:05):** `It plans the stops, the walk and the ride home`

## 2. A wish in plain words (25 s)
- **Type:** `jozef k, then a nearby museum`
- **Watch:** the map flies in, the trail draws itself, the stops get letters and times.
- **Caption 1 (0:10):** `Type a wish in plain words, typos and all`
- **Caption 2 (0:22):** `AI picks places from our dataset, plain code plans the route`

## 3. Follow-up keeps the route (10 s)
- **Type:** `and a park near the museum`
- **Caption (0:36):** `Follow-ups extend the route instead of restarting`

## 4. Every way to get there (30 s)
- **Do:** press "New trip", type `take me to Westerplatte`. Tap "Tram" so the map redraws in the tram colour, then tap "Walk".
- **Caption 1 (0:46):** `One destination: every way to get there`
- **Caption 2 (0:58):** `Walk, tram, bus, train, from a live journey planner`
- **Caption 3 (1:07):** `Tap an option to see it on the map`
- **Tip:** Westerplatte is far enough that all modes show up. Short trips only list walking, which is normal.

## 5. Find something fun (15 s)
- **Do:** press "Find something fun", then "Roll again" once.
- **Caption (1:16):** `Undecided? One tap picks a random place and the way there`

## 6. Save a trip, Discover (15 s)
- **Do:** plan `a bookshop near Dwor Artusa, then take me home`, press "Save trip". Open the burger menu (the Saved trips badge shows 1), then Discover, and tap the "Tonight" filter.
- **Caption 1 (1:31):** `Save trips: REST API with full CRUD, H2 database`
- **Caption 2 (1:39):** `Discover: filters driven by place tags`

## 7. Dark mode and tech stack (15 s)
- **Do:** press the theme button and let the map restyle, then leave it still for the last seconds.
- **Caption 1 (1:46):** `Light and dark map, styled from scratch with MapLibre`
- **Caption 2 (1:52):** `React + TypeScript  ·  Spring Boot + H2  ·  LLM with keyword fallback`

## If something goes wrong on camera
- **AI slow or offline:** restart the backend without the key. The same sentences work through the keyword parser.
- **No tram/bus/train cards:** the journey planner is a free community service. Record scene 4 last and re-take it.
- **Location prompt appears:** click Block before recording.
- **Map looks empty after a theme switch:** wait a second, the tiles load live.

## Extra material (optional, not in the 2-minute cut)
Resizing the chat panel by dragging its edge; Your preferences reordering Discover; Settings changing pace and start time.

## Honest limits (if asked)
Mock data for 31 places; saved trips are in memory and reset when the backend restarts; favourites and interests live in the browser; transit options come from a public planner and may be missing for short trips; the language model only parses the request, and the planner is deterministic.
