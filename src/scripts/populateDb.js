const mongoose = require('mongoose');
const Player = require('../models/player');

async function populateDb() {
  try {
    await mongoose.connect('mongodb://localhost:27017/crypto_crash');
    console.log('Connected to MongoDB');

    await Player.deleteMany({});
    console.log('Cleared existing players');

    const players = [
      {
        playerId: 'player1',
        balances: [
          { currency: 'BTC', amount: 0.1 },
          { currency: 'ETH', amount: 2 }
        ]
      },
      {
        playerId: 'player2',
        balances: [
          { currency: 'BTC', amount: 0.05 },
          { currency: 'ETH', amount: 1 }
        ]
      },
      {
        playerId: 'player3',
        balances: [
          { currency: 'BTC', amount: 0.03 },
          { currency: 'ETH', amount: 0.5 }
        ]
      }
    ];

    await Player.insertMany(players);
    console.log('Inserted sample players');

    console.log('Database population complete');
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

populateDb();