# 🎯 Multi-Channel Outreach System

A comprehensive system to contact leads through **LinkedIn**, **Email**, and **SMS** using scraped contact information.

## 📋 Overview

This system provides a modern way to reach out to leads across multiple channels:

1. **Contact Scraper** - Extract email/phone from LinkedIn profiles
2. **Email Outreach** - Send AI-personalized emails directly to inbox
3. **SMS Outreach** - Send short text messages (Twilio integration)
4. **LinkedIn Messages** - Traditional LinkedIn messaging (via Approvals)

## 🚀 How It Works

### Step 1: Scrape Contact Information

```
Campaign Detail → Leads Tab → "Scrape Contacts" button
```

- Uses Puppeteer to visit LinkedIn profiles
- Extracts email, phone, birthday, website from Contact Info modal
- Stores in database (leads.email, leads.phone)
- **Requires**: `LINKEDIN_SESSION_COOKIE` in backend/.env

### Step 2: Choose Your Channel

#### 📧 Email Outreach (Recommended)

```
Campaign Detail → Leads Tab → "Email Outreach" button
```

**Features:**
- AI-generated personalized content
- Beautiful HTML email templates
- Direct to inbox (bypasses LinkedIn)
- SendGrid or AWS SES supported
- Real-time delivery tracking

**Setup:**
```env
# Option 1: SendGrid (Easier)
SENDGRID_API_KEY=your_sendgrid_key
SENDER_EMAIL=you@company.com

# Option 2: AWS SES (More scalable)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
SENDER_EMAIL=you@company.com
```

#### 📱 SMS Outreach (Optional)

```
Campaign Detail → Leads Tab → "SMS Outreach" button
```

**Features:**
- Short, AI-optimized messages (160 chars)
- Direct to mobile phone
- High open rates
- Requires Twilio account

**Setup:**
```env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Enable in code:**
```bash
# Install Twilio SDK
cd backend
npm install twilio

# Uncomment Twilio code in:
backend/src/services/outreach.service.js (line ~147)
```

#### 💼 LinkedIn Messages (Traditional)

```
Campaign Detail → Leads Tab → "LinkedIn AI Messages" button
```

- Goes through Approvals Tab for review
- Sent via PhantomBuster/Scheduler
- Rate-limited by LinkedIn

## 📊 API Endpoints

### Email Outreach
```http
POST /api/campaigns/:id/outreach/email
{
  "leadIds": [1, 2, 3],
  "message": "Optional custom message",
  "options": {
    "useAI": true,
    "subject": "Quick question, {firstName}",
    "companyName": "Your Company",
    "senderName": "Your Name",
    "brandColor": "#0077B5",
    "ctaText": "Schedule a Call",
    "ctaLink": "https://calendly.com/yourlink"
  }
}
```

### SMS Outreach
```http
POST /api/campaigns/:id/outreach/sms
{
  "leadIds": [1, 2, 3],
  "message": "Optional custom message",
  "options": {
    "useAI": true
  }
}
```

### Outreach Stats
```http
GET /api/campaigns/:id/outreach/stats
```

## 🎨 Email Template Customization

The system uses modern, responsive HTML email templates:

**Features:**
- Mobile-responsive design
- Customizable brand colors
- Social links support
- Unsubscribe links
- Professional typography

**Customize in code:**
```javascript
options: {
  brandColor: "#0077B5",        // Your brand color
  companyName: "Your Company",  // Company name
  senderName: "John Doe",       // Sender name
  senderTitle: "CEO",           // Optional title
  ctaText: "Book a Call",       // Call-to-action text
  ctaLink: "https://...",       // CTA link
  showSocialLinks: true,        // Show social icons
  website: "https://..."        // Your website
}
```

## 🤖 AI Personalization

All messages are personalized using:
- Lead's name, title, company
- LinkedIn enrichment data (bio, interests, recent posts)
- Context-aware tone
- Industry-specific language

**AI Features:**
- **Email**: 120-180 words, professional tone
- **SMS**: Max 160 characters, casual tone
- **Fallback**: Template messages if AI fails

## 📈 Best Practices

### Email Outreach
1. **Scrape first** - Always run contact scraper before emailing
2. **Test small** - Start with 10-20 leads to test deliverability
3. **Warm up domain** - If new sender, start slow
4. **Monitor bounces** - Check email service dashboard
5. **Personalize** - Let AI generate unique content for each lead

### SMS Outreach
1. **Get consent** - Only text leads who expect it
2. **Be brief** - 160 chars or less
3. **Include CTA** - Make action clear
4. **Time it right** - Business hours only
5. **Use sparingly** - SMS is more intrusive than email

### Multi-Channel Strategy
```
Day 1: LinkedIn connection request
Day 3: LinkedIn message (if accepted)
Day 7: Email outreach (if no response)
Day 14: SMS follow-up (if high-value lead)
```

## 🔍 Monitoring & Logs

All outreach is logged to `automation_logs` table:

```sql
SELECT 
  action,
  status,
  COUNT(*) as count
FROM automation_logs
WHERE campaign_id = 12
  AND action IN ('email_outreach', 'sms_outreach')
GROUP BY action, status;
```

**View in UI:**
```
Campaign Detail → Analytics Tab → Outreach Stats
```

## ⚙️ Configuration Summary

### Required (for Email)
```env
LINKEDIN_SESSION_COOKIE=your_linkedin_cookie
SENDGRID_API_KEY=your_sendgrid_key
SENDER_EMAIL=you@company.com
```

### Optional (for SMS)
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Optional (for OpenAI)
```env
OPENAI_API_KEY=sk-...
```

## 🎯 Example Workflow

```javascript
// 1. User selects 50 leads in campaign
// 2. Clicks "Scrape Contacts" 
//    → Gets email/phone for 35 leads (70% success rate)
// 3. Clicks "Email Outreach"
//    → AI generates 35 personalized emails
//    → Sends via SendGrid
//    → 33 delivered, 2 bounced
// 4. Waits 1 week
// 5. Selects 10 high-value non-responders
// 6. Clicks "SMS Outreach"
//    → Sends 10 short text messages
//    → 3 respond positively
```

## 📞 Support

For issues:
1. Check backend console logs
2. Verify email service credentials
3. Test with small batch first
4. Check `automation_logs` table for errors

## 🔐 Privacy & Compliance

- **GDPR/CAN-SPAM**: Include unsubscribe links in emails
- **TCPA**: Get consent before SMS
- **Data storage**: All scraped data stored securely in database
- **Rate limiting**: Built-in delays to avoid spam detection

---

**Built with:** Node.js, Puppeteer, SendGrid/AWS SES, OpenAI, React
