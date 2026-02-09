
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pool from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CSV file
const CSV_PATH = path.resolve(__dirname, '../../linkedin_industry_code_v2_all_eng.csv');

async function seedIndustries() {
    console.log('🌱 Seeding LinkedIn Industries...');

    try {
        if (!fs.existsSync(CSV_PATH)) {
            console.error('❌ CSV file not found:', CSV_PATH);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const records = parse(fileContent, {
            columns: false, // The CSV has no header
            skip_empty_lines: true,
            relax_column_count: true
        });

        console.log(`📊 Found ${records.length} industry records.`);

        // Truncate existing table
        await pool.query('TRUNCATE TABLE linkedin_industries RESTART IDENTITY');

        let insertedCount = 0;

        for (const record of records) {
            // CSV Format: code, name, hierarchy, description
            // e.g. "47","Accounting","Professional Services > Accounting","This industry includes..."
            const code = record[0];
            const name = record[1];
            const hierarchy = record[2];
            const description = record[3];

            if (!code || !name) continue;

            // Parse hierarchy to get top-level and sub-category
            // Hierarchy format: "Top Level > Sub Category > Specific"
            const parts = hierarchy.split(' > ');
            const topLevel = parts[0];

            // Sub-category logic:
            // If hierarchy is "Top", sub is null
            // If "Top > Sub", sub is "Sub"
            // If "Top > Sub > Specific", sub is "Sub"
            let subCategory = null;
            if (parts.length > 1) {
                subCategory = parts[1];
            }

            await pool.query(
                `INSERT INTO linkedin_industries 
                (code, name, hierarchy, description, top_level_industry, sub_category) 
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    hierarchy = EXCLUDED.hierarchy,
                    description = EXCLUDED.description,
                    top_level_industry = EXCLUDED.top_level_industry,
                    sub_category = EXCLUDED.sub_category`,
                [code, name, hierarchy, description, topLevel, subCategory]
            );

            insertedCount++;
        }

        console.log(`✅ Successfully seeded ${insertedCount} industries.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedIndustries();
