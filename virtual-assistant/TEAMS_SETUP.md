# Adding ARIA to Microsoft Teams

## How it works

```
You invite ARIA to a meeting calendar invite
        ↓
Teams notifies ARIA when meeting starts
        ↓
Meeting runs, Teams records transcript
        ↓
Meeting ends → ARIA fetches transcript via Graph API
        ↓
Claude AI generates structured notes + action items
        ↓
ARIA posts notes in the Teams meeting chat
   + saves them to your ARIA dashboard
```

---

## Step 1 — Register ARIA as an Azure Bot (10 min)

1. Go to **portal.azure.com** → search **"Azure Bot"** → Create

2. Fill in:
   - **Bot handle**: `ARIA-Assistant`
   - **Subscription**: your subscription
   - **Resource group**: create new or existing
   - **Pricing**: **F0 (Free)**
   - **App type**: Single tenant (recommended) or Multi-tenant
   - **Creation type**: Create new Microsoft App ID

3. Click **Review + Create** → **Create**

4. When done, go to the bot resource → **Configuration**:
   - Copy **Microsoft App ID** → save it
   - Click **Manage Password** → **New client secret** → copy the secret

5. Set the **Messaging endpoint**:
   ```
   https://<your-ngrok-or-domain>/api/teams/messages
   ```
   > For local development, use ngrok (see Step 4)

---

## Step 2 — Enable Teams channel

In your Azure Bot resource:
1. **Channels** → Click **Microsoft Teams**
2. Accept the Terms of Service → **Apply**
3. Teams channel is now active ✅

---

## Step 3 — Grant Microsoft Graph permissions

So ARIA can read transcripts and calendar events:

1. Go to **Azure Active Directory** → **App registrations**
2. Find your bot app (search by App ID)
3. **API permissions** → **Add a permission** → **Microsoft Graph**
4. Choose **Application permissions** and add:

   | Permission | Purpose |
   |---|---|
   | `OnlineMeetingTranscript.Read.All` | Read meeting transcripts |
   | `OnlineMeeting.Read.All` | Get meeting details |
   | `Calendars.Read` | See upcoming meetings |
   | `Chat.ReadWrite` | Post notes in meeting chat |

5. Click **Grant admin consent** (requires admin rights)

6. Get your **Tenant ID**:
   - Azure AD → **Overview** → copy **Tenant ID**

7. Get your **User Object ID** (needed for transcript API):
   - Azure AD → **Users** → find yourself → copy **Object ID**

---

## Step 4 — Configure ARIA backend

Add to `backend/.env`:

```env
# Teams Bot
TEAMS_BOT_APP_ID=<Microsoft App ID from Step 1>
TEAMS_BOT_APP_PASSWORD=<Client Secret from Step 1>
TEAMS_TENANT_ID=<Tenant ID from Step 3>
TEAMS_CLIENT_ID=<same as BOT_APP_ID>
TEAMS_CLIENT_SECRET=<same as BOT_APP_PASSWORD>
TEAMS_ORGANIZER_USER_ID=<your Object ID from Step 3>
```

---

## Step 5 — Expose your backend to the internet (local dev)

Teams needs a public HTTPS URL to send webhook events.

**Option A — ngrok (easiest for development):**
```bash
# Install: https://ngrok.com/download
ngrok http 8000

# You'll get a URL like: https://abc123.ngrok-free.app
# Use that as your Messaging Endpoint in Step 1
```

**Option B — Deploy to a server:**
Run the backend on any VPS/cloud server with a domain.
nginx + Let's Encrypt gives you free HTTPS.

---

## Step 6 — Build the Teams App package

```bash
cd teams-app

# 1. Edit manifest.json — replace $TEAMS_BOT_APP_ID with your real App ID
sed -i 's/\$TEAMS_BOT_APP_ID/YOUR_REAL_APP_ID/g' manifest.json

# 2. Create icons (or use your own 192x192 and 32x32 PNG files)
#    See teams-app/README.md for ImageMagick commands

# 3. Zip it up
zip -j ARIA-teams-app.zip manifest.json color.png outline.png
```

---

## Step 7 — Install ARIA in Teams

1. Open **Microsoft Teams**
2. Click **Apps** (left sidebar) → **Manage your apps**
3. **Upload an app** → **Upload a custom app**
4. Select `ARIA-teams-app.zip`
5. Click **Add** → ARIA appears in your contacts list 🎉

---

## Step 8 — Add ARIA to a meeting

1. Create a Teams meeting (calendar invite)
2. Click **Add required attendees**
3. Search for **ARIA** → add it
4. Send the invite

When the meeting ends, ARIA will automatically:
- Fetch the transcript (transcription must be enabled — see below)
- Generate structured notes
- Post them in the Teams meeting chat

---

## Enable transcription in Teams meetings

For ARIA to get the transcript:
1. During the meeting, click **More (...)** → **Record and transcribe** → **Start transcription**
   — **or** —
1. Ask your Teams admin to enable **automatic transcription** for your organisation:
   Teams Admin Center → Meetings → Meeting policies → Allow transcription → **On**

---

## Test it

After setup, message ARIA directly in Teams:
```
Hello ARIA
Schedule a meeting for tomorrow at 2pm
What are my action items?
```

ARIA responds using Claude AI, same as the web/iOS app.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bot not responding | Check ngrok is running and Messaging Endpoint URL is correct |
| No transcript | Enable transcription during meeting (see above) |
| Graph API 403 | Admin hasn't granted consent for the permissions in Step 3 |
| Auth error | Double-check App ID and Secret in .env match Azure portal |
