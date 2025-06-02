// migration.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');

const fixPhoneNumberIndex = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URI);
    
    // Drop the problematic index
    await User.collection.dropIndex('phoneNumber_1');
    
    // Remove null phoneNumber values
    await User.updateMany(
      { phoneNumber: null }, 
      { $unset: { phoneNumber: "" } }
    );
    
    // Create new sparse index
    await User.collection.createIndex(
      { phoneNumber: 1 }, 
      { unique: true, sparse: true }
    );
    
    console.log('Phone number index fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

fixPhoneNumberIndex();