# 🚀 Migration Commands - Quick Reference

## 📋 **Choose Your Method**

### **Method 1: Batch Script (Easiest)**
```cmd
cd z:\linkedin-automation-engine3\linkedin-automation-engine
run-migrations.bat
```
- ✅ Interactive prompts
- ✅ Automatic verification
- ✅ Error handling

---

### **Method 2: PowerShell Script**
```powershell
cd z:\linkedin-automation-engine3\linkedin-automation-engine
.\run-migrations.ps1
```
- ✅ Interactive prompts
- ✅ Automatic verification
- ✅ Secure password input

---

### **Method 3: Direct psql Commands**

**Step 1: Set your database connection**
```cmd
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=linkedin_automation
set PGUSER=postgres
```

**Step 2: Run migrations**
```cmd
cd z:\linkedin-automation-engine3\linkedin-automation-engine

psql -f backend\database\migrations\018_add_profile_id_and_scraper_cache.sql

psql -f backend\database\migrations\019_create_scraping_jobs.sql
```

**Step 3: Verify**
```cmd
psql -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('scraped_contacts', 'scraping_jobs');"

psql -c "SELECT COUNT(*) FROM leads WHERE linkedin_profile_id IS NOT NULL;"
```

---

### **Method 4: Using Database GUI**

If you have **pgAdmin**, **DBeaver**, or any PostgreSQL GUI:

1. Open your database tool
2. Connect to `linkedin_automation` database
3. Open SQL editor
4. Copy contents of `backend\database\migrations\018_add_profile_id_and_scraper_cache.sql`
5. Execute
6. Copy contents of `backend\database\migrations\019_create_scraping_jobs.sql`
7. Execute

---

## 🔍 **Verification Queries**

After running migrations, verify with these SQL queries:

### **Check Tables Created**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('scraped_contacts', 'scraping_jobs')
ORDER BY table_name;
```
**Expected**: 2 rows (scraped_contacts, scraping_jobs)

---

### **Check Profile ID Column Added**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND column_name = 'linkedin_profile_id';
```
**Expected**: 1 row (linkedin_profile_id)

---

### **Check Profile IDs Backfilled**
```sql
SELECT COUNT(*) as total_leads,
       COUNT(linkedin_profile_id) as with_profile_id,
       COUNT(linkedin_url) as with_url
FROM leads;
```
**Expected**: with_profile_id should equal with_url (all LinkedIn URLs converted to IDs)

---

### **Check Functions Created**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
    'get_active_scraping_progress', 
    'get_scraping_stats', 
    'sync_contacts_to_leads'
)
ORDER BY routine_name;
```
**Expected**: 3 rows (all 3 functions)

---

### **Check Triggers Created**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trigger_sync_contacts_to_leads',
    'trigger_update_scraping_jobs_updated_at'
)
ORDER BY trigger_name;
```
**Expected**: 2 rows (both triggers)

---

### **Test Profile ID Extraction**
```sql
SELECT 
    id,
    linkedin_url,
    linkedin_profile_id
FROM leads
WHERE linkedin_url IS NOT NULL
LIMIT 5;
```
**Expected**: linkedin_profile_id should be extracted from linkedin_url
- URL: `https://www.linkedin.com/in/john-doe-12345678/`
- ID: `john-doe-12345678`

---

## 🐛 **Troubleshooting**

### **Error: "psql: command not found"**
**Solution**: Add PostgreSQL bin directory to PATH
```cmd
set PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin
```
(Adjust version number as needed)

---

### **Error: "password authentication failed"**
**Solution**: Check your PostgreSQL password
```cmd
psql -U postgres -d linkedin_automation
# Enter password when prompted
```

---

### **Error: "database does not exist"**
**Solution**: Create the database first
```sql
CREATE DATABASE linkedin_automation;
```

---

### **Error: "relation already exists"**
**Solution**: Tables already created, migrations already run. You can skip or drop and re-run:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('scraped_contacts', 'scraping_jobs');

-- If you want to re-run migrations, drop tables first (CAUTION: deletes data!)
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS scraped_contacts CASCADE;
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_profile_id;
```

---

## ✅ **Success Indicators**

After successful migration, you should see:

1. ✅ **2 new tables**: `scraped_contacts`, `scraping_jobs`
2. ✅ **1 new column**: `leads.linkedin_profile_id`
3. ✅ **3 new functions**: `get_active_scraping_progress()`, `get_scraping_stats()`, `sync_contacts_to_leads()`
4. ✅ **2 new triggers**: `trigger_sync_contacts_to_leads`, `trigger_update_scraping_jobs_updated_at`
5. ✅ **Profile IDs backfilled**: All leads with LinkedIn URLs have profile IDs

---

## 🎯 **After Migration**

1. **Restart backend server**:
   ```cmd
   pm2 restart backend
   # OR
   npm run dev
   ```

2. **Test the workflow**:
   - Go to Leads page
   - Approve some leads
   - Check backend logs for "AUTO-SCRAPING CONTACTS"
   - See Contact column populated in UI

3. **Monitor scraping**:
   ```sql
   -- Check active jobs
   SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 5;
   
   -- Check scraped contacts
   SELECT * FROM scraped_contacts ORDER BY created_at DESC LIMIT 10;
   
   -- Check leads with contact info
   SELECT id, full_name, email, phone 
   FROM leads 
   WHERE email IS NOT NULL OR phone IS NOT NULL
   ORDER BY updated_at DESC 
   LIMIT 10;
   ```

---

**Need help?** Check `IMPLEMENTATION_COMPLETE.md` for full documentation.
