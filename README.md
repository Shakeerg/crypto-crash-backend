Sure! Here's a professional and well-structured `README.md` file for your "Crypto Crash" backend project, incorporating the details you provided while maintaining a clear format with the appropriate headings.

```markdown
# Crypto Crash Backend

A scalable backend for "Crypto Crash," a real-time multiplayer crash game where players bet in USD (converted to BTC/ETH) and cash out before the game crashes. Built with Node.js, Express, Socket.IO, and MongoDB, this project leverages the CoinGecko API for live cryptocurrency prices and ensures provably fair gameplay.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
  - [Place a Bet](#place-a-bet)
  - [Cash Out](#cash-out)
  - [Check Player Balance](#check-player-balance)
- [WebSocket Events](#websocket-events)
  - [Emitted Events](#emitted-events)
  - [Client-Sent Events](#client-sent-events)
- [Provably Fair Crash Algorithm](#provably-fair-crash-algorithm)
- [USD-to-Crypto Conversion](#usd-to-crypto-conversion)
- [Development Workflow](#development-workflow)
  - [Git Branching Strategy](#git-branching-strategy)
  - [Commit Guidelines](#commit-guidelines)
  - [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
  - [CORS Issues](#cors-issues)
  - [Bet Placement Timing](#bet-placement-timing)
- [License](#license)

## Project Overview

Crypto Crash is a real-time multiplayer betting game where players place bets in USD, converted to cryptocurrency (BTC/ETH), and aim to cash out before the multiplier crashes. The backend handles game logic, real-time updates via WebSocket, and persistent storage with MongoDB. The project ensures fairness through a provably fair crash algorithm and provides a seamless experience with live crypto price integration.

## Features

- **Real-Time Gameplay:** Manages game rounds (pending, active, crashed) with Socket.IO for low-latency updates.
- **Betting and Cashout:** Supports USD-to-crypto conversion for bets and cashouts, with API and WebSocket interfaces.
- **Provably Fair:** Implements a cryptographically secure crash point generation algorithm, verifiable by players.
- **Multiplayer Support:** Broadcasts game events to all connected clients, enabling a multiplayer experience.
- **Persistent Storage:** Stores game rounds, bets, and transactions in MongoDB with atomic balance updates.
- **Live Crypto Prices:** Integrates CoinGecko API for real-time BTC/ETH prices, cached for performance.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Real-Time Communication:** Socket.IO
- **Database:** MongoDB (with Mongoose)
- **API Integration:** CoinGecko API (via Axios)
- **Caching:** Node-Cache (for price caching)
- **Development Tools:** Nodemon, http-server

## Setup Instructions

### Prerequisites

- **Node.js:** v18 or later
- **MongoDB:** Local instance or MongoDB Atlas
- **Git:** For version control and cloning the repository
- **NPM:** For dependency management

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/crypto-crash-backend.git
   cd crypto-crash-backend
   ```

2. **Switch to the Main Branch:** Ensure you're on the main branch:

   ```bash
   git checkout main
   git pull origin main
   ```

3. **Install Dependencies:**

   ```bash
   npm install
   ```

4. **Configure Environment Variables:** Create a `.env` file in the project root:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/crypto_crash
   COINGECKO_API_URL=https://api.coingecko.com/api/v3
   ```

   Replace `MONGODB_URI` with your MongoDB connection string if using MongoDB Atlas.

   Ensure `.env` is added to `.gitignore` to prevent accidental commits of sensitive data.

### Database Setup

1. **Start MongoDB:** Ensure your MongoDB instance is running (e.g., `mongod` for a local instance).

2. **Populate Sample Data:** Run the provided script to seed the database with sample players (player1, player2, player3) and initial balances:

   ```bash
   node src/scripts/populateDb.js
   ```

### Running the Application

1. **Start the Backend Server:** Use nodemon for development with hot-reloading:

   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:3000`.

2. **Serve the WebSocket Client:** Serve the frontend client (`test/websocketClient.html`) using http-server:

   ```bash
   npm install -g http-server
   http-server -p 8080
   ```

   Access the client at `http://localhost:8080/test/websocketClient.html`.

## API Endpoints

### Place a Bet

- **Endpoint:** `/api/game/bet`
- **Method:** `POST`
- **Request Body:**

   ```json
   {
     "playerId": "player1",
     "usdAmount": 10,
     "currency": "BTC",
     "roundId": 55
   }
   ```

- **Success Response (200):**

   ```json
   {
     "cryptoAmount": 0.00016667,
     "price": 60000
   }
   ```

- **Error Response (400):**

   ```json
   { "error": "Invalid round" }
   ```

### Cash Out

- **Endpoint:** `/api/game/cashout`
- **Method:** `POST`
- **Request Body:**

   ```json
   {
     "playerId": "player1",
     "roundId": 55,
     "multiplier": 1.5
   }
   ```

- **Success Response (200):**

   ```json
   {
     "payoutCrypto": 0.000250005,
     "payoutUsd": 15
   }
   ```

- **Error Response (400):**

   ```json
   { "error": "Round not active" }
   ```

### Check Player Balance

- **Endpoint:** `/api/game/balance/:playerId`
- **Method:** `GET`
- **Example:** `/api/game/balance/player1`
- **Success Response (200):**

   ```json
   {
     "playerId": "player1",
     "balances": [
       { "currency": "BTC", "cryptoAmount": 0.1, "usdEquivalent": 6000 },
       { "currency": "ETH", "cryptoAmount": 2, "usdEquivalent": 5000 }
     ]
   }
   ```

- **Error Response (404):**

   ```json
   { "error": "Player not found" }
   ```

## WebSocket Events

### Emitted Events

- **roundStart:**

   **Payload:**

   ```json
   { "roundId": 55, "status": "pending" }
   ```

- **multiplierUpdate:**

   **Payload:**

   ```json
   { "multiplier": 1.01 }
   ```

- **playerCashout:**

   **Payload:**

   ```json
   {
     "playerId": "player1",
     "multiplier": 1.5,
     "payoutUsd": 15
   }
   ```

- **roundCrash:**

   **Payload:**

   ```json
   { "crashPoint": 2.5 }
   ```

- **error:**

   **Payload:**

   ```json
   { "message": "Round not active" }
   ```

### Client-Sent Events

- **cashout:**

   **Payload:**

   ```json
   { "playerId": "player1", "roundId": 55 }
   ```

## Provably Fair Crash Algorithm

The game ensures fairness through a provably fair crash point generation algorithm:

1. Generate a random 4-byte value: `crypto.randomBytes(4)`.
2. Convert to an integer: `h = parseInt(randomBytes.toString('hex'), 16)`.
3. Compute the crash point: `e = 2^32`, `crashPoint = (e - h) / (e - 1) * 100`, with a minimum of 1x.
4. Store the seed, hash, and crash point in MongoDB for transparency.
5. Verify the crash point using `verifyCrashPoint` in `provablyFair.js`.

## USD-to-Crypto Conversion

### Bet Placement

1. Fetch the current cryptocurrency price (BTC/ETH) from CoinGecko.
2. Cache the price for 10 minutes to avoid rate limits.
3. Convert USD to crypto: `cryptoAmount = usdAmount / price`.

   **Example:** $10 bet with BTC at $60,000 → `10 / 60000 = 0.00016667 BTC`.

### Cashout

1. Calculate USD payout: `payoutUsd = bet.usdAmount * multiplier`.
2. Convert to crypto: `payoutCrypto = payoutUsd / currentPrice`.

   **Example:** Cashout at 2x with a $10 bet, BTC at $60,000 → `$10 * 2 = $20`, then `20 / 60000 = 0.00033334 BTC`.

## Development Workflow

### Git Branching Strategy

This project follows a Gitflow-inspired branching model:

- **Main Branch (main):** Stable, production-ready code. All features are merged here via pull requests.
- **Feature Branches (feature/*):** Used for new features or bug fixes (e.g., `feature/add-cashout-api`).
- **Hotfix Branches (hotfix/*):** For urgent fixes to `main` (e.g., `hotfix/cors-issue`).

### Workflow:

1. Create a feature branch:

   ```bash
   git checkout -b feature/<feature-name>
   ```

2. Commit changes (see guidelines below).
3. Push the branch and create a pull request:

   ```bash
   git push origin feature/<feature-name>
   ```

4. Merge into main after review.

### Commit Guidelines

Adhere to conventional commits for clarity:

- **Format:** `<type>(<scope>): <description>`
- **Types:** feat, fix, docs, chore, test.

**Example:** `feat(api): add cashout endpoint`.

### Examples:

```bash
git commit -m "feat(betting): implement bet placement endpoint"
git commit -m "fix(websocket): resolve cashout sync issue"
git commit -m "docs(readme): update setup instructions"
```

### Contributing

1. Fork the repository (if you are an external contributor).
2. Clone and create a feature branch (as above).
3. Follow the setup instructions.
4. Make changes, adhering to commit guidelines.
5. Push the branch and create a pull request against `main`.
6. Ensure all tests pass (if tests are added in the future).

## Troubleshooting

### CORS Issues

If you encounter "Failed to Fetch" errors due to CORS:

1. Add CORS middleware in `server.js`:

   ```javascript
   const cors = require('cors');
   app.use(cors({
     origin: 'http://localhost:8080',
     methods: ['GET', 'POST'],
     credentials: true
   }));
   ```

2. Install the CORS package:

   ```bash
   npm install cors
   ```

### Bet Placement Timing

Bets are only allowed during the pending phase (10 seconds at the start of each round):

- Monitor the client UI for **Status: pending** or server logs for **Round X started with status: pending**.
- If the pending phase is missed, wait for the next round (15–125 seconds, depending on the crash point).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
```

This `README.md` provides comprehensive coverage of the project's features, setup instructions, API documentation, and development workflow, ensuring clarity and professionalism. Replace `yourusername` in the repository URL with your GitHub username or the actual repository location, and feel free to adjust any details as necessary!