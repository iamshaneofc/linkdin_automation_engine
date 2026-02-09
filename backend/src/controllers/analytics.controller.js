import pool from "../db.js";
import { INDUSTRY_KEYWORDS as industryKeywords } from '../config/industries.js';

// Simple in-memory cache for LinkedIn industry metadata
let INDUSTRY_METADATA_CACHE = null;

/**
 * Load LinkedIn industry metadata from database
 * Replaces the old CSV-based approach
 */
async function loadIndustryMetadata() {
  if (INDUSTRY_METADATA_CACHE) return INDUSTRY_METADATA_CACHE;

  try {
    // Query all industries from database
    const result = await pool.query(`
      SELECT code, name, hierarchy, description, top_level_industry, sub_category
      FROM linkedin_industries
      ORDER BY code
    `);

    const allRows = [];
    const topLevel = {};
    const subcategoriesByTop = {};

    for (const row of result.rows) {
      const topName = row.top_level_industry;
      if (!topName) continue;

      // Collect for flat list
      allRows.push({
        ...row,
        normalizedName: normalizeForMatch(row.name)
      });

      // Build top-level industry map
      if (!topLevel[topName]) {
        topLevel[topName] = {
          code: row.code,
          name: topName,
          description: row.description,
        };
      }

      // Build sub-categories map (ALL descendants, not just direct children)
      if (row.name !== topName) {
        if (!subcategoriesByTop[topName]) {
          subcategoriesByTop[topName] = {};
        }
        subcategoriesByTop[topName][row.name] = {
          code: row.code,
          name: row.name,
          description: row.description
        };
      }
    }

    // Sort all rows:
    // 1. Sub-categories FIRST (so we match "Accounting" before "Professional Services" if text has both)
    // 2. Length descending (so we match "Residential Construction" before "Construction")
    const sortedIndustries = allRows.sort((a, b) => {
      const aIsSub = a.name !== a.top_level_industry;
      const bIsSub = b.name !== b.top_level_industry;

      if (aIsSub && !bIsSub) return -1;
      if (!aIsSub && bIsSub) return 1;

      return b.name.length - a.name.length;
    });

    // --- FIX FOR "Technology, Information and Media" ---
    // The DB might not distinctively group tech under this name (e.g. might be in "Professional Services").
    // But our config uses "Technology, Information and Media". To ensure sub-categories match,
    // we aggregate relevant tech sub-categories into this bucket.
    if (!subcategoriesByTop["Technology, Information and Media"]) {
      subcategoriesByTop["Technology, Information and Media"] = {};
    }

    // Populate the Tech bucket with any industry looking like tech
    allRows.forEach(row => {
      const name = row.name.toLowerCase();
      // Keywords that signal a tech sub-industry
      const isTech =
        name.includes("software") ||
        name.includes("technology") ||
        name.includes("information services") ||
        name.includes("internet") ||
        name.includes("computer") ||
        name.includes("it services") ||
        name.includes("data") ||
        name.includes("telecom") ||
        name.includes("network") ||
        name.includes("electronics") ||
        name.includes("media") ||
        name.includes("game development");

      if (isTech) {
        subcategoriesByTop["Technology, Information and Media"][row.name] = {
          code: row.code,
          name: row.name,
          description: row.description
        };
      }
    });

    INDUSTRY_METADATA_CACHE = { topLevel, subcategoriesByTop, sortedIndustries };
  } catch (err) {
    console.error(
      "[analytics.controller] Failed to load LinkedIn industry metadata from database:",
      err.message
    );
    // Fallback? or just empty
    INDUSTRY_METADATA_CACHE = {
      topLevel: {},
      subcategoriesByTop: {},
    };
  }

  return INDUSTRY_METADATA_CACHE;
}

// Helper: Normalize text for matching (remove punctuation, lower case)
function normalizeForMatch(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Map period to SQL interval
function intervalForPeriod(period) {
  const map = { daily: "1 day", weekly: "7 days", monthly: "30 days", yearly: "365 days" };
  return map[period] || "365 days";
}

// GET /api/analytics/dashboard
// Returns all dashboard analytics: lead scraping + campaign metrics, with optional period filter
export async function getDashboardAnalytics(req, res) {
  try {
    const { period = "monthly" } = req.query;
    const interval = intervalForPeriod(period);

    // Load LinkedIn industry hierarchy (top-level + sub-categories)
    const { topLevel, subcategoriesByTop, sortedIndustries } =
      await loadIndustryMetadata();

    // —— Lead Scraping & Extraction ——
    const totalLeads = await pool.query("SELECT COUNT(*) AS count FROM leads");
    const sourceBreakdown = await pool.query(
      "SELECT source, COUNT(*) AS count FROM leads GROUP BY source"
    );
    const sourceCount = sourceBreakdown.rows.reduce((acc, row) => {
      acc[row.source || "unknown"] = parseInt(row.count, 10);
      return acc;
    }, {});
    const withPhone = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE phone IS NOT NULL AND TRIM(phone) != ''"
    );
    const withEmail = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE email IS NOT NULL AND TRIM(email) != ''"
    );
    const actionableLeads = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE status = $1",
      ["approved"]
    );

    // Industry-wise distribution using shared config
    // Using the imported industryKeywords

    const industryCounts = {};
    const subIndustryCounts = {}; // { [topIndustry]: { [subName]: count } }
    // Initialize all industries with 0
    Object.keys(industryKeywords).forEach(industry => {
      industryCounts[industry] = 0;
    });

    const leadsForIndustry = await pool.query(
      "SELECT id, COALESCE(company,'') AS company, COALESCE(title,'') AS title FROM leads"
    );

    const preferredKeywords = (process.env.PREFERRED_COMPANY_KEYWORDS || '')
      .toLowerCase()
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Store scores to classify leads
    const leadScores = [];

    for (const row of leadsForIndustry.rows) {
      const text = `${(row.company || "").toLowerCase()} ${(row.title || "").toLowerCase()}`;
      let matchedIndustry = null;
      let score = 0;

      // Score based on preference keywords matching title/company
      if (preferredKeywords.length > 0) {
        if (preferredKeywords.some(k => text.includes(k))) {
          score += 50;
        }
      }

      // --- NEW MATCHING LOGIC ---

      const normalizedText = normalizeForMatch(text);
      let foundTopLevel = null;
      let foundSubName = null;

      // 1. Exact/Longest Sub-string Match against ALL industries
      for (const ind of sortedIndustries) {
        if (normalizedText.includes(ind.normalizedName)) {
          foundTopLevel = ind.top_level_industry;
          // If the matched industry is NOT the top level itself, it's a sub-category
          if (ind.name !== ind.top_level_industry) {
            foundSubName = ind.name;
          }
          break; // Stop at first (longest) match
        }
      }

      // 2. Fallback to Keyword matching (config/industries.js)
      if (!foundTopLevel) {
        for (const [industry, keywords] of Object.entries(industryKeywords)) {
          if (keywords.some((k) => normalizedText.includes(k.toLowerCase()))) {
            foundTopLevel = industry;
            break;
          }
        }
      }

      // 3. Refine Sub-Category (Token-Based Matching)
      // If we found a Top Level but NO sub-category, try to match sub-categories using loose tokens
      // This restores the "Computer Software" matching behavior from "software" text
      if (foundTopLevel && !foundSubName) {
        if (subcategoriesByTop[foundTopLevel]) {
          const subs = Object.values(subcategoriesByTop[foundTopLevel]);
          for (const sub of subs) {
            // Tokenize sub-category name: "Computer Software" -> ["computer", "software"]
            const tokens = sub.name.toLowerCase().split(/[\s,&\/-]+/).filter(t => t.length > 2);
            if (tokens.length === 0) continue;

            // Check if ANY significant token is in the text
            if (tokens.some(t => normalizedText.includes(t))) {
              foundSubName = sub.name;
              break; // Stop at first token match
            }
          }
        }
      }

      // Final Assignment
      if (foundTopLevel) {
        industryCounts[foundTopLevel] = (industryCounts[foundTopLevel] || 0) + 1;

        if (foundSubName) {
          if (!subIndustryCounts[foundTopLevel]) {
            subIndustryCounts[foundTopLevel] = {};
          }
          subIndustryCounts[foundTopLevel][foundSubName] = (subIndustryCounts[foundTopLevel][foundSubName] || 0) + 1;
        }

        // Score bonus
        if (preferredKeywords.some(pk => foundTopLevel.toLowerCase().includes(pk))) {
          score += 20;
        }
      } else {
        industryCounts['Other'] = (industryCounts['Other'] || 0) + 1;
      }

      // Random tie-breaker for consistent sorting if scores are equal
      leadScores.push(score + Math.random());
    }

    // Sort scores descending
    leadScores.sort((a, b) => b - a);

    const totalScored = leadScores.length;
    let primaryCount = 0;
    let secondaryCount = 0;
    let tertiaryCount = 0;

    if (totalScored > 0) {
      // Top 20%
      const primaryCutoffIndex = Math.floor(totalScored * 0.20);
      // Next 30% (so up to 50%)
      const secondaryCutoffIndex = Math.floor(totalScored * 0.50);

      primaryCount = primaryCutoffIndex;
      secondaryCount = secondaryCutoffIndex - primaryCutoffIndex;
      tertiaryCount = totalScored - secondaryCutoffIndex;

      // Handle edge case of small numbers
      if (totalScored < 5) {
        primaryCount = totalScored;
        secondaryCount = 0;
        tertiaryCount = 0;
      }
    }

    const industryDistribution = Object.entries(industryCounts)
      .map(([name, count]) => {
        const subCounts = subIndustryCounts[name] || {};
        const subCategories = Object.entries(subCounts)
          .map(([subName, subCount]) => ({
            name: subName,
            count: subCount,
            code:
              subcategoriesByTop[name]?.[subName]?.code ||
              null,
          }))
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count);

        if (req.query.preferences === 'true' && name === 'Other') {
          return null;
        }

        return {
          industry: name,
          count,
          code: topLevel[name]?.code || null,
          subCategories,
        };
      })
      .filter(item => item && item.count > 0) // Only include valid industries with leads
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Extraction by period (leads created in last interval)
    const extractionByPeriod = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE created_at >= NOW() - $1::interval",
      [interval]
    );

    // Connection type breakdown - Query actual connection degrees from database
    // PhantomBuster stores values like "1st", "2nd", "3rd" in connection_degree column
    const connectionBreakdownResult = await pool.query(`
      SELECT 
        connection_degree,
        COUNT(*) as count
      FROM leads
      WHERE connection_degree IS NOT NULL AND connection_degree != ''
      GROUP BY connection_degree
    `);

    const connectionBreakdown = {
      firstDegree: 0,
      secondDegree: 0,
      thirdDegree: 0,
    };

    // Map the results to our breakdown object
    connectionBreakdownResult.rows.forEach(row => {
      const degree = (row.connection_degree || '').toLowerCase().trim();
      const count = parseInt(row.count, 10);

      if (degree.includes('1st') || degree === '1') {
        connectionBreakdown.firstDegree += count;
      } else if (degree.includes('2nd') || degree === '2') {
        connectionBreakdown.secondDegree += count;
      } else if (degree.includes('3rd') || degree === '3') {
        connectionBreakdown.thirdDegree += count;
      }
    });

    // —— Campaign Analytics ——
    const campaignStatus = await pool.query(`
      SELECT status, COUNT(*) AS count FROM campaigns GROUP BY status
    `);
    const statusCounts = campaignStatus.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});
    const activeCampaigns = statusCounts.active || 0;
    const completedCampaigns = statusCounts.completed || 0;
    const scheduledCampaigns = await pool.query(`
      SELECT COUNT(*) AS count FROM campaigns
      WHERE status = $1 AND schedule_start > NOW()
    `, ["draft"]).then((r) => parseInt(r.rows[0]?.count || 0, 10));

    // Get messages sent count (campaign_leads with status sent, replied, or completed)
    const messagesSentResult = await pool.query(`
      SELECT COUNT(*) AS count FROM campaign_leads
      WHERE status IN ('sent', 'replied', 'completed')
    `);
    const totalMessagesSent = parseInt(messagesSentResult.rows[0]?.count || 0, 10);

    // Campaign types breakdown - group by type, NULL types show as messages_sent
    const campaignTypesResult = await pool.query(`
      SELECT 
        CASE 
          WHEN type IS NULL OR type = '' THEN 'messages_sent'
          ELSE type
        END AS type,
        COUNT(*) AS count 
      FROM campaigns 
      GROUP BY 
        CASE 
          WHEN type IS NULL OR type = '' THEN 'messages_sent'
          ELSE type
        END
      ORDER BY count DESC
    `);

    // Build type breakdown
    const typeBreakdown = {};
    campaignTypesResult.rows.forEach(row => {
      const type = row.type;
      const count = parseInt(row.count || 0, 10);

      if (type === 'messages_sent') {
        // For messages_sent, use actual messages sent count
        typeBreakdown.messages_sent = totalMessagesSent > 0 ? totalMessagesSent : count;
      } else {
        typeBreakdown[type] = count;
      }
    });

    // If no campaigns exist but we have messages sent, show it
    if (Object.keys(typeBreakdown).length === 0 && totalMessagesSent > 0) {
      typeBreakdown.messages_sent = totalMessagesSent;
    }

    const repliesResult = await pool.query(`
      SELECT COUNT(*) AS count FROM campaign_leads WHERE status = $1
    `, ["replied"]);
    const totalSent = parseInt(messagesSentResult.rows[0]?.count || 0, 10);
    const totalReplied = parseInt(repliesResult.rows[0]?.count || 0, 10);
    const engagementLevel = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    // Campaign totals by period (campaigns created in interval)
    const campaignsByPeriod = await pool.query(
      "SELECT COUNT(*) AS count FROM campaigns WHERE created_at >= NOW() - $1::interval",
      [interval]
    );
    const campaignLeadsByPeriod = await pool.query(
      "SELECT COUNT(*) AS count FROM campaign_leads cl WHERE cl.created_at >= NOW() - $1::interval",
      [interval]
    );
    const messagesSentByPeriod = await pool.query(
      `SELECT COUNT(*) AS count FROM campaign_leads
       WHERE status IN ('sent', 'replied', 'completed') AND last_activity_at >= NOW() - $1::interval`,
      [interval]
    );

    const response = {
      period,
      leadScraping: {
        totalLeads: parseInt(totalLeads.rows[0]?.count || 0, 10),
        sourceCount,
        leadsWithPhone: parseInt(withPhone.rows[0]?.count || 0, 10),
        leadsWithEmail: parseInt(withEmail.rows[0]?.count || 0, 10),
        actionableLeads: parseInt(actionableLeads.rows[0]?.count || 0, 10),
        industryDistribution,
        extractionByPeriod: {
          count: parseInt(extractionByPeriod.rows[0]?.count || 0, 10),
          interval,
        },
        connectionBreakdown: {
          firstDegree: connectionBreakdown.firstDegree,
          secondDegree: connectionBreakdown.secondDegree,
          thirdDegree: connectionBreakdown.thirdDegree,
        },
        leadQuality: {
          primary: primaryCount,
          secondary: secondaryCount,
          tertiary: tertiaryCount,
          totalScored: totalScored
        },
      },
      campaignAnalytics: {
        statusOverview: {
          active: activeCampaigns,
          completed: completedCampaigns,
          scheduled: scheduledCampaigns,
          draft: statusCounts.draft || 0,
        },
        typeBreakdown: typeBreakdown,
        messaging: {
          messagesSent: totalSent,
          repliesReceived: totalReplied,
          engagementPercent: engagementLevel,
        },
        totalsByPeriod: {
          campaigns: parseInt(campaignsByPeriod.rows[0]?.count || 0, 10),
          leadsAdded: parseInt(campaignLeadsByPeriod.rows[0]?.count || 0, 10),
          messagesSent: parseInt(messagesSentByPeriod.rows[0]?.count || 0, 10),
          engagement: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
        },
      },
    };

    return res.json(response);
  } catch (err) {
    console.error("Dashboard analytics error:", err);
    res.status(500).json({ error: err.message });
  }
}
