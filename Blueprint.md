# Multi-Game Platform — Project Blueprint

> **Chess · Ludo · UNO · Monopoly · Snakes & Ladders · Never Have I Ever · Scribble**

| | |
|---|---|
| **Document type** | Full project guide — architecture, tech stack, build order, checklists |
| **Target reader** | Developer learning through building — beginner to intermediate |
| **Project scope** | Web-based multiplayer game platform with 6+ games |
| **Estimated build time** | 3–6 months (part-time) / 6–10 weeks (full-time) |
| **Last updated** | March 2026 |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Frontend UI Layer](#4-frontend-ui-layer)
5. [Backend & Game Engine](#5-backend--game-engine)
6. [Database Design](#6-database-design)
7. [Where to Start — Build Order](#7-where-to-start--build-order)
8. [How to Improve — Polish & Features](#8-how-to-improve--polish--features)
9. [Skills You Will Build](#9-skills-you-will-build)
10. [Master Project Checklist](#10-master-project-checklist)
11. [Quick Reference](#11-quick-reference)

---

## 1. Project Overview

You are building a web-based multiplayer game platform where players can browse a collection of board and card games, create or join rooms, and play in real-time with friends. Think Board Game Arena or Tabletop Simulator — but yours, built from scratch, and customisable however you like.

### 1.1 What You Are Building

The platform has three major areas that players will use:

- A **home/lobby screen** — browse all available games, see active rooms, join or create a session
- A **game room** — a waiting room where players gather before a game starts, configure settings, and chat
- A **game session** — the actual in-game experience with board, cards, dice, turn management, and real-time sync

### 1.2 Games to Build

Organised by complexity. Start at Phase 1 and work forward — each phase builds on what you learned in the previous one.

| Phase | Game | Core skill you learn | Estimated effort |
|---|---|---|---|
| 1 | Snakes & Ladders | Board grid, dice, piece movement | 1–2 weeks |
| 1 | Ludo | Multi-piece, multiple players, home/safe zones | 2–3 weeks |
| 1 | Never Have I Ever | Card deck, prompts, voting/reactions | 1 week |
| 2 | UNO (Classic) | Hand management, special cards, deck logic | 2–3 weeks |
| 2 | UNO Flip | Double-sided deck variant on top of UNO engine | 1 week |
| 2 | UNO No Mercy | Stacking rules, rule variant layer | 1 week |
| 3 | Chess | Grid, complex piece rules, check/checkmate detection | 3–4 weeks |
| 3 | Monopoly | Economy system, properties, trades, auctions, dice | 4–6 weeks |

> 💡 **Tip:** Build UNO variants as feature flags on top of one UNO engine. Don't create three separate codebases — you'll just maintain the same bug three times.

---

## 2. Technology Stack

Every choice below is beginner-friendly, has excellent documentation, and is widely used in the industry. Learning these tools gives you real, employable skills.

### 2.1 Frontend

| Tool | Purpose |
|---|---|
| **React + TypeScript** | Your main UI framework. Component-based — each game element is a reusable component. TypeScript catches bugs before they happen and teaches you good habits. Use Vite as your build tool (much faster than Create React App). |
| **Tailwind CSS** | Utility-first CSS. No writing custom CSS files — apply classes like `bg-red-500` or `flex gap-4` directly in JSX. Huge time saver and looks great out of the box. |
| **Zustand** | Lightweight state management. Simpler than Redux. Stores your game state (whose turn it is, current board, player hands) in a central store that any component can read. |
| **React Router** | For navigation between the home screen, lobby, and game room. |
| **Framer Motion** | Animation library for React. Use for card flips, piece movements, dice rolls, win animations. Makes your game feel polished and alive. |
| **Konva.js / PixiJS** | Canvas rendering for complex boards. Konva for simpler 2D boards (Ludo, Snakes & Ladders). PixiJS if you want GPU-accelerated rendering for Monopoly or complex boards. |

### 2.2 Backend

| Tool | Purpose |
|---|---|
| **Node.js + Express** | Your server. JavaScript on the backend means one language across the full stack. Express is minimal and teaches you how HTTP servers actually work. Use TypeScript here too. |
| **Socket.io** | The magic behind multiplayer. Handles WebSocket connections, rooms, events, and disconnects. When a player plays a card, Socket.io broadcasts it to everyone in the room in milliseconds. |
| **Prisma ORM** | Database toolkit. Write TypeScript instead of raw SQL. Handles migrations (database schema changes) cleanly. Much safer than writing raw queries. |
| **Zod** | Schema validation. Validates that data coming from the frontend is what you expect. Prevents bad data from ever hitting your game logic. |
| **JWT** | For authentication. A token given to a user on login that proves who they are on every request. |

### 2.3 Database

| Tool | Purpose |
|---|---|
| **PostgreSQL** | Your main database. Stores users, game history, leaderboards, friend lists. Industry standard, free, powerful. Use Supabase for hosted PostgreSQL with a free tier and built-in auth. |
| **Redis** | In-memory cache. Stores live game state (the current board, whose turn it is, the deck). Much faster than PostgreSQL for data that changes every few seconds. Also used for managing Socket.io rooms across multiple server instances. |

### 2.4 Auth

| Tool | Purpose |
|---|---|
| **Clerk** *(recommended)* | Plug-and-play auth with a beautiful UI. Handles login, signup, Google OAuth, profile pictures. Saves you 2–3 weeks of building auth yourself. Free tier is generous. |
| **Supabase Auth** *(alternative)* | If you want everything in one place (Supabase gives you PostgreSQL + Auth + Storage). Good for keeping things simple early on. |

### 2.5 Deployment

| Tool | Purpose |
|---|---|
| **Vercel** | Deploy your React frontend. Free tier. Automatic deploys on every Git push. Takes 2 minutes to set up. |
| **Railway** | Deploy your Node.js backend and Redis. Free tier available. Simple pricing, great developer experience. |
| **Supabase** | Hosted PostgreSQL. Free tier gives you 500MB which is more than enough to start. |
| **GitHub** | Version control. Commit your code here. Connects to Vercel and Railway for automatic deploys. |

> 💡 **Learning tip:** Don't pick the "perfect" stack. Pick this stack, learn it deeply, and you can always swap pieces later. The patterns — components, state management, APIs, WebSockets — transfer to any stack.

---

## 3. System Architecture

The platform has four layers that work together. Understanding this mental model before writing any code will save you enormous confusion later.

### 3.1 The Four Layers

| Layer | What it does |
|---|---|
| **Frontend (React)** | Everything the player sees and interacts with. Game boards, card hands, lobby, settings. Communicates with the backend via REST API and WebSockets. |
| **Gateway (API + WebSocket)** | The entry point to your server. REST API handles one-off requests (login, load profile, save score). WebSocket server handles real-time events (play card, roll dice, send chat). |
| **Backend Services** | The game engine — pure logic with no UI. Validates moves, updates state, enforces rules. Separated from the API layer so you can test it without a browser. |
| **Data Layer** | PostgreSQL for permanent data (users, history). Redis for temporary live state (current game). If the server crashes, PostgreSQL has the history; Redis is rebuilt from a snapshot. |

### 3.2 Data Flow — Playing a Card (UNO Example)

Here is exactly what happens when a player clicks a card to play it:

1. Player clicks a card in their hand in the browser
2. React calls `socket.emit('play_card', { cardId: 'red_7', gameId: 'abc123' })`
3. Socket.io sends this event to your Node.js server
4. Server middleware validates: is this player's turn? Is this a legal play?
5. Game engine updates the game state: discard pile, player hand, next turn
6. New state is saved to Redis (live cache) and queued to PostgreSQL (history)
7. Server broadcasts `socket.emit('game_update', newState)` to all players in room
8. All clients receive the update and React re-renders the board

> The entire round trip — click to all screens updated — should take under 100ms on a good connection.

### 3.3 Game State Structure

Every game shares a common state shape. This consistency is what lets you reuse components across games.

```typescript
interface GameState {
  gameId: string;          // unique room identifier
  gameType: string;        // 'uno' | 'chess' | 'ludo' | ...
  status: string;          // 'waiting' | 'active' | 'paused' | 'finished'
  players: Player[];       // all players and their data
  currentTurn: string;     // playerId whose turn it is
  turnNumber: number;      // how many turns have passed
  board: any;              // game-specific board state
  lastAction: Action;      // last move made (for UI animation)
  winner: string | null;   // playerId of winner, or null
}
```

### 3.4 Folder Structure

```
/game-platform
  /frontend                 ← React app (Vite + TypeScript)
    /src
      /components           ← Reusable UI pieces (Button, Card, Avatar)
      /games                ← One folder per game
        /uno
          UnoBoard.tsx      ← The game canvas
          UnoCard.tsx       ← A single card
          unoLogic.ts       ← Client-side helpers
        /chess
        /ludo
      /store                ← Zustand state
      /hooks                ← Custom React hooks (useSocket, useGame)
      /pages                ← Route-level pages
  /backend                  ← Node.js + Express + Socket.io
    /src
      /games                ← Game engines (pure logic)
        /uno
          unoEngine.ts      ← All UNO rules and state transitions
          unoDeck.ts        ← Deck management, shuffle, deal
        /chess
        /ludo
      /socket               ← WebSocket event handlers
      /api                  ← REST routes
      /middleware            ← Auth, validation
      /db                   ← Prisma client and queries
  /shared                   ← Shared TypeScript types
    types.ts                ← GameState, Player, Card, etc.
```

---

## 4. Frontend UI Layer

The UI layer is everything the player sees. It is built from composable React components organised into five main areas.

### 4.1 The Five UI Zones

| Zone | What it does |
|---|---|
| **Game Board / Canvas** | The visual playing field. For grid games (Chess, Ludo, Snakes & Ladders) this is a CSS Grid or SVG. For complex boards (Monopoly) use Konva.js. Pieces, tokens, and markers are layered on top. |
| **Player HUD** | The heads-up display showing all players, their avatars, scores, card counts, and a clear indicator of whose turn it is. Always visible during a game. |
| **Action Panel** | Contextual controls for the current player. Dice roll button, card hand, draw pile button, trade proposals. Changes based on what action is valid right now. |
| **Game Log** | A scrollable list of every event: "Priya played Red 7", "Karan drew 4 cards", "Arjun skipped". Optionally combined with a chat box. |
| **Overlay Layer** | Modal screens rendered on top of everything else. Win screen, rules popup, settings panel, reconnect dialog. Use React Portals to render these outside the normal DOM tree. |

### 4.2 Component Reuse Strategy

Many components are shared across games. Build these as generic, reusable pieces from day one:

- **Avatar** — circular player icon with initials fallback and online/offline indicator
- **TurnTimer** — countdown ring that ticks down each turn. Reused in every game.
- **DiceRoller** — animated dice component. Accepts number of dice and face count.
- **GameLog** — event feed with formatted messages. Just pass it events.
- **ChatBox** — in-game chat. Works for every game identically.
- **RulesModal** — full-screen rules overlay. Each game provides its own rules content.
- **WinScreen** — confetti animation + stats. Reused for all games.

### 4.3 Board Rendering Approaches

| Approach | Best for | How it works |
|---|---|---|
| **CSS Grid** | Chess, Snakes & Ladders | Define an 8×8 or 10×10 grid in CSS. Each cell is a div. Pieces are absolute-positioned divs layered on top. Easiest to implement. |
| **SVG** | Ludo, custom shapes | Draw the board as an SVG. Cells and paths are SVG elements. Pieces are SVG circles. Great for non-rectangular layouts. |
| **Konva.js** | Monopoly, complex boards | HTML Canvas with a React API. Layer-based: board image on the bottom, tokens on top. Supports drag-and-drop, animations, and zoom. |

### 4.4 Making Your Own Board

Yes — you can design completely custom boards. Here is the workflow:

1. Design the board in Figma (free). Export as SVG.
2. Import the SVG into React as a component. Use `react-svgr` to convert it.
3. Identify "spaces" — add data attributes (`data-space-id="12"`) to each cell in Figma.
4. In React, select spaces by their data attribute and attach event handlers (`onClick`, highlight on hover).
5. Render pieces as absolutely-positioned components on top of the board SVG.
6. Use Framer Motion to animate piece movement between spaces.

> 💡 **Pro tip:** Store board coordinates in a lookup table: `const BOARD_POSITIONS = { 1: {x: 45, y: 320}, 2: {x: 90, y: 320}, ... }`. This decouples your game logic from your layout completely.

---

## 5. Backend & Game Engine

The backend has two jobs: handle HTTP/WebSocket traffic (the gateway), and run the game logic (the engine). Keep these separated — the engine should be pure functions that take a state and an action and return a new state.

### 5.1 Game Engine Pattern

Model every game as a state machine. This is the most important architectural decision you will make — get this right and everything else falls into place.

```typescript
// The engine: pure function, no side effects
function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLAY_CARD':  return handlePlayCard(state, action);
    case 'DRAW_CARD':  return handleDrawCard(state, action);
    case 'ROLL_DICE':  return handleRollDice(state, action);
    default: return state;
  }
}
```

This pattern has huge benefits: you can test the entire game without a browser, replay any game from its action log, and undo moves easily.

### 5.2 WebSocket Event Architecture

Socket.io uses "rooms" to isolate game sessions. Each game room is a Socket.io room. Events sent to a room only reach players in that room.

| Event name | Direction | What it does |
|---|---|---|
| `join_room` | Client → Server | Player joins a game room. Server adds them to Socket.io room and sends current state. |
| `leave_room` | Client → Server | Player leaves or disconnects. Server pauses game, notifies others. |
| `game_action` | Client → Server | Generic game move (play card, roll dice, move piece). Validated by engine. |
| `game_update` | Server → Room | New game state broadcast to all players after any valid action. |
| `player_joined` | Server → Room | Notifies existing players that someone new joined. |
| `player_disconnected` | Server → Room | Notifies others that a player disconnected. Triggers reconnect timer. |
| `chat_message` | Bidirectional | In-game chat. Server validates and rebroadcasts to room. |
| `game_over` | Server → Room | Game has ended. Sends final state, winner, and stats. |

### 5.3 Handling Disconnections

Real players disconnect. Your game needs a strategy for this — don't skip it.

- When a player disconnects, immediately broadcast `player_disconnected` to the room
- Start a 60-second reconnect timer on the server. Pause the game or skip their turn.
- If they reconnect within 60s, send them the full current state and resume.
- If they don't, either replace them with a bot (recommended) or end the game with a walkover.
- Store the session in Redis keyed by `userId` so reconnects can pick up exactly where they left off.

### 5.4 Move Validation

Always validate moves on the server. Never trust the client. A player could modify their browser and send any move they want.

- Check it is the player's turn
- Check the action is legal by current game rules
- Check the player has the piece/card they claim to be playing
- Return a clear error message if invalid — the client should show it to the user

---

## 6. Database Design

### 6.1 Core Tables (PostgreSQL)

| Table | Key columns |
|---|---|
| `users` | `id`, `username`, `email`, `avatar_url`, `created_at`, `total_games`, `total_wins` |
| `games` | `id`, `game_type`, `status`, `created_at`, `ended_at`, `settings` (JSON), `winner_id` |
| `game_players` | `game_id`, `user_id`, `seat_number`, `score`, `final_rank` — join table linking users to games |
| `game_actions` | `id`, `game_id`, `user_id`, `action_type`, `action_data` (JSON), `timestamp` — full move log |
| `friendships` | `user_id`, `friend_id`, `status` (pending/accepted), `created_at` |
| `leaderboard` | `user_id`, `game_type`, `elo_rating`, `wins`, `losses`, `win_rate` — updated after each game |

### 6.2 Redis Keys

Use clear key naming conventions. Set TTL (time-to-live) on all keys.

```
game:{gameId}:state          # Full current GameState object (JSON)
game:{gameId}:players        # Set of connected player socket IDs
game:{gameId}:timer          # Current turn timer value
user:{userId}:session        # User's active game session (for reconnect)
room:{roomId}:chat           # Last 50 chat messages (Redis List)
```

> `game:{gameId}:state` should expire 24 hours after the last action. This prevents stale data accumulating.

---

## 7. Where to Start — Build Order

This is the most important section. The order matters. Each step teaches you something you need for the next step.

### Phase 0: Setup (Week 1)

Get your environment running before writing any game code.

- [X] ~~*Install Node.js (v20+), VS Code, Git*~~ [2026-03-20]
- [X] ~~*Create a GitHub repository for your project*~~ [2026-03-20]
- [X] ~~*Set up Vite + React + TypeScript frontend: `npm create vite@latest`*~~ [2026-03-20], 'npm run dev', 'npm install react-wavify'
- [X] ~~*Install Tailwind CSS: `npm install tailwindcss @tailwindcss/vite`*~~ [2026-03-20]
- [X] ~~*Set up Node.js + Express backend with TypeScript: `npm init`, install `ts-node`*~~ [2026-03-20]
- [ ] Set up Prisma and connect to a local PostgreSQL database
- [ ] Deploy a "hello world" to Vercel (frontend) and Railway (backend)
- [ ] Confirm the frontend can make an API call to the backend

> 🎯 **Goal:** By the end of Week 1 you should be able to open your browser and see data from your own server. That's it.

---

### Phase 1: First Game — Snakes & Ladders (Weeks 2–3)

Build local multiplayer first (two players, same browser). Add WebSockets in Week 3.

#### Week 2: Local version

- [ ] Create a 10×10 grid board with CSS Grid
- [ ] Number the cells 1–100. Style them (alternating colors, snake/ladder highlights)
- [ ] Create a `Piece` component. Place two pieces at position 1.
- [ ] Create a `DiceRoller` component with a roll button and animated number
- [ ] Write the game logic: roll → move piece → check for snake/ladder → check for win
- [ ] Manage game state with `useState`. Display "Player 1's turn" / "Player 2's turn"
- [ ] Animate piece movement with Framer Motion
- [ ] Show a `WinScreen` when someone reaches 100

#### Week 3: Add multiplayer

- [ ] Install Socket.io: `npm install socket.io` (backend) and `socket.io-client` (frontend)
- [ ] Create a `RoomManager` on the backend: `createRoom`, `joinRoom`, `leaveRoom`
- [ ] Move game logic into a `SnakesEngine` on the backend
- [ ] Replace local state with socket events: `roll_dice` → `game_update` → render
- [ ] Build a simple lobby: create room (get a code), share code, second player joins
- [ ] Test with two browser tabs

---

### Phase 2: Extract Patterns (Week 4)

Before building the next game, extract what you built into reusable pieces. This week saves you 10 weeks later.

- [ ] Create a generic `RoomManager` that any game can use (not Snakes-specific)
- [ ] Create a generic `GameSession` component (HUD, log, chat) that any game can plug into
- [ ] Create shared components: `Avatar`, `TurnTimer`, `PlayerList`, `ChatBox`, `WinScreen`
- [ ] Create a `GameRouter`: given a `gameType`, render the correct board component
- [ ] Create a home page with a list of games to choose from
- [ ] Add Clerk authentication — protect game creation behind login

---

### Phase 3: Ludo (Weeks 5–6)

More complex board, 4 players, home zones, safety squares. Tests your engine architecture.

- [ ] Design the Ludo board as an SVG. Define `BOARD_POSITIONS` lookup for all 56 spaces.
- [ ] Build the `LudoEngine`: 4 players, 4 pieces each, two-dice roll
- [ ] Implement home zone logic (pieces start at home, enter on a 6)
- [ ] Implement capturing (landing on opponent sends them home)
- [ ] Implement safety squares (no capturing on star squares)
- [ ] Implement winning (all 4 pieces reach home column)
- [ ] Use your generic `RoomManager` and `GameSession` components

---

### Phase 4: Card Games — UNO (Weeks 7–8)

- [ ] Build a `Deck` class: 108 cards, shuffle (Fisher-Yates algorithm), deal
- [ ] Build a `CardHand` component: fan layout, hover to lift, click to play
- [ ] Build the `UnoEngine`: match by color or number, special cards (+2, Skip, Reverse, Wild, +4)
- [ ] Implement UNO call and challenge logic
- [ ] Build the discard pile visual and draw pile button
- [ ] Add UNO Flip as a variant: one flag flips deck and rules
- [ ] Add UNO No Mercy as a variant: stacking rules flag

---

### Phase 5: Chess (Weeks 9–11)

Chess is the biggest logic challenge. Use a library for move generation so you can focus on the UI.

- [ ] Install chess.js: `npm install chess.js` — handles all legal move generation and check detection
- [ ] Build an 8×8 board with CSS Grid
- [ ] Render pieces using Unicode chess symbols or SVG piece assets
- [ ] Highlight legal moves when a piece is selected
- [ ] Integrate with chess.js: `makeMove`, `isCheck`, `isCheckmate`, `isStalemate`
- [ ] Add move history panel (algebraic notation)
- [ ] Add a simple AI opponent using chess.js built-in random move or Stockfish WASM

---

### Phase 6: Monopoly (Weeks 12–16)

Monopoly is complex — break it into sub-systems and build them one by one.

- [ ] Build the board: 40 spaces, Konva.js canvas or custom SVG
- [ ] Implement dice roll and piece movement around the board
- [ ] Implement property purchase system
- [ ] Implement rent calculation (with houses and hotels)
- [ ] Implement Go, Jail, Free Parking, Tax spaces
- [ ] Implement the property trade UI (offer/counter/accept)
- [ ] Implement mortgage system
- [ ] Implement bankruptcy and game-over detection
- [ ] Add Chance and Community Chest card decks

---

## 8. How to Improve — Polish & Features

Once the core games work, these improvements transform a functional app into a genuinely great product.

### 8.1 Game Quality

| Feature | How |
|---|---|
| **Sound effects** | Use Howler.js. Add sounds for: card play, dice roll, piece move, win, UNO call. Even simple sounds make a huge difference to feel. |
| **Haptic feedback** | On mobile, use `navigator.vibrate()` on significant events (win, +4 card). Subtle but impactful. |
| **Animations** | Framer Motion for: cards flying to discard pile, pieces sliding across board, chips falling for Monopoly payments, confetti on win. |
| **Custom themes** | Let players choose board themes (classic, dark, retro pixel). Store preference in user profile. Implement with CSS variables — one theme change updates everything. |
| **Responsive design** | Make every game playable on mobile. Use CSS media queries. Consider touch-specific interactions (swipe to play card, tap to roll dice). |

### 8.2 Social Features

| Feature | What it does |
|---|---|
| **Emotes & reactions** | Predefined reactions players can send mid-game (thumbs up, laugh, angry). Show as floating animation above their avatar. |
| **Friend system** | Add friends, see when they are online, invite them to a game directly. |
| **Game invites** | Share a room link. When opened, automatically joins the lobby. |
| **Spectator mode** | Allow people to watch ongoing games without participating. Read-only game state stream. |
| **Player profiles** | Public profile page: win rate per game, recent games, favourite game, rank badge. |

### 8.3 Competitive Features

| Feature | What it does |
|---|---|
| **ELO rating system** | A standard competitive rating. Win against a higher-rated player = big ELO gain. Lose to a lower = big loss. Implement per game type. |
| **Leaderboards** | Top 100 per game. All-time and monthly. Show your rank and how far you are from the next rank. |
| **Achievements** | Badges for milestones: "Win 10 games of Chess", "Play a Wild +4 in UNO", "Survive Jail three times in Monopoly". |
| **Tournaments** | Bracket-style single-elimination tournaments. Players sign up, bracket is generated, games are played over a weekend. |
| **Daily challenges** | A daily puzzle: "Chess — mate in 2 moves", "UNO — what card should you play here?". Great for daily engagement. |

### 8.4 AI Opponents

| Difficulty | Approach |
|---|---|
| **Random bot** | On each turn, pick a random legal move. Good enough for Snakes & Ladders, UNO. |
| **Heuristic bot** | Write rules: "In UNO, always play +4 if you can", "In Ludo, prioritise moving the piece closest to home". |
| **Minimax (Chess)** | Classic game tree search algorithm. chess.js gives you legal moves, minimax evaluates positions. Add alpha-beta pruning for performance. |
| **Stockfish WASM** | Chess only. The world's best chess engine compiled to WebAssembly. Runs in the browser. Multiple difficulty levels built in. |

### 8.5 Technical Improvements

| Improvement | Details |
|---|---|
| **Game replays** | You are already storing `game_actions` in PostgreSQL. Build a replay UI that lets players step through any past game move by move. |
| **Offline support** | Use a service worker to let players view leaderboards and profiles without internet. Cache the React app with Workbox. |
| **PWA** | Turn the app into a Progressive Web App so players can install it on their phone home screen like a native app. |
| **Performance** | Use `React.memo` and `useMemo` to prevent unnecessary re-renders during fast-paced games. Profile with React DevTools. |
| **Automated testing** | Write unit tests for all game engines with Vitest. Test edge cases: UNO with one card left, Chess checkmate positions, Ludo piece at position 56. |

---

## 9. Skills You Will Build

This project is designed to teach you modern full-stack development through practical application.

### 9.1 By Game Phase

| Phase | Frontend skills | Backend skills |
|---|---|---|
| Snakes & Ladders | CSS Grid, React state, Framer Motion animations | Express server, Socket.io rooms, game state in memory |
| Ludo | SVG manipulation, coordinate systems, multi-player HUD | State machine pattern, multi-player socket management |
| UNO | Card hand component, fan layout, drag interaction | Deck class, shuffle algorithm, card validation logic |
| Chess | Complex conditional rendering, piece selection state | chess.js integration, move validation, game history |
| Monopoly | Konva.js canvas, drag and drop, complex UI state | Economy simulation, transaction system, Prisma queries |

### 9.2 Recurring Concepts (Learn Once, Use Everywhere)

- **State machines** — model every game as states and transitions. This pattern applies to UI, workflows, and backend systems everywhere.
- **Event-driven architecture** — Socket.io events teach you how distributed systems communicate. Used in every backend role.
- **Optimistic UI updates** — update the client immediately, then confirm with the server. Eliminates perceived latency.
- **Component composition** — small, reusable React components that combine into complex UIs. The foundation of all React development.
- **TypeScript generics** — shared game types that work for any game. Forces you to think in abstractions.
- **Database normalisation** — designing tables without duplication. Core SQL skill.
- **Caching strategy** — when to use Redis vs PostgreSQL. Applies to every backend system.

### 9.3 Resources to Learn Alongside This Project

| Resource | What it covers |
|---|---|
| **The Odin Project** (theodinproject.com) | Free full-stack curriculum. Read the React and Node sections alongside building your platform. |
| **Josh W Comeau** (joshwcomeau.com) | The best CSS and React animation tutorials on the internet. Essential for making your UI feel polished. |
| **Execute Program** (executeprogram.com) | TypeScript and SQL courses with interactive exercises. Learn the theory while you apply it. |
| **Fireship** (YouTube) | Short, high-quality videos on every technology in this stack. Watch the Socket.io and Redis videos. |
| **The Pragmatic Programmer** (book) | Read Chapter 3 (Basic Tools) and Chapter 5 (Bend or Break). The patterns described are exactly what this project teaches. |

---

## 10. Master Project Checklist

Work through this list from top to bottom. Tick items off as you complete them. Do not skip ahead — each item builds on the previous ones.

---

### ⚙️ Phase 0: Environment & Setup

- [ ] Node.js v20+ installed and working
- [ ] VS Code installed with ESLint, Prettier, TypeScript extensions
- [ ] Git installed and configured (name, email)
- [ ] GitHub account created, repository created for project
- [ ] Vite + React + TypeScript project initialised
- [ ] Tailwind CSS installed and working (test with a colored div)
- [ ] Node.js + Express backend created with TypeScript
- [ ] Prisma installed, schema created, local PostgreSQL connected
- [ ] Redis installed locally (or use Upstash free tier)
- [ ] Clerk or Supabase auth configured
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway
- [ ] Frontend makes a successful API call to deployed backend

---

### 🐍 Phase 1: Snakes & Ladders

- [ ] 10×10 board rendered as CSS Grid
- [ ] Cells numbered 1–100 with correct zigzag order
- [ ] Snake and ladder positions defined in a config object
- [ ] Cells with snakes/ladders visually distinguished
- [ ] Two player pieces rendered on the board
- [ ] Dice roller component with animated roll
- [ ] Turn alternation logic (Player 1 → Player 2 → Player 1)
- [ ] Piece movement with boundary check (max position 100)
- [ ] Snake/ladder teleportation on landing
- [ ] Win detection (first to reach exactly 100)
- [ ] Win screen with restart button
- [ ] Framer Motion animation for piece movement
- [ ] Socket.io multiplayer: create room, join room, sync dice and moves
- [ ] Room lobby: display room code, show connected players, start button
- [ ] Disconnection handling: pause game, show reconnect message

---

### 🏗️ Phase 2: Shared Infrastructure

- [ ] Generic `RoomManager` (backend): `createRoom`, `joinRoom`, `leaveRoom` for any game
- [ ] Generic `GameSession` component (frontend): plugs in any game board
- [ ] `PlayerHUD` component: avatars, names, scores, turn indicator
- [ ] `TurnTimer` component: countdown with visual ring
- [ ] `ChatBox` component: messages with player names
- [ ] `GameLog` component: scrollable event history
- [ ] `WinScreen` component: winner announcement, stats, rematch button
- [ ] Home page: grid of game cards with title, description, player count
- [ ] Lobby page: waiting room with player list and settings
- [ ] Auth: login/signup with Clerk, protect routes
- [ ] User profile: basic page with username and avatar

---

### 🎲 Phase 3: Ludo

- [ ] Ludo board designed as SVG with correct layout
- [ ] `BOARD_POSITIONS` lookup table for all 52 movement spaces + 4 home columns
- [ ] 4 players, 4 pieces each — all pieces start at home
- [ ] Two dice rolled simultaneously
- [ ] Piece enters on a roll of 6 from home
- [ ] Correct movement direction for each player (each has their own path)
- [ ] Capturing: landing on opponent piece sends it back to home
- [ ] Star/safe squares: no capturing on safe spaces
- [ ] Home column: last stretch of 5 spaces unique to each player
- [ ] Win condition: all 4 pieces reach the home triangle
- [ ] Bot player for solo mode (random legal moves)

---

### 🃏 Phase 4: UNO

- [ ] `Deck` class: 108 cards (Red/Blue/Green/Yellow 0–9, Skip, Reverse, +2 × 2 each, Wild × 4, +4 Wild × 4)
- [ ] Fisher-Yates shuffle algorithm implemented
- [ ] Deal 7 cards to each player at game start
- [ ] `CardHand` component with fan layout and hover-to-lift
- [ ] Discard pile showing top card
- [ ] Draw pile showing card back, click to draw
- [ ] Card legality check: must match color, number, or type
- [ ] Wild card: color chooser dialog
- [ ] +2 card: next player draws 2 (or stacks in No Mercy mode)
- [ ] Skip card: next player loses their turn
- [ ] Reverse card: direction changes
- [ ] +4 Wild: next player draws 4, color chooser for player who played it
- [ ] UNO call button: must press when down to 1 card
- [ ] Penalty: fail to call UNO and get caught = draw 2
- [ ] Win condition: first player to empty their hand
- [ ] UNO Flip variant: Flip card flips deck to dark side with harder cards
- [ ] UNO No Mercy variant: +2 and +4 can be stacked

---

### ♟️ Phase 5: Chess

- [ ] 8×8 board with alternating light/dark squares
- [ ] chess.js installed and integrated
- [ ] Pieces rendered (Unicode symbols or SVG assets)
- [ ] Click piece → highlight all legal moves for that piece
- [ ] Click destination → make move via chess.js
- [ ] Check: highlight king square in red when in check
- [ ] Checkmate detection and game over
- [ ] Stalemate detection and game over
- [ ] Move history panel with algebraic notation
- [ ] Undo move button (local single-player mode)
- [ ] AI opponent (random legal moves as minimum)
- [ ] Timer per player (optional but recommended)

---

### 🏦 Phase 6: Monopoly

- [ ] 40-space board rendered (Konva.js or custom SVG)
- [ ] All property groups with correct colors
- [ ] Dice roll and piece movement around the board
- [ ] Property purchase: land on unowned → offer to buy
- [ ] Rent payment: land on owned → pay owner
- [ ] House and hotel building system
- [ ] Rent scaling with house/hotel count
- [ ] Go: collect 200 when passing or landing
- [ ] Jail: Go to Jail space, In Jail logic, Get Out of Jail card/payment
- [ ] Free Parking: pool of taxes and fines
- [ ] Income Tax and Luxury Tax spaces
- [ ] Chance and Community Chest decks (draw card, execute effect)
- [ ] Property trading UI: offer properties and/or cash, counter-offer
- [ ] Mortgage system: mortgage property for half value, unmortgage with interest
- [ ] Bankruptcy: player cannot pay, must sell/trade, then eliminated
- [ ] Win condition: last player not bankrupt

---

### ✨ Improvements & Polish (Ongoing)

- [ ] Sound effects with Howler.js (dice, card play, win, piece move)
- [ ] Custom board themes (classic, dark, retro)
- [ ] Emotes/reactions system
- [ ] Friend system and online status
- [ ] Game invite links
- [ ] Spectator mode
- [ ] ELO rating per game type
- [ ] Leaderboards (all-time and monthly)
- [ ] Achievement system
- [ ] Player profile page with stats
- [ ] Game replay viewer
- [ ] Mobile responsive design
- [ ] PWA install support
- [ ] Unit tests for all game engines
- [ ] Daily chess puzzles
- [ ] Tournament bracket system

---

## 11. Quick Reference

### 11.1 Key Commands

```bash
# Create frontend
npm create vite@latest game-platform -- --template react-ts

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p

# Install Socket.io (backend)
npm install socket.io

# Install Socket.io (frontend)
npm install socket.io-client

# Install Prisma
npm install prisma @prisma/client && npx prisma init

# Run Prisma migration
npx prisma migrate dev --name init

# Install Framer Motion
npm install framer-motion

# Install Zustand
npm install zustand

# Install chess.js
npm install chess.js

# Install Howler.js
npm install howler @types/howler

# Install Konva
npm install konva react-konva

# Run dev servers (both at once)
npm install -D concurrently
# then in package.json scripts: "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\""
```

### 11.2 Useful Free Resources

| Resource | URL |
|---|---|
| Board game assets | boardgameatlas.com and itch.io |
| Chess pieces SVG | github.com/lichess-org/lila (open source) |
| Sound effects | freesound.org (Creative Commons) |
| Design tool | figma.com (free tier) |
| Hosted PostgreSQL | supabase.com (free tier) |
| Hosted Redis | upstash.com (10K requests/day free) |
| Frontend hosting | vercel.com (free tier) |
| Backend hosting | railway.app (free with $5 credit/month) |

---

*Build one game at a time. Ship early. Iterate often. Have fun.*