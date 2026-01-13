import mongoose from "mongoose";
import config from "../utils/config.js";

main().catch((error) => console.error("MongoDB Connection Failed", error));

async function main() {
  try {
    // Use DB_URL directly without appending DB_NAME since it's already in the URL
    const connectionString = config.DB_URL;
    console.log(`Connecting to MongoDB: ${connectionString}`);
    
    await mongoose.connect(connectionString, {
      // Add these options for better connection handling
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("MongoDB Connected Successfully!");
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

export default mongoose;