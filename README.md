# 🕵️ LAN Mafia — Offline Multiplayer Mafia Game

A server-authoritative multiplayer Mafia game designed to run completely over a local Wi-Fi network with **zero internet connection**.

---

## ⚡ Key Highlights (All 10 Phases Complete)

- **100% Offline & Self-Contained**: No external cloud servers, APIs, databases, or CDNs. Pure Node.js + WebSocket + React.
- **Server-Authoritative Architecture**: The host machine owns all state. Room codes, roles, secret chats, minigame evaluations, votes, and victory conditions are calculated and maintained in server memory.
- **Instant LAN Access & QR Code Joining**: Listens on `0.0.0.0` and generates an offline SVG QR code (`http://<LAN_IP>:3000/?join=CODE`) so players scan and join in seconds.
- **Configurable Syndicate Sizes**: Supports 4 to 15 players with host-configurable Mafia counts (1 for 4–6, 1–2 for 7–9, 1–3 for 10–12, 1–4 for 13–15).
- **Day & Night Cycles**:
  - **Day Phase**: Open discussion followed by majority-based secret voting with live tally animations and secret role reveals on elimination.
  - **Night Phase (60s)**: End-to-end encrypted Mafia syndicate chat & consensus target selection, simultaneous with civilian defense minigames.
  - **Dawn Announcement (7s)**: Concealed casualties where disappearances are announced without leaking roles or causes of death.
- **10 Touch-Friendly Defense Minigames**:
  1. `number-sequence`: Arithmetic sequence blank deduction.
  2. `memory-grid`: Flashing security tile pattern reproduction.
  3. `reaction-test`: Millisecond-bounded reflex override.
  4. `quick-math`: Fast generator calculation keypad.
  5. `color-match`: Stroop cognitive interference check (ink color vs. text).
  6. `odd-one-out`: Visual outlier surveillance identification.
  7. `find-number`: Rapid frequency signal interception matrix.
  8. `tap-in-order`: Circuit node ascending order synchronization.
  9. `pattern-completion`: Encrypted cipher stream symbol deduction.
  10. `count-shapes`: Perimeter threat sensor count census.
- **Dynamic Difficulty Progression**: Scales automatically from Easy (Rounds 1–2), Medium (Rounds 3–4), to Hard (Rounds 5+).
- **Full Reconnection Engine**: Session persistence across page reloads, tab switches, and Wi-Fi blips. Restores private roles, active minigames, votes, and chat history.
- **Seamless Multi-Match Replay**: After Game Over, players return to the lobby one-by-one or via host controls to immediately start consecutive matches without restarting the server.
- **📱 Standalone Android Server APK (`mafia-server.apk`)**:
  - Run the entire Node.js server directly on an Android smartphone!
  - Built-in network auto-discovery detects Mobile Hotspot (`192.168.43.1`) or Wi-Fi IP automatically.
  - One-tap **Copy Game Link**, **Open in Chrome**, and **Play in App** with an integrated full-screen WebView.
  - Persistent Android Foreground Service with WakeLock/WifiLock prevents CPU sleeping and keeps the game alive in the background.

---

## 📱 Running Directly on Android (Mobile Host APK)

You can host Mafia LAN entirely on your Android phone without needing a computer!

### 1. Install APK
- Transfer the generated [mafia-server.apk](file:///Users/krishshah/all%20coding%20stuff/mafia_lan/mafia-server.apk) to your Android phone and install it (enable "Install unknown apps" if prompted).

### 2. How to Host & Play
1. Turn on your phone's **Personal / Mobile Hotspot** (or connect to a local Wi-Fi router).
2. Open the **Mafia LAN Host** app.
3. The server starts automatically and displays your Join URL (e.g. `http://192.168.43.1:3000`).
4. Have your friends connect to your phone's Hotspot (or Wi-Fi).
5. Tap **📋 Copy Game Link** or **📡 Share Link** to send the link, or have them type it in their browser.
6. To join the game yourself on your host phone, either tap **🌐 Open in Chrome** or tap **🎮 Play in App** to play right inside the application!

### 3. Rebuilding the APK
To rebuild the Android APK at any time:
```bash
npm run build:android
```
The output APK is generated at `./mafia-server.apk` (and `android/app/build/outputs/apk/debug/app-debug.apk`).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18 or later (tested on Node 22 & 24)
- **Wi-Fi Router or Phone Hotspot**: Devices must be connected to the same local network. (No active internet connection required).

### 2. Install & Build
From the project root:
```bash
npm install
npm run build
```

### 3. Start the Server
```bash
npm start
```

Upon launching, the terminal will print the detected addresses:
```text
╔═══════════════════════════════════════════════════════════════╗
║               🕵️  LAN MAFIA SERVER IS READY                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Local:  http://localhost:3000                                ║
║  LAN:    http://192.168.1.15:3000                             ║
║                                                               ║
║  • Connect phones to the same Wi-Fi network                   ║
║  • No internet connection required                            ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📱 How to Play Over Local Wi-Fi

1. **Host Setup**:
   - Host runs `npm start` on a laptop or phone (Termux).
   - Host opens `http://localhost:3000` (or `http://<LAN_IP>:3000`).
   - Host enters their name and taps **Create Room**.
   - The server assigns a 4-letter room code (e.g. `M7K4`).

2. **Joining from other phones**:
   - Connect all phones to the same Wi-Fi network or hotspot.
   - **QR Code**: Host taps **Show QR**. Players scan to join instantly.
   - **Direct URL**: Players open `http://<LAN_IP>:3000`, enter their name and the 4-letter code.

3. **Game Loop**:
   - Host configures Mafia count and starts the game.
   - Secret roles are revealed with a countdown warning to hide screens.
   - Discussion and voting occur during the Day.
   - At Night, Mafia chats and selects a target while Civilians play their assigned defense minigames.
   - At Dawn, night casualties are revealed without exposing secret roles.
   - Matches conclude when either all Mafia are eliminated (Civilians win) or Mafia equal/exceed living Civilians (Mafia wins).
   - Players return to the lobby for another match!

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```

All 42 tests verify:
- Room creation and unambiguous 4-letter code generation
- Role balancing and non-deterministic assignment across 4–15 players
- Daytime voting, tie handling, majority elimination, and daytime role reveal
- Night phase 60s timer, encrypted Mafia chat privacy, and consensus target voting
- Challenge generation and anti-tamper validation across all 10 minigames
- Round-based difficulty progression (Easy, Medium, Hard)
- Simultaneous night casualties and strict death concealment
- Reconnection state restoration across all phases
- Host reassignment when host leaves
- Multi-match lobby returns and host force-return controls
- End-to-end multi-client WebSocket message synchronization

---

## 📁 Project Structure

```text
mafia_lan/
├── client/                     # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/         # Header, PlayerCard, QRCodeModal, minigames/
│   │   ├── hooks/              # useLobby (WebSocket & room state)
│   │   ├── lib/                # socketService, storage
│   │   ├── pages/              # Home, Lobby, Day, Voting, Night, Dawn, GameOver
│   │   ├── App.tsx
│   │   ├── index.css           # Noir aesthetic & responsive design tokens
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express + WebSocket backend
│   ├── src/
│   │   ├── game/               # GameEngine (roles, voting, win checks)
│   │   ├── minigames/          # MinigameEngine (10 games + difficulty scaling)
│   │   ├── room/               # Room and RoomManager
│   │   ├── utils/              # LAN IP detection, code generator
│   │   ├── websocket/          # wsHandler (connection lifecycle)
│   │   └── index.ts            # Server entry point (0.0.0.0:3000)
│   ├── package.json
│   └── tsconfig.json
├── shared/                     # Shared TypeScript protocol definitions
│   └── types.ts
├── package.json                # Root workspaces orchestrator
└── README.md
```
