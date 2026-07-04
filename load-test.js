// load-test.js

import http from 'http';

const BASE_URL = 'http://localhost:5000';
const TOTAL_USERS = 200;
const DURATION_MS = 60000;
const DELAY = DURATION_MS / TOTAL_USERS;

let success = 0;
let failed = 0;

const randomStr = (len) => Math.random().toString(36).substring(2, 2 + len);

const register = (index) => {
  return new Promise((resolve) => {
    const user_name = `loadtest_${randomStr(8)}_${index}_${Date.now()}`;
    const data = JSON.stringify({
      user_name,
      password: 'Test1234!',
      role: 'operator',
      assigned_building: 'Building A',
      factory: 'Factory 1'
    });

    const req = http.request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          success++;
          console.log(`[${success + failed}] OK: ${user_name}`);
        } else {
          failed++;
          console.log(`[${success + failed}] FAIL: ${res.statusCode} - ${body.slice(0, 50)}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      failed++;
      console.log(`[${success + failed}] ERROR: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
};

const start = Date.now();
console.log(`Starting load test: ${TOTAL_USERS} registrations over ${DURATION_MS / 1000}s`);
console.log('---');

const promises = [];
for (let i = 0; i < TOTAL_USERS; i++) {
  promises.push(
    new Promise(async (resolve) => {
      await register(i);
      if (i < TOTAL_USERS - 1) {
        await new Promise(r => setTimeout(r, DELAY));
      }
      resolve();
    })
  );
}

await Promise.all(promises);

const elapsed = ((Date.now() - start) / 1000).toFixed(2);
console.log('---');
console.log(`Done in ${elapsed}s | Success: ${success} | Failed: ${failed}`);