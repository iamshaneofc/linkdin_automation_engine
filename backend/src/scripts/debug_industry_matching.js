
import pool from '../db.js';
import { INDUSTRY_KEYWORDS as industryKeywords } from '../config/industries.js';

// Helper: Normalize text for matching
function normalizeForMatch(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function debugMatching() {
    console.log("🔍 Starting Debug Matching...");

    try {
        // 1. Load Industry Metadata (Simulating loadIndustryMetadata)
        console.log("📥 Loading industries from DB...");
        const result = await pool.query(`
            SELECT code, name, top_level_industry, sub_category
            FROM linkedin_industries
        `);

        const allRows = [];
        for (const row of result.rows) {
            allRows.push({
                ...row,
                normalizedName: normalizeForMatch(row.name)
            });
        }

        // Sort by length desc
        const sortedIndustries = allRows.sort((a, b) => b.name.length - a.name.length);
        console.log(`✅ Loaded ${sortedIndustries.length} industries.`);
        console.log("Top 5 longest industries:", sortedIndustries.slice(0, 5).map(i => i.name));

        // 2. Load Sample Leads
        console.log("📥 Loading first 10 leads...");
        const leads = await pool.query("SELECT id, company, title FROM leads LIMIT 10");

        // 3. Run Matching Logic
        console.log("\n🧪 Testing Matching Logic:");

        for (const lead of leads.rows) {
            const text = `${(lead.company || "")} ${(lead.title || "")}`;
            const normalizedText = normalizeForMatch(text);

            console.log(`\nLead #${lead.id}: "${text}" (Norm: "${normalizedText}")`);

            let foundTopLevel = null;
            let foundSubName = null;
            let method = "NONE";

            // 1. Exact/Longest Match
            for (const ind of sortedIndustries) {
                if (normalizedText.includes(ind.normalizedName)) {
                    foundTopLevel = ind.top_level_industry;
                    if (ind.name !== ind.top_level_industry) {
                        foundSubName = ind.name;
                    }
                    method = "DB_EXACT";
                    console.log(`   -> Matched: "${ind.name}" (Top: ${foundTopLevel}, Sub: ${foundSubName})`);
                    break;
                }
            }

            // 2. Keyword Fallback
            if (!foundTopLevel) {
                for (const [industry, keywords] of Object.entries(industryKeywords)) {
                    if (keywords.some((k) => normalizedText.includes(k.toLowerCase()))) {
                        foundTopLevel = industry;
                        method = "KEYWORD";
                        console.log(`   -> Keyword Match: "${industry}"`);
                        break;
                    }
                }
            }

            if (!foundTopLevel) {
                console.log("   -> No match found (Other)");
            } else {
                console.log(`   => RESULT: Top="${foundTopLevel}", Sub="${foundSubName}", Method=${method}`);
            }
        }

        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

debugMatching();
