
import pool from './src/db.js';

async function checkSources() {
    try {
        const res = await pool.query('SELECT source, COUNT(*) as count FROM leads GROUP BY source');
        console.log('--- LEADS BY SOURCE ---');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSources();
