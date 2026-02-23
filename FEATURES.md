# PocketPoker — Feature Backlog

## Completed

### Authentication
- [x] Email/password registration and login
- [x] JWT token-based auth with secure storage
- [x] Google OAuth (backend only, no UI)
- [x] Apple OAuth (backend only, no UI)

### User Profiles
- [x] User profile endpoints (GET /me, GET /{id}, PUT /me)
- [x] Edit Profile screen (username, full name, skill level)
- [x] View other users' profiles with reputation stats
- [x] Tappable usernames throughout the app (rooms, members, reviews)

### Room Management
- [x] Create room with GPS/address geocoding
- [x] Room discovery with geospatial search (PostGIS)
- [x] Location privacy (200-500m offset, distance fuzzing, access logging)
- [x] Room lifecycle (scheduled → active → finished/cancelled)
- [x] Member management (view, kick, leave)

### Map Discovery
- [x] Airbnb-style map view with approximate location circles
- [x] Map/List toggle on Search screen
- [x] Tappable markers with bottom preview card
- [x] GPS and address-based search with radius filtering
- [x] Search radius circle overlay
- [x] "Locations are approximate" disclaimer

### Join Requests & Waitlist
- [x] Request to join rooms
- [x] Host approve/reject workflow
- [x] Cancel pending requests
- [x] Waitlist with queue positions
- [x] Promote from waitlist / remove from waitlist

### Reputation & Reviews
- [x] Post-game reviews (finished rooms only)
- [x] Participant picker (no manual ID entry)
- [x] Star rating + comments
- [x] User reputation summary (avg rating, breakdown, games completed)
- [x] Room reviews screen
- [x] User reviews screen (received/given tabs)
- [x] Cached reputation on user model


### Room Scheduling (Date & Time)
- [x] Backend: Add `scheduled_at` datetime field to Room model + migration
- [x] Backend: Enforce "Start Game" only allowed when current time >= scheduled_at
- [x] Backend: Return `scheduled_at` in room API responses
- [x] Frontend: Date/time picker on Create Room screen
- [x] Frontend: Display scheduled date/time on Room Detail and room cards
- [x] Frontend: Disable "Start Game" button with countdown if before scheduled time
- [x] Frontend: Sort search results by upcoming date
- [x] Frontend: Show "starts in X hours" on room cards
- **Priority:** CRITICAL — players need to know when a game is happening; hosts shouldn't start early. Foundational to the coordination loop.

### Rich Game Format Details
- [x] Backend: Add structured fields to Room model — `game_type` (enum: texas_holdem, pot_limit_omaha, omaha_hi_lo, stud, mixed, other), `game_format` (enum: cash, tournament), `blind_structure` (string, e.g. "$1/$2"), `house_rules` (text). Table size derived from existing `max_players`.
- [x] Backend: Migration for new fields
- [x] Backend: Update room create/update schemas and endpoints
- [x] Frontend: Game type picker on Create Room screen
- [x] Frontend: Cash vs Tournament toggle on Create Room screen
- [x] Frontend: Blind structure input (table size derived from max players)
- [x] Frontend: House rules text field
- [x] Frontend: Display game details prominently on room cards ("$1/$2 NL Hold'em · 6-max · Cash")
- [x] Frontend: Display full game details on Room Detail screen
- **Priority:** CRITICAL — transforms the app from a generic meetup tool into a poker-specific platform. Every room card should scream "poker."

### Poker-Specific Search Filters
- [x] Frontend: Filter by game type (Hold'em, PLO, Stud, etc.)
- [x] Frontend: Filter by stakes range (micro, low, mid, high)
- [x] Frontend: Filter by format (cash game vs tournament)
- [x] Frontend: Filter by room availability (full, not full, max players etc.)
- [x] Backend: Add query params to room search endpoint for new filters
- **Priority:** HIGH — pairs with Game Format Details; makes discovery feel poker-native.

-----
## Up Next

### Room Chat / Messaging
- [ ] Backend: Message model and WebSocket endpoint
- [ ] Backend: Message history API (paginated)
- [ ] Frontend: Chat screen per room (members only)
- [ ] Real-time message delivery
- [ ] Chat accessible from Room Detail screen
- **Priority:** HIGH — core feature, fills the post-approval communication gap

### Push Notifications
- [ ] Expo push notification setup
- [ ] Join request received (host)
- [ ] Request approved/rejected (player)
- [ ] Room status changes (game starting, cancelled)
- [ ] New chat message
- **Priority:** HIGH — users need to know when things happen without opening the app

### Member Location Display & Navigation
- [ ] Frontend: Replace raw lat/long coordinates with the human-readable address string on Room Detail (members-only private view)
- [ ] Frontend: If no address was provided at room creation, reverse-geocode the coordinates to generate a display address (e.g. "123 Main St, San Antonio, TX")
- [ ] Backend: Add reverse-geocoding utility to populate `address` from coordinates when address is missing on room creation
- [ ] Frontend: Add "Get Directions" button on the private location card (visible only to approved members)
- [ ] Frontend: On iOS — open Apple Maps via `maps://` URL scheme; fall back to Google Maps web URL if not available
- [ ] Frontend: On Android — open Google Maps via `geo:` intent URI; fall back to Google Maps web URL if not available
- [ ] Frontend: Use `Linking.canOpenURL()` to detect installed apps and choose the best option automatically
- [ ] Frontend: Pass destination coordinates to the maps URL so directions start immediately from the user's current location
- **Priority:** HIGH — approved members currently see raw coordinates, which is unusable. Getting to the game is the final step in the coordination loop; this is the difference between "I know where it is" and "I can get there."

---

## Backlog

### Player Poker Identity
- [ ] Backend: Add fields to User model — `preferred_game_types` (array), `preferred_stakes` (string), `years_playing` (int), `playing_style` (enum: tight, loose, aggressive, passive, balanced)
- [ ] Frontend: Poker preferences section on Edit Profile
- [ ] Frontend: Show poker identity on User Profile screen
- [ ] Frontend: Show player preferences in join request view (helps hosts decide)
- **Priority:** MEDIUM — makes profiles poker-specific; helps hosts evaluate join requests

### Session Tracking (Personal Stats)
- [ ] Backend: Session model (room_id, user_id, buy_in_amount, cash_out_amount, hours_played, notes, date)
- [ ] Backend: CRUD endpoints for sessions (private to user)
- [ ] Backend: Aggregate stats (total profit/loss, hourly rate, hours played, best/worst sessions)
- [ ] Frontend: Post-game session log prompt (after room finishes)
- [ ] Frontend: Session history screen (list of past sessions with P/L)
- [ ] Frontend: Stats dashboard (graphs, running totals, hourly rate)
- [ ] Frontend: Accessible from Profile tab
- **Priority:** MEDIUM — strong retention hook. Every serious poker player tracks results; building it in means daily engagement even without active games.

### Player Notes
- [ ] Backend: PlayerNote model (author_id, target_user_id, note_text, updated_at)
- [ ] Backend: CRUD endpoints (private to author)
- [ ] Frontend: "Add Note" button on User Profile screen
- [ ] Frontend: Private note visible only to the note author when viewing that player
- [ ] Frontend: Notes list accessible from Profile tab
- **Priority:** LOW — retention feature. Poker players mentally track opponent tendencies; giving them a tool is sticky.

### Map UX: Bottom Sheet
- [ ] Replace Map/List toggle with draggable bottom sheet (Airbnb pattern)
- [ ] Pull up to see list over map, pull down to see full map
- [ ] Horizontal card carousel alternative (lighter lift)
- **Priority:** MEDIUM — current toggle works, but not ideal UX
- **Dependency:** @gorhom/bottom-sheet or similar gesture library

### OAuth Sign-In UI
- [ ] Google Sign-In button on login/register screens
- [ ] Apple Sign-In button on login/register screens
- [ ] Backend endpoints already implemented
- **Priority:** MEDIUM — reduces friction for new users

### Room Editing
- [ ] Edit Room screen (name, description, buy-in, max players)
- [ ] Update location
- [ ] Backend endpoint exists, no frontend UI
- **Priority:** MEDIUM

### Room Deletion
- [ ] Delete/archive room from Room Detail (host only)
- [ ] Backend endpoint exists, no frontend UI
- **Priority:** LOW

### Enhanced Search Filters
- [ ] Filter by skill level
- [ ] Filter by buy-in range
- [ ] Filter by available seats
- [ ] Sort options (distance, date, rating)
- **Priority:** MEDIUM — becomes important as room count grows

### Host Profiles
- [ ] Display hosting stats (rooms hosted, avg rating as host)
- [ ] Verified host badges
- **Priority:** LOW

---

## Post-MVP (Future)

### Private Clubs / Trusted Circles
- [ ] Recurring game groups
- [ ] Invite-only clubs
- [ ] Club-level reputation

### Host Subscriptions
- [ ] Subscription tiers (Basic/Premium/Enterprise)
- [ ] Payment integration
- [ ] Premium host features
- [ ] Backend model exists, no endpoints or UI

### Moderation & Safety
- [ ] Report user/room
- [ ] Block user
- [ ] Admin moderation dashboard
- [ ] Content policy enforcement

### Polish
- [ ] Onboarding flow for new users
- [ ] Image uploads (profile photos, room photos)
- [ ] Static map previews in room cards
- [ ] Offline support / caching
- [ ] Error boundaries
- [ ] Analytics / event tracking
