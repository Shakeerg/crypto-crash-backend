Crypto Crash Backend
This is the backend for "Crypto Crash," an online crash game where players bet in USD, converted to cryptocurrency (BTC/ETH), and cash out before the game crashes. The project uses Node.js, Express, MongoDB, Socket.IO, and the CoinGecko API for real-time crypto prices.
Setup Instructions
Prerequisites

Node.js (v18 or later)
MongoDB (local or Atlas)
Git

Installation

Clone the repository:
git clone <repository-url>
cd crypto-crash-backend


Install dependencies:
npm install


Create a .env file in the root directory:
PORT=3000
MONGODB_URI=mongodb://localhost:27017/crypto_crash
COINGECKO_API_URL=https://api.coingecko.com/api/v3

Replace MONGODB_URI with your MongoDB connection string if using MongoDB Atlas.

Populate the database with sample data:
node src/scripts/populateDb.js

This creates 3 players (player1, player2, player3) with initial balances in BTC and ETH.

Start the server:
npm run dev

The server will run on http://localhost:3000.


Running the WebSocket Client

Serve test/websocketClient.html on http://localhost:8080/test/websocketClient.html using a simple HTTP server (e.g., http-server):
npm install -g http-server
http-server -p 8080


Open the URL in your browser to interact with the game.


API Endpoints
Place a Bet

URL: /api/game/bet

Method: POST

Request Body:
{
  "playerId": "player1",
  "usdAmount": 10,
  "currency": "BTC",
  "roundId": 55
}


Response (Success):
{
  "cryptoAmount": 0.00016667,
  "price": 60000
}


Response (Error):
{ "error": "Invalid round" }



Cash Out

URL: /api/game/cashout

Method: POST

Request Body:
{
  "playerId": "player1",
  "roundId": 55,
  "multiplier": 1.5
}


Response (Success):
{
  "payoutCrypto": 0.000250005,
  "payoutUsd": 15
}


Response (Error):
{ "error": "Round not active" }



Check Player Balance

URL: /api/game/balance/:playerId

Method: GET

Example: /api/game/balance/player1

Response (Success):
{
  "playerId": "player1",
  "balances": [
    { "currency": "BTC", "cryptoAmount": 0.1, "usdEquivalent": 6000 },
    { "currency": "ETH", "cryptoAmount": 2, "usdEquivalent": 5000 }
  ]
}


Response (Error):
{ "error": "Player not found" }



WebSocket Events

roundStart

Payload: { "roundId": 55, "status": "pending" }


multiplierUpdate

Payload: { "multiplier": 1.01 }


playerCashout

Payload:{
  "playerId": "player1",
  "multiplier": 1.5,
  "payoutUsd": 15
}




roundCrash

Payload: { "crashPoint": 2.5 }


error

Payload: { "message": "Round not active" }



Sending a Cashout Request

Event: cashout
Payload: { "playerId": "player1", "roundId": 55 }



Provably Fair Crash Algorithm
The crash point is generated using a cryptographically secure method to ensure fairness:

Generate a random 4-byte value using crypto.randomBytes(4).
Convert it to an integer: h = parseInt(randomBytes.toString('hex'), 16).
Compute the crash point: e = 2^32, crashPoint = (e - h) / (e - 1) * 100, with a minimum of 1x.
The seed, hash, and crash point are stored in the database for transparency.
Players can verify the crash point using the verifyCrashPoint function in provablyFair.js.

USD-to-Crypto Conversion Logic
Bet Placement:

Fetch the current price of the chosen cryptocurrency (BTC/ETH) from CoinGecko.
Cache the price for 10 minutes to avoid rate limits.
Convert USD to crypto: cryptoAmount = usdAmount / price.

Example: $10 bet with BTC at $60,000 → 10 / 60000 = 0.00016667 BTC.
Cashout:

Calculate USD payout: payoutUsd = bet.usdAmount * multiplier.
Convert to crypto: payoutCrypto = payoutUsd / currentPrice.

Example: Cashout at 2x with a $10 bet, BTC at $60,000 → $10 * 2 = $20, then 20 / 60000 = 0.00033334 BTC.
Approach Overview
Game Logic:

A game loop runs on the server, managing round states (pending, active, crashed) and emitting updates via WebSocket.
MongoDB stores game rounds, player bets, and transactions.

Crypto Integration:

CoinGecko API provides real-time prices, cached for 10 minutes.
Simulated wallets store crypto balances, updated atomically at the document level.

WebSockets:

Socket.IO broadcasts game events to all clients, ensuring a real-time multiplayer experience.
Cashout requests are handled via WebSocket for low latency.

Challenges:

Fixed CORS issues by adding the cors middleware.
Ensured bet placement only occurs during the pending phase, with guidance on timing in the README.

Troubleshooting
Handling Failed to Fetch Error
Add CORS middleware to Express in server.js:
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST'],
  credentials: true
}));

Install the cors package:
npm install cors

Handling Bet Placement Timing
Bets can only be placed during the pending phase, which lasts 10 seconds at the start of each round. 

Monitor the client UI for Status: pending or server logs for Round X started with status: pending.
If you miss the pending phase, wait for the next round (approximately 15–125 seconds, depending on the crash point).

License
This project is licensed under the MIT License - see the LICENSE file for details.
