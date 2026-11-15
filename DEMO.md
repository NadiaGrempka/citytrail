# CityTrail demo script (about 5 minutes, 8 scenes)

Each scene is one clean take: **what to do**, **what to point at**, **what to say**. Scenes 1-4 are the core (about 3 minutes). Use 5-8 if you want to show everything.

## Before you record
- Backend running with `CITYTRAIL_LLM_API_KEY` set (the log shows `AI intent parser is on`). Frontend on http://localhost:5173.
- Light theme, a fresh page load, chat panel not docked, no saved trips (Settings > Clear saved trips) and no hearted places.
- Settings: start = "ul. Długa 11" (so the demo works anywhere), time = "Now" (or a set evening time), pace = Normal.
- Allow location in the browser only if you are in Gdańsk; otherwise leave the default start.
- Window about 1440 x 900. Zoom the browser to 100%.
- Record with the network on: the walking routes, the tram/bus/train options and the map tiles are all live.

## 1. The pitch and the map (20 s)
- **Do:** just show the opening screen.
- **Point at:** the flat grey/white/green map, the lime "you are here" dot on the map from the first second, the theme button and "Find something fun" at the top right, the burger menu at the top left.
- **Say:** "CityTrail is for visitors who don't want to read a timetable. You say what you feel like doing in Gdańsk and it plans the whole trip: stops, times, the walk between them, and the ride home."

## 2. A wish in plain words (40 s)
- **Type:** `jozef k, then a nearby museum`
- **Point at:** the chat docks to the right, the map flies in, the real walking trail draws itself, the stops are lettered lime dots, the times appear, plus the CO₂ line.
- **Say:** "The AI understood 'jozef k' as Józef K., spelling and all, and 'nearby' as near that café. It only chooses places from our dataset, and plain code plans the route."

## 3. Follow-up that keeps the route (30 s)
- **Type:** `and a park near the museum`
- **Point at:** the route grows instead of starting over. The park sits next to the museum, not next to the last stop.
- **Say:** "It remembers the route, so 'the museum' means the one I already have."

## 4. Every way to get there (50 s)
- **Do:** press "New trip". Open Settings (via the "Edit" link in the chat header or the menu), choose "Set manually", type `ul. Paneckiego, Gdańsk`, then go back to the map. The dot moves.
- **Type:** `take me to Drukarnia Café`
- **Point at:** the card list under the plan: Walk, Tram, Bus, Train with minutes, times, line numbers and changes. Tap "Tram" and the map redraws the route in the tram colour. Tap "Walk" for the dashed walking line, then tap it again to clear.
- **Say:** "For a single destination it shows every way to get there, from a live journey planner. A mode with no connection just isn't listed."
- **Tip:** if a mode is missing, that is normal for short distances (walking is quicker). Pick a farther place such as `Westerplatte` for a richer list.

## 5. Find something fun (30 s)
- **Do:** press "Find something fun".
- **Point at:** the map flies to a random place with a neon purple pin, your location stays in view, a card shows the name, hours and transit. Press "Roll again" once. Then press "Show me the way" to go back to the guide with a route.
- **Say:** "If you don't know what you want, it picks something for you. One tap and you have the route."

## 6. Discover and saved places (40 s)
- **Do:** burger menu > Discover. Tap the filters: Tonight, Coffee, Outside. Heart two places (the menu badge counts them). Open one card.
- **Point at:** the place page with tags, a "Getting there" note and upcoming events, then "Show me the way" and "Ask the guide". Open Saved places from the menu.
- **Say:** "Everything is tag-driven, so the filters and the order of the cards come from the data. My preferences change the order too."
- **Optional (10 s):** burger menu > Your preferences, switch "Live music" and "Quiet corners" on or off, then return to Discover to see the cards reorder.

## 7. Save a trip and reopen it (30 s)
- **Do:** on the map, plan something (`a bookshop near Dwor Artusa, then take me home`). Press "Save trip" (a toast confirms). Press "New trip". Open the burger menu > Saved trips (badge shows the count) and open the trip. The route comes back. Rename one, delete one.
- **Say:** "Trips are saved in an in-memory H2 database through a REST API with full CRUD."

## 7b. Settings, theme and panel (30 s)
- **Do:** open Settings: show start location, trip time, walking pace and the AI status line. Back on the map, drag the chat panel's edge to resize it. Press the theme button: the whole map and every pin restyle for dark mode.
- **Say:** "Settings change the plan itself: a slower pace gives longer walks, a set start time shifts the schedule."

## 8. How it works (30 s)
"A React and TypeScript front end with MapLibre, a Spring Boot REST backend with CORS. A language model turns the sentence into structured stops using only places from our dataset; if it is down or rate limited, an offline keyword parser takes over so the demo never breaks. The route itself comes from deterministic Java code, walking paths from OpenStreetMap routing, and transit options from the Transitous journey planner."

## Sentences that work well
- `jozef k, then a nearby museum`, then `and a park near the museum`
- `a bookshop near Dwor Artusa, then take me home`
- `live music tonight` (shows event times at the venues)
- `coffee, then a vintage shop`
- `take me to Westerplatte` (best for the transport options)

## If something goes wrong on camera
- **AI slow or offline:** restart the backend without the key. The same sentences still work through the keyword parser (the response shows `parsedBy: keyword`).
- **No tram/bus/train cards:** the journey planner is a free community service; if it is unreachable the chat says so. Record that scene last and re-take it.
- **Location prompt appears:** click Block, or choose the default start in Settings first.
- **Map looks empty after a theme switch:** wait a second for the tiles, they load live.

## Honest limits (if asked)
Mock data for 31 places; saved trips are in memory and reset when the backend restarts; the favourites and interests live in the browser; transit options come from a public planner and may be missing for short trips; the planner is deterministic, the language model only parses the request.
