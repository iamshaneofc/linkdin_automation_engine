# LinkedIn Outreach Setup Guide

## ✅ What Changed

You're now using **LinkedIn Outreach** instead of separate phantoms for connection requests and messages. This is a unified phantom that handles both!

## Required `.env` Configuration

Add this to your `backend/.env` file:

```env
# LinkedIn Outreach - Handles BOTH connection requests AND messages
LINKEDIN_OUTREACH_PHANTOM_ID=your_outreach_phantom_id_here

# Profile Scraper - For enrichment
PROFILE_SCRAPER_PHANTOM_ID=your_profile_scraper_id_here
```

## How It Works

1. **Connection Requests** (`step_type: 'connection_request'`)
   - Uses `LINKEDIN_OUTREACH_PHANTOM_ID`
   - Sends connection request with personalized note

2. **Messages** (`step_type: 'message'`)
   - Uses `LINKEDIN_OUTREACH_PHANTOM_ID` (same phantom!)
   - Sends LinkedIn message after approval

3. **Profile Enrichment**
   - Uses `PROFILE_SCRAPER_PHANTOM_ID`
   - Scrapes bio data for AI personalization

## Finding Your LinkedIn Outreach Phantom ID

1. Go to https://phantombuster.com/
2. Find your **"LinkedIn Outreach"** agent
3. Copy the Agent ID (looks like: `5594463101383074`)
4. Add to `.env`: `LINKEDIN_OUTREACH_PHANTOM_ID=5594463101383074`

## Verification

After updating `.env`, restart your backend:

```bash
cd backend
npm run dev
```

Check the logs - you should see:
```
✅ LinkedIn Outreach configured
```

## Testing

1. **Test Connection Request:**
   - Create a campaign with first step = `connection_request`
   - Select a lead → Bulk Enrich & Personalize
   - Approve the message
   - Check backend logs for: `✅ Auto Connect Launched` (using LinkedIn Outreach)

2. **Test Message:**
   - Create a campaign with step = `message`
   - Select a lead → Bulk Enrich & Personalize
   - Approve the message
   - Check backend logs for: `✅ LinkedIn Message Send Launched` (using LinkedIn Outreach)

## Troubleshooting

### "LINKEDIN_OUTREACH_PHANTOM_ID not set"
- Make sure you added it to `backend/.env`
- Restart backend server
- Check spelling: `LINKEDIN_OUTREACH_PHANTOM_ID` (not `LINKEDIN_OUTREACH_PHANTOM`)

### Messages not sending
- Verify the phantom ID matches your PhantomBuster dashboard
- Check that your LinkedIn session cookie is configured in the LinkedIn Outreach agent
- Check backend logs for PhantomBuster API errors

### Connection requests not working
- Same phantom handles both - check the same things as above
- Verify the agent supports connection requests (LinkedIn Outreach should)

## Benefits of LinkedIn Outreach

✅ **One phantom** instead of two  
✅ **Simpler configuration** - just one ID  
✅ **Easier maintenance** - one agent to manage  
✅ **Cost effective** - one agent subscription instead of two
