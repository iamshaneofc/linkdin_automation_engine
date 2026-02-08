# Environment Variables Setup Guide

## Required PhantomBuster Configuration

To make the **Bulk Enrich & Personalize** feature work end-to-end, you need to configure these Phantom IDs in your `backend/.env` file:

### 1. Profile Scraper (For Enrichment)
**Required for scraping LinkedIn bio data:**
```env
PROFILE_SCRAPER_PHANTOM_ID=your_phantom_id_here
```

**What it does:** Scrapes full LinkedIn profile data (bio, interests, recent posts) when you click "Bulk Enrich & Personalize"

**How to get it:**
- Go to PhantomBuster dashboard
- Find your "LinkedIn Profile Scraper" agent
- Copy the Agent ID (looks like: `5594463101383074`)

---

### 2. LinkedIn Outreach (RECOMMENDED - Handles Both)
**Unified phantom for both connection requests AND messages:**
```env
LINKEDIN_OUTREACH_PHANTOM_ID=your_outreach_phantom_id
```

**What it does:** 
- Sends LinkedIn connection requests with personalized notes
- Sends LinkedIn messages after approval
- **One phantom handles everything!**

**How to get it:**
- Go to PhantomBuster dashboard
- Find your "LinkedIn Outreach" agent
- Copy the Agent ID

**Status:** ✅ **RECOMMENDED** - Use this instead of separate phantoms!

---

### 3. Message Sender (Alternative - Only if NOT using LinkedIn Outreach)
**Only needed if you're NOT using LinkedIn Outreach:**
```env
PHANTOM_MESSAGE_SENDER_ID=your_phantom_id_here
```
**OR** (alternative names):
```env
LINKEDIN_MESSAGE_PHANTOM_ID=your_phantom_id_here
MESSAGE_SENDER_PHANTOM_ID=your_phantom_id_here
```

**What it does:** Sends the personalized AI-generated messages to leads after you approve them

---

### 4. Auto Connect (Alternative - Only if NOT using LinkedIn Outreach)
**Only needed if you're NOT using LinkedIn Outreach:**
```env
AUTO_CONNECT_PHANTOM_ID=your_phantom_id_here
```
**OR** (alternative names):
```env
PHANTOM_CONNECT_ID=your_phantom_id_here
PHANTOM_NETWORK_BOOSTER_ID=your_phantom_id_here
```

**What it does:** Sends LinkedIn connection requests with personalized notes

---

## Complete Example `.env` File

### Option 1: Using LinkedIn Outreach (RECOMMENDED)
```env
# PhantomBuster API Key
PHANTOMBUSTER_API_KEY=your_api_key_here

# Phantom IDs - Unified Approach
PROFILE_SCRAPER_PHANTOM_ID=your_profile_scraper_id
LINKEDIN_OUTREACH_PHANTOM_ID=your_outreach_phantom_id

# AI Configuration (OpenAI or Ollama)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_key_here
# OR for Ollama:
# AI_PROVIDER=llama
# LLAMA_API_URL=http://localhost:11434
# LLAMA_MODEL=llama2

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=linkedin_leads
```

### Option 2: Using Separate Phantoms (Legacy)
```env
# PhantomBuster API Key
PHANTOMBUSTER_API_KEY=your_api_key_here

# Phantom IDs - Separate Phantoms
PROFILE_SCRAPER_PHANTOM_ID=your_profile_scraper_id
PHANTOM_MESSAGE_SENDER_ID=your_message_sender_id
AUTO_CONNECT_PHANTOM_ID=your_auto_connect_id

# AI Configuration (OpenAI or Ollama)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=linkedin_leads
```

---

## How to Verify Your Setup

### 1. Check Profile Scraper
```bash
# In backend directory
node -e "require('dotenv').config(); console.log('Profile Scraper:', process.env.PROFILE_SCRAPER_PHANTOM_ID || 'NOT SET');"
```

### 2. Check LinkedIn Outreach (or Message Sender)
```bash
node -e "require('dotenv').config(); console.log('LinkedIn Outreach:', process.env.LINKEDIN_OUTREACH_PHANTOM_ID || 'NOT SET'); console.log('Message Sender (fallback):', process.env.PHANTOM_MESSAGE_SENDER_ID || process.env.LINKEDIN_MESSAGE_PHANTOM_ID || 'NOT SET');"
```

### 3. Test the Flow
1. Go to Leads page
2. Select a lead with a LinkedIn URL
3. Click "Bulk Enrich & Personalize"
4. Select a campaign
5. Check backend logs - you should see:
   - ✅ Profile scraping via PhantomBuster
   - ✅ AI message generation
   - ✅ Message added to approval queue

---

## Troubleshooting

### "PROFILE_SCRAPER_PHANTOM_ID not configured"
- Add `PROFILE_SCRAPER_PHANTOM_ID=your_id` to `backend/.env`
- Restart backend server

### "LINKEDIN_OUTREACH_PHANTOM_ID not set" or "PHANTOM_MESSAGE_SENDER_ID not set"
- **Recommended:** Add `LINKEDIN_OUTREACH_PHANTOM_ID=your_id` to `backend/.env` (handles both messages and connection requests)
- **OR** Add `PHANTOM_MESSAGE_SENDER_ID=your_id` if using separate phantoms
- Restart backend server

### Messages not sending after approval
- Check that your PhantomBuster agent has a valid LinkedIn session cookie configured
- Verify the agent ID matches your PhantomBuster dashboard
- Check backend logs for PhantomBuster API errors

### Enrichment returns mock data
- Verify `PROFILE_SCRAPER_PHANTOM_ID` is set correctly
- Check PhantomBuster API key is valid
- Ensure the agent exists and is active in PhantomBuster dashboard

---

## Next Steps

After setting up these environment variables:

1. **Restart your backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test enrichment:**
   - Select a lead with LinkedIn URL
   - Click "Bulk Enrich & Personalize"
   - Check that bio data is scraped (not mock data)

3. **Test message sending:**
   - Approve a message in Approval Queue
   - Check backend logs for PhantomBuster container ID
   - Verify message appears in your LinkedIn Sent folder
