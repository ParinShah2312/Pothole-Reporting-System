// Demo seed data: departments, one user per role, and reports around Vadodara in every stage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DEMO_USERS = [
  { name: 'Demo Admin', email: 'admin@demo.local', password: 'Admin@1234', role: 'admin' },
  { name: 'Road Officer (East Zone)', email: 'gov@demo.local', password: 'Gov@12345', role: 'government', dept: 'Road Maintenance – East Zone' },
  { name: 'Demo Citizen', email: 'citizen@demo.local', password: 'Citizen@123', role: 'citizen' },
];

const DEPARTMENTS = [
  ['Road Maintenance – North Zone', 'North'],
  ['Road Maintenance – South Zone', 'South'],
  ['Road Maintenance – East Zone', 'East'],
  ['Road Maintenance – West Zone', 'West'],
];

// [area, lat, lng, final status, days ago, description]
const REPORTS = [
  ['Alkapuri', 22.3106, 73.1700, 'active', 6, 'Deep pothole near the signal, two-wheelers swerving around it.'],
  ['Gotri Road', 22.3165, 73.1395, 'active', 3, 'Large pothole on the left lane after the rain.'],
  ['Karelibaug', 22.3280, 73.2070, 'active', 1, null],
  ['Fatehgunj', 22.3240, 73.1880, 'assigned', 9, 'Several small potholes merging into one.'],
  ['Akota', 22.2980, 73.1640, 'in_progress', 14, 'Pothole near the bridge approach.'],
  ['Manjalpur', 22.2711, 73.1950, 'repair_completed', 20, 'Broken patch near the crossroads.'],
  ['Sayajigunj', 22.3115, 73.1820, 'solved', 30, 'Pothole outside the main road junction.'],
  ['Waghodia Road', 22.2990, 73.2300, 'solved', 45, 'Crater-sized pothole near the petrol pump.'],
];

const FLOW = ['active', 'assigned', 'in_progress', 'repair_completed', 'solved'];

function copySeedImage(name) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
  fs.copyFileSync(path.join(here, '../seed-assets', name), path.join(env.uploadDir, `seed-${name}`));
  return `/uploads/seed-${name}`;
}

export async function seed() {
  const potholeUrl = copySeedImage('pothole.svg');
  const repairedUrl = copySeedImage('repaired.svg');

  await withTransaction(async (db) => {
    const deptIds = {};
    for (const [name, zone] of DEPARTMENTS) {
      const { rows } = await db.query(
        `INSERT INTO departments (name, zone) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET zone = EXCLUDED.zone RETURNING dept_id AS id`,
        [name, zone],
      );
      deptIds[name] = rows[0].id;
    }

    const userIds = {};
    for (const u of DEMO_USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, role, department_id) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING user_id AS id`,
        [u.name, u.email, hash, u.role, u.dept ? deptIds[u.dept] : null],
      );
      userIds[u.role] = rows[0].id;
    }

    const { rows: existing } = await db.query('SELECT count(*)::int AS n FROM reports');
    if (existing[0].n > 0) {
      console.log('reports already exist, skipping demo reports');
      return;
    }

    const govId = userIds.government;
    const deptId = deptIds['Road Maintenance – East Zone'];

    for (const [area, lat, lng, status, daysAgo, description] of REPORTS) {
      const at = (hoursAfter) => `now() - interval '${daysAgo} days' + interval '${hoursAfter} hours'`;
      const stepIndex = FLOW.indexOf(status);

      const { rows } = await db.query(
        `INSERT INTO reports (citizen_id, description, location, address, location_source,
                              gps_lat, gps_lng, gps_accuracy_m, pin_moved_m, status, department_id,
                              verified_at, solved_at, created_at, updated_at)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, 'gps',
                 $3, $4, 12, 0, $6, $7,
                 ${at(0.05)}, ${status === 'solved' ? at(96) : 'NULL'}, ${at(0)}, ${at(stepIndex * 24)})
         RETURNING report_id AS id`,
        [userIds.citizen, description, lat, lng, `${area}, Vadodara`, status, stepIndex >= 1 ? deptId : null],
      );
      const reportId = rows[0].id;

      const { rows: img } = await db.query(
        `INSERT INTO report_images (report_id, file_path, uploaded_at) VALUES ($1, $2, ${at(0)}) RETURNING image_id AS id`,
        [reportId, potholeUrl],
      );
      await db.query(
        `INSERT INTO ai_verifications (report_id, type, report_image_id, result, confidence, model_version, details, verified_at)
         VALUES ($1, 'initial', $2, 'accepted', $3, 'stub-0.1', '{"detected": true}', ${at(0.05)})`,
        [reportId, img[0].id, (0.78 + Math.random() * 0.2).toFixed(4)],
      );

      // Status history: submitted -> AI verified -> each government step
      const history = [[null, 'pending_verification', userIds.citizen, 'Report submitted', 0],
        ['pending_verification', 'active', null, 'AI pothole check: accepted', 0.05]];
      for (let i = 1; i <= stepIndex; i++) {
        const isAi = FLOW[i] === 'solved';
        history.push([FLOW[i - 1], FLOW[i], isAi ? null : govId, isAi ? 'Repair verified by AI' : null, i * 24]);
      }
      for (const [from, to, by, note, h] of history) {
        await db.query(
          `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note, changed_at)
           VALUES ($1, $2, $3, $4, $5, ${at(h)})`,
          [reportId, from, to, by, note],
        );
      }

      if (stepIndex >= 1) {
        const { rows: rep } = await db.query(
          `INSERT INTO repairs (report_id, dept_id, assigned_by, assigned_at, started_at, completed_at)
           VALUES ($1, $2, $3, ${at(24)}, ${stepIndex >= 2 ? at(48) : 'NULL'}, ${stepIndex >= 3 ? at(72) : 'NULL'})
           RETURNING repair_id AS id`,
          [reportId, deptId, govId],
        );
        if (status === 'solved') {
          const { rows: ci } = await db.query(
            `INSERT INTO completion_images (repair_id, file_path, location, distance_m, uploaded_by, uploaded_at)
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, 6, $5, ${at(95)}) RETURNING comp_img_id AS id`,
            [rep[0].id, repairedUrl, lat + 0.00004, lng, govId],
          );
          await db.query(
            `INSERT INTO ai_verifications (report_id, type, completion_image_id, result, confidence, model_version, details, verified_at)
             VALUES ($1, 'completion', $2, 'accepted', 0.9100, 'stub-0.1',
                     '{"repaired": true, "distance_m": 6, "same_location": true, "reasons": []}', ${at(96)})`,
            [reportId, ci[0].id],
          );
        }
      }
    }
    console.log(`seeded ${REPORTS.length} demo reports`);
  });

  console.log('demo users:');
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(10)} ${u.email} / ${u.password}`);
}

if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seed().finally(() => pool.end());
}
