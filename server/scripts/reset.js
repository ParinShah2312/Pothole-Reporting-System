// DEV ONLY: drops everything in the database, then re-runs migrations and seed.
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to reset a production database');

await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
console.log('database cleared');
await migrate();
await seed();
await pool.end();
