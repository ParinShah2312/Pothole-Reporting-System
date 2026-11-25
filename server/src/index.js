import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

await pool.query('SELECT 1'); // fail fast if the database is unreachable

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
