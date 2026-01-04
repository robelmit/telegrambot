const mongoose = require('mongoose');

async function addBalance() {
  await mongoose.connect('mongodb://localhost:27017/efayda');
  
  const result = await mongoose.connection.db.collection('users').updateMany(
    {},
    { $inc: { walletBalance: 500 } }
  );
  
  console.log(`Updated ${result.modifiedCount} users, added 500 to their balance`);
  
  // Show updated users
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  users.forEach(u => {
    console.log(`User ${u.telegramId}: balance = ${u.walletBalance}`);
  });
  
  await mongoose.disconnect();
}

addBalance().catch(console.error);
