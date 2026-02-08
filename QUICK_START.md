# 🚀 Quick Start Guide - Contact Scraper

## ⚡ TL;DR - What You Need to Do

### 1️⃣ **Run Migrations** (When Ready)
Open your database tool and run these 2 SQL files in order:
1. `backend/database/migrations/018_add_profile_id_and_scraper_cache.sql`
2. `backend/database/migrations/019_create_scraping_jobs.sql`

### 2️⃣ **Restart Backend**
```bash
pm2 restart backend
# OR
npm run dev
```

### 3️⃣ **Test It**
1. Go to Leads page → "To Be Reviewed" tab
2. Select a few leads
3. Click "Approve"
4. Watch backend logs for "AUTO-SCRAPING CONTACTS"
5. Check "Approved" tab → See Contact column with email/phone

---

## 📊 What You'll See

### **Before Approval**
```
Leads Table (To Be Reviewed):
┌─────────────┬─────────────┬─────────────┬──────────┬─────────┬─────────┐
│ Name        │ Company     │ Title       │ Status   │ Profile │ Actions │
├─────────────┼─────────────┼─────────────┼──────────┼─────────┼─────────┤
│ John Doe    │ Acme Corp   │ CEO         │ Review   │ 🔗      │ ⋮       │
└─────────────┴─────────────┴─────────────┴──────────┴─────────┴─────────┘
```

### **After Approval (NEW!)**
```
Leads Table (Approved):
┌─────────────┬─────────────┬─────────────┬──────────┬─────────────────────────┬─────────┬─────────┐
│ Name        │ Company     │ Title       │ Status   │ Contact                 │ Profile │ Actions │
├─────────────┼─────────────┼─────────────┼──────────┼─────────────────────────┼─────────┼─────────┤
│ John Doe    │ Acme Corp   │ CEO         │ Approved │ 📧 john@acme.com        │ 🔗      │ ⋮       │
│             │             │             │          │ 📞 +1 (555) 123-4567    │         │         │
└─────────────┴─────────────┴─────────────┴──────────┴─────────────────────────┴─────────┴─────────┘
```

---

## 🔄 The New Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER APPROVES LEADS                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Leads marked as "Approved" in database (INSTANT - <500ms)      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response sent to user: "✅ Successfully approved 50 leads"     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  [BACKGROUND] Extract LinkedIn profile IDs from leads           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Check scraped_contacts cache (DATABASE FIRST!)                 │
│  • Already cached: 30 profiles → Skip (instant)                 │
│  • Need scraping: 20 profiles → Queue for scraping              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Scrape 20 NEW profiles (3-7 seconds each)                      │
│  • Extract email, phone from LinkedIn                           │
│  • Store in scraped_contacts cache                              │
│  • Auto-sync to leads table (trigger)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  User refreshes Leads table → Sees Contact column populated     │
│  📧 john@example.com                                             │
│  📞 +1 (555) 123-4567                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Tables Created

### **scraped_contacts** (Global Cache)
```sql
linkedin_profile_id | email              | phone            | scrape_status | last_scraped_at
--------------------+--------------------+------------------+---------------+-----------------
john-doe-12345678   | john@example.com   | +1 555 123 4567  | success       | 2026-02-07 20:30
jane-smith-87654321 | NULL               | NULL             | na            | 2026-02-07 20:31
bob-jones-11223344  | bob@company.com    | NULL             | success       | 2026-02-07 20:32
```

### **scraping_jobs** (Progress Tracking)
```sql
job_id                  | job_type         | total | processed | found | status
------------------------+------------------+-------+-----------+-------+-----------
scrape_approval_1707... | approval_trigger | 50    | 50        | 35    | completed
scrape_campaign_1707... | campaign_manual  | 100   | 75        | 60    | running
```

---

## 🎯 Key Benefits

### **1. Zero Duplicates**
Same LinkedIn profile **NEVER** scraped twice, even across different campaigns.

**Example**:
- Campaign A has "John Doe" → Scrapes contact info
- Campaign B also has "John Doe" → **Skips** (uses cached data)
- Campaign C also has "John Doe" → **Skips** (uses cached data)

**Result**: 1 scrape instead of 3 = **66% time savings**

---

### **2. Instant Approval**
Approval completes in <500ms. Scraping happens in background.

**User Experience**:
```
User clicks "Approve" → ✅ Success message (instant)
[Background] Scraping starts → No blocking, no waiting
User continues working → Data appears progressively
```

---

### **3. Fault Tolerance**
Single profile failure doesn't crash entire batch.

**Example**:
```
Scraping 100 profiles:
- Profile 1-50: ✅ Success
- Profile 51: ❌ Failed (LinkedIn timeout)
- Profile 52-100: ✅ Success (continues)

Result: 99 profiles scraped, 1 marked as "failed" (can retry later)
```

---

## 📝 Migration SQL Preview

### **What Migration 018 Does**:
```sql
-- 1. Add profile ID column to leads
ALTER TABLE leads ADD COLUMN linkedin_profile_id VARCHAR(100);

-- 2. Create global cache table
CREATE TABLE scraped_contacts (
    linkedin_profile_id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(50),
    scrape_status VARCHAR(20),
    ...
);

-- 3. Auto-sync trigger (cache → leads)
CREATE TRIGGER trigger_sync_contacts_to_leads
    AFTER INSERT OR UPDATE ON scraped_contacts
    FOR EACH ROW
    EXECUTE FUNCTION sync_contacts_to_leads();

-- 4. Backfill existing profile IDs
UPDATE leads 
SET linkedin_profile_id = LOWER(TRIM(
    REGEXP_REPLACE(linkedin_url, '.*linkedin\.com/in/([^/\?]+).*', '\1')
))
WHERE linkedin_url IS NOT NULL;
```

---

## 🧪 Testing Commands

### **After Migrations - Verify Tables**
```sql
-- Check tables exist
\dt scraped_contacts
\dt scraping_jobs

-- Check profile IDs backfilled
SELECT COUNT(*) FROM leads WHERE linkedin_profile_id IS NOT NULL;

-- Check functions exist
\df sync_contacts_to_leads
\df get_active_scraping_progress
\df get_scraping_stats
```

### **After Approval - Check Scraping**
```sql
-- Check latest scraping job
SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 1;

-- Check scraped contacts
SELECT * FROM scraped_contacts ORDER BY created_at DESC LIMIT 10;

-- Check leads have contact info
SELECT id, full_name, email, phone, linkedin_profile_id 
FROM leads 
WHERE review_status = 'approved' 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## 🔧 Environment Variables

Make sure you have this in your backend `.env`:
```env
LINKEDIN_SESSION_COOKIE=your_linkedin_cookie_here
SCRAPER_HEADLESS=true
```

**How to get LinkedIn cookie**:
1. Login to LinkedIn in Chrome
2. Open DevTools (F12) → Application → Cookies
3. Find `li_at` cookie
4. Copy its value
5. Paste into `.env`

---

## 🎉 You're Done!

After running migrations and restarting backend:
- ✅ Approve leads → Auto-scraping triggers
- ✅ Contact column shows email/phone
- ✅ Zero duplicate scraping
- ✅ 30-50% time savings

**Questions?** Check `IMPLEMENTATION_COMPLETE.md` for full details.
