import mongoose from 'mongoose';

const uri = process.env.DATABASE_URL;
if (!uri) {
  throw new Error('DATABASE_URL is not set — configure it in .env');
}

/**
 * Global cache — Next.js hot-reload creates a new module context on every
 * change; without this cache we'd open a fresh Mongoose connection each time
 * and eventually exhaust the pool.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cached: Cache = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cached;

export async function connectDb(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri!, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

// Import models so schemas are registered when this module is imported.
// (Mongoose model registration is a side effect of importing the file.)
import './models';
