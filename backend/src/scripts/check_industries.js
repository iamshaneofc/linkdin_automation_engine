
import pool from '../db.js';

async function listTopLevels() {
    try {
        const result = await pool.query(`
            SELECT DISTINCT top_level_industry FROM linkedin_industries ORDER BY top_level_industry
        `);
        console.log("--- DB Top Level Industries ---");
        result.rows.forEach(r => console.log(r.top_level_industry));

        console.log("\n--- Searching for 'Software' ---");
        const soft = await pool.query(`
             SELECT * FROM linkedin_industries WHERE name ILIKE '%Software%' OR name ILIKE '%Technology%'
        `);
        soft.rows.forEach(r => console.log(`${r.name} (${r.hierarchy})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listTopLevels();
