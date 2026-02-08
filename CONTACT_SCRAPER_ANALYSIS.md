# Contact Scraper - Current State Analysis & Implementation Plan

**Date**: 2026-02-07  
**Objective**: Implement database-first, profile ID-based contact scraping with global caching

---

## 📊 CURRENT STATE ANALYSIS

### ✅ What Already EXISTS

#### 1. **Contact Scraper Service** (`backend/src/services/contact-scraper.service.js`)
- ✅ Puppeteer-based LinkedIn scraping
- ✅ Stealth plugin for detection avoidance
- ✅ Session cookie authentication
- ✅ Modal-based contact extraction (email, phone, birthday, website)
- ✅ Job tracking with `activeJobs` Map
- ✅ Cancellation support
- ✅ Random delays between profiles (3-7 seconds)
- ✅ Pre-check to avoid re-scraping leads with existing email/phone

#### 2. **Database Schema** (`backend/database/schema.sql`)
```sql
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    linkedin_url VARCHAR(500) UNIQUE,  -- ⚠️ Used as identifier, not profile ID
    email VARCHAR(255),                 -- ✅ Contact storage exists
    phone VARCHAR(50),                  -- ✅ Contact storage exists
    review_status VARCHAR(50),          -- ✅ Approval workflow exists
    ...
);
```

#### 3. **Campaign Integration** (`backend/src/controllers/campaign.controller.js`)
- ✅ `/api/campaigns/:id/scrape-contacts` endpoint (line 735)
- ✅ `/api/campaigns/scrape-status/:jobId` endpoint (line 838)
- ✅ Scraping triggered from campaign page
- ✅ Pre-check logic to skip leads with existing contacts

#### 4. **Lead Approval Workflow** (`backend/src/controllers/lead.controller.js`)
- ✅ Bulk approve endpoint: `/api/leads/bulk-approve` (line 1123)
- ✅ Bulk reject endpoint: `/api/leads/bulk-reject` (line 1174)
- ✅ Move to review endpoint: `/api/leads/move-to-review` (line 1257)
- ✅ Review stats endpoint: `/api/leads/review-stats` (line 1301)
- ✅ Audit logging for status changes

#### 5. **Frontend - Leads Table** (`frontend/src/components/LeadsTable.jsx`)
- ✅ Review status tabs (To Be Reviewed / Approved / Rejected)
- ✅ Bulk action buttons (Approve / Reject)
- ✅ Gated "Add to Campaign" and "Bulk Enrich" (Approved tab only)
- ✅ Table columns: Name, Company, Title, Status, Profile, Actions
- ❌ **NO Contact column** (email/phone not displayed)

---

## ❌ CRITICAL GAPS (What's MISSING)

### 🔴 **Gap 1: No LinkedIn Profile ID Tracking**
**Current**: Uses `linkedin_url` (VARCHAR) as unique identifier  
**Problem**: 
- URLs can have variations (`/in/john-doe/` vs `/in/john-doe`)
- No extracted profile ID stored in database
- Cannot efficiently check "Have I seen this profile before?"

**Required**:
```sql
-- Need to add:
ALTER TABLE leads ADD COLUMN linkedin_profile_id VARCHAR(100) UNIQUE;
CREATE INDEX idx_leads_profile_id ON leads(linkedin_profile_id);
```

---

### 🔴 **Gap 2: No Global Scraper Database**
**Current**: Contact data stored in `leads` table per campaign  
**Problem**:
- Same profile scraped multiple times across campaigns
- No global "scraped contacts" cache
- Wastes time re-scraping known profiles

**Required**: New table for global scraper cache
```sql
CREATE TABLE scraped_contacts (
    linkedin_profile_id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(50),
    birthday VARCHAR(50),
    website VARCHAR(500),
    first_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scrape_attempts INT DEFAULT 1,
    scrape_status VARCHAR(20) DEFAULT 'success', -- success, failed, na
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraped_contacts_status ON scraped_contacts(scrape_status);
CREATE INDEX idx_scraped_contacts_scraped_at ON scraped_contacts(last_scraped_at);
```

---

### 🔴 **Gap 3: Campaign-Scoped Logic (Not Global)**
**Current**: `scrapeCampaignContacts(campaignId, leadIds)` - operates per campaign  
**Problem**:
- Pre-check only looks at leads in current campaign
- Profile scraped in Campaign A will be re-scraped in Campaign B
- No workspace-level deduplication

**Required**: Refactor to global profile-based scraping
```javascript
// OLD (campaign-scoped):
async scrapeCampaignContacts(campaignId, leadIds) {
    // Checks: leads in THIS campaign with missing email/phone
}

// NEW (global profile-based):
async scrapeProfiles(profileIds) {
    // 1. Check scraped_contacts table FIRST
    // 2. Only scrape profiles NOT in cache
    // 3. Store results in global cache
    // 4. Sync to leads table
}
```

---

### 🔴 **Gap 4: No Approval-Triggered Scraping**
**Current**: Scraping only triggered from campaign page manually  
**Problem**:
- User approves 100 leads → no automatic scraping
- Must remember to go to campaign and click "Scrape Contacts"
- Breaks desired workflow: Approve → Auto-scrape → Add to Campaign

**Required**: Hook into `bulkApproveLeads` function
```javascript
// In lead.controller.js - bulkApproveLeads()
export async function bulkApproveLeads(req, res) {
    // ... existing approval logic ...
    
    // 🆕 NEW: Trigger contact scraping asynchronously
    const approvedLeadIds = result.rows.map(r => r.id);
    triggerContactScrapingForLeads(approvedLeadIds).catch(err => {
        console.error('Background scraping error:', err);
        // Don't block approval on scraping failure
    });
    
    res.json({ success: true, ... });
}
```

---

### 🔴 **Gap 5: No Contact Column in UI**
**Current**: Leads table shows Name, Company, Title, Status, Profile, Actions  
**Problem**:
- User cannot see email/phone without clicking into lead details
- No visual feedback on scraping progress
- Cannot tell which leads have contact info

**Required**: Add Contact column between Status and Profile
```jsx
<TableHead>Contact</TableHead>

// In table body:
<TableCell>
    <div className="flex flex-col gap-1 text-xs">
        {lead.email ? (
            <div className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span>{lead.email}</span>
            </div>
        ) : (
            <span className="text-muted-foreground">—</span>
        )}
        {lead.phone ? (
            <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{lead.phone}</span>
            </div>
        ) : (
            <span className="text-muted-foreground">—</span>
        )}
    </div>
</TableCell>
```

---

### 🔴 **Gap 6: No Global Progress Tracking**
**Current**: Job status only available via `/api/campaigns/scrape-status/:jobId`  
**Problem**:
- No workspace-level "X% of profiles scraped"
- User doesn't know if background scraping is happening
- No progress bar in Settings

**Required**: 
1. New table for scraping jobs
2. Global progress endpoint
3. Settings page progress bar

```sql
CREATE TABLE scraping_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50), -- 'approval_trigger', 'campaign_manual', 'bulk_rescrape'
    total_profiles INT,
    processed_profiles INT DEFAULT 0,
    found_contacts INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed, cancelled
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_by INT REFERENCES users(id)
);
```

---

### 🔴 **Gap 7: No Retry Logic with NA Markers**
**Current**: If scraping fails, returns `{ email: null, phone: null }`  
**Problem**:
- Failed profiles will be retried endlessly
- No "NA" marker to indicate "we tried and found nothing"
- Wastes time on profiles with no public contact info

**Required**: Store scrape attempts and mark as NA
```javascript
// After scraping attempt:
if (!contactData.email && !contactData.phone) {
    // Mark as NA in scraped_contacts
    await pool.query(`
        INSERT INTO scraped_contacts (linkedin_profile_id, scrape_status, scrape_attempts)
        VALUES ($1, 'na', 1)
        ON CONFLICT (linkedin_profile_id) 
        DO UPDATE SET scrape_attempts = scraped_contacts.scrape_attempts + 1,
                      scrape_status = 'na',
                      last_scraped_at = CURRENT_TIMESTAMP
    `, [profileId]);
}
```

---

### 🔴 **Gap 8: No Profile ID Extraction Logic**
**Current**: Works with full `linkedin_url`  
**Problem**: Cannot extract profile ID from URL

**Required**: Utility function
```javascript
function extractLinkedInProfileId(url) {
    // https://www.linkedin.com/in/john-doe-12345678/ → john-doe-12345678
    // https://linkedin.com/in/jane-smith → jane-smith
    const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
    return match ? match[1].toLowerCase().trim() : null;
}
```

---

## 🎯 IMPLEMENTATION ROADMAP

### **Phase 1: Database Foundation** ⏱️ 30 mins
**Files to create/modify**:
1. `backend/database/migrations/018_add_profile_id_and_scraper_cache.sql`
2. `backend/database/migrations/019_create_scraping_jobs.sql`

**Tasks**:
- [ ] Create `scraped_contacts` table
- [ ] Create `scraping_jobs` table
- [ ] Add `linkedin_profile_id` column to `leads` table
- [ ] Backfill profile IDs from existing `linkedin_url` values
- [ ] Create indexes

---

### **Phase 2: Core Scraper Refactor** ⏱️ 2 hours
**Files to modify**:
1. `backend/src/services/contact-scraper.service.js` (MAJOR REFACTOR)
2. `backend/src/utils/linkedin.utils.js` (NEW FILE)

**Tasks**:
- [ ] Create `extractLinkedInProfileId()` utility
- [ ] Refactor `scrapeCampaignContacts()` → `scrapeProfiles(profileIds)`
- [ ] Implement database-first lookup in `scraped_contacts`
- [ ] Add retry logic (max 1 retry, then mark NA)
- [ ] Store results in global cache
- [ ] Sync cache to `leads` table
- [ ] Remove time limits
- [ ] Add fault tolerance (continue on single failure)

---

### **Phase 3: Approval Integration** ⏱️ 1 hour
**Files to modify**:
1. `backend/src/controllers/lead.controller.js`
2. `backend/src/services/contact-scraper.service.js`

**Tasks**:
- [ ] Add `triggerContactScrapingForLeads()` helper
- [ ] Hook into `bulkApproveLeads()` endpoint
- [ ] Make scraping async (non-blocking)
- [ ] Handle bulk approval edge cases

---

### **Phase 4: UI - Contact Column** ⏱️ 1 hour
**Files to modify**:
1. `frontend/src/components/LeadsTable.jsx`

**Tasks**:
- [ ] Add Contact column header
- [ ] Render email with Mail icon
- [ ] Render phone with Phone icon
- [ ] Show "Pending" if scraping in progress
- [ ] Show "—" or "NA" if no data
- [ ] Adjust table layout (no horizontal overflow)

---

### **Phase 5: Settings Progress Bar** ⏱️ 45 mins
**Files to modify**:
1. `frontend/src/pages/Settings.jsx` (or create if doesn't exist)
2. `backend/src/controllers/scraper.controller.js` (NEW)

**Tasks**:
- [ ] Create `/api/scraper/global-progress` endpoint
- [ ] Add progress bar component to Settings page
- [ ] Show "X% complete - scraping contact details in background"
- [ ] Auto-update every 5 seconds (polling or WebSocket)

---

### **Phase 6: API Endpoints** ⏱️ 30 mins
**Files to create/modify**:
1. `backend/src/routes/scraper.routes.js` (NEW)
2. `backend/src/controllers/scraper.controller.js` (NEW)

**Endpoints to create**:
- [ ] `GET /api/scraper/global-progress` - workspace-level progress
- [ ] `GET /api/scraper/jobs` - list recent scraping jobs
- [ ] `POST /api/scraper/trigger` - manual trigger for specific leads
- [ ] `GET /api/scraper/stats` - overall stats (total scraped, success rate, etc.)

---

## 📋 DETAILED TASK CHECKLIST

### **Database Tasks**
- [ ] Create migration: `018_add_profile_id_and_scraper_cache.sql`
- [ ] Create migration: `019_create_scraping_jobs.sql`
- [ ] Test migrations on dev database
- [ ] Verify indexes created correctly
- [ ] Backfill existing leads with profile IDs

### **Backend Tasks**
- [ ] Create `linkedin.utils.js` with profile ID extraction
- [ ] Refactor scraper service to use profile IDs
- [ ] Implement global cache lookup
- [ ] Add retry logic with NA markers
- [ ] Hook scraping into approval workflow
- [ ] Create scraper controller
- [ ] Create scraper routes
- [ ] Add global progress tracking
- [ ] Test scraper with 10 profiles
- [ ] Test scraper with 100 profiles
- [ ] Test cancellation mid-scrape
- [ ] Test retry logic
- [ ] Test NA marker storage

### **Frontend Tasks**
- [ ] Add Contact column to LeadsTable
- [ ] Import Mail and Phone icons from lucide-react
- [ ] Implement conditional rendering (email/phone/pending/NA)
- [ ] Test column layout (no overflow)
- [ ] Add progress bar to Settings page
- [ ] Implement polling for progress updates
- [ ] Test progress bar with active scraping
- [ ] Test progress bar completion (100%)

### **Integration Testing**
- [ ] Test: Approve 1 lead → scraping triggers
- [ ] Test: Approve 50 leads → scraping triggers
- [ ] Test: Same profile in 2 campaigns → scraped once
- [ ] Test: Approval → scraping → campaign add flow
- [ ] Test: Failed scrape → retry → NA marker
- [ ] Test: Cancellation works correctly
- [ ] Test: Progress bar updates in real-time
- [ ] Test: Contact column shows correct data

---

## 🚨 NON-GOALS (What NOT to Do)

- ❌ Do NOT add `contact_status` enum to leads table
- ❌ Do NOT create new approval states
- ❌ Do NOT block approval on scraping
- ❌ Do NOT add time limits to scraper
- ❌ Do NOT re-scrape existing profiles
- ❌ Do NOT require page refresh to see updates

---

## 📊 SUCCESS METRICS

After implementation, we should achieve:

1. **Zero Duplicate Scraping**: Same profile never scraped twice
2. **Instant Approval**: Approval completes in <500ms (scraping async)
3. **Clear UI Feedback**: User always knows scraping status
4. **Fault Tolerance**: Single profile failure doesn't crash batch
5. **Massive Time Savings**: 1000 profiles across 5 campaigns = 1000 scrapes (not 5000)

---

## 🔄 MIGRATION STRATEGY

### Step 1: Deploy Database Changes
```bash
cd backend
psql -U postgres -d linkedin_automation -f database/migrations/018_add_profile_id_and_scraper_cache.sql
psql -U postgres -d linkedin_automation -f database/migrations/019_create_scraping_jobs.sql
```

### Step 2: Backfill Profile IDs
```sql
UPDATE leads 
SET linkedin_profile_id = LOWER(TRIM(REGEXP_REPLACE(linkedin_url, '.*linkedin\.com/in/([^/\?]+).*', '\1')))
WHERE linkedin_url IS NOT NULL 
  AND linkedin_profile_id IS NULL;
```

### Step 3: Deploy Backend Code
- Deploy refactored scraper service
- Deploy new endpoints
- Deploy approval hooks

### Step 4: Deploy Frontend Code
- Deploy Contact column
- Deploy Settings progress bar

### Step 5: Verify
- Check scraping logs
- Verify no duplicate scrapes
- Test approval workflow end-to-end

---

## 📝 NEXT STEPS

**Ready to implement?** I will proceed in this order:

1. ✅ Create database migrations
2. ✅ Create LinkedIn utils
3. ✅ Refactor scraper service
4. ✅ Hook into approval workflow
5. ✅ Add Contact column to UI
6. ✅ Add Settings progress bar
7. ✅ Create API endpoints
8. ✅ Integration testing

**Estimated Total Time**: 6-7 hours of focused development

---

**Status**: 📋 Analysis Complete - Ready for Implementation  
**Last Updated**: 2026-02-07 20:28
