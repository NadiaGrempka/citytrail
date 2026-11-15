# CityTrail demo script (about 3 minutes)

**Setup (before you start):** backend running with `CITYTRAIL_LLM_API_KEY` set (log shows `AI intent parser is on`), frontend on http://localhost:5173, light theme, fresh page.

## 1. The pitch (20 s)
"CityTrail is for visitors who don't want to read a timetable. You say what you feel like doing in Gdańsk, and it plans the whole trip: stops, times, the walk between them, and the ride home."

## 2. First wish, a named place (40 s)
Type: `jozef k, then a nearby museum`
- Point out: the map flies in, the real walking trail is drawn, stops are lettered, times are shown.
- Say: "The AI understood 'jozef k' as Józef K. café, spelling and all, and 'nearby' as near that café."

## 3. Follow-up that extends the route (40 s)
Type: `and a park near the museum`
- Point out: the route grows instead of starting over; the park sits next to the museum, not next to the last stop.
- Say: "It keeps the route in context, and 'near the museum' means the museum I already have."

## 4. Ride home (30 s)
Type: `a bookshop near Dwor Artusa, then take me home`
- Point out: the bookshop is by Dwór Artusa, and the ride home is added at the end.

## 5. Panel and theme (20 s)
- Drag the chat panel's edge to resize it. Open the burger menu and switch to dark theme (the trail and map restyle).
- Press "New trip" to reset.

## 6. How it works (30 s)
"A language model turns the sentence into structured stops, using only places from our dataset. If it's down or rate limited, an offline keyword parser takes over, so the demo never breaks. The route itself is planned by deterministic code, and the walking paths come from OpenStreetMap routing."

## Fallback if the AI is slow or offline
Stop the backend and restart without the key. The same sentences still work through the keyword parser; the response shows `parsedBy: keyword`.

## Honest limits (if asked)
Mock data for 31 places; transit legs are estimates; the burger menu items (recent chats, my trips, settings) are placeholders; start time is fixed at 14:00.
