# Interview Management System

A comprehensive video interview application with automated evaluation, anti-cheating mechanisms, and detailed reporting.

## Features

### 🔐 Security & Authentication
- JWT-based secure interview links with expiration
- Token validation for each interview session
- Unique session IDs for tracking

### 📹 Video Interview
- Real-time video and audio recording
- Mandatory camera/microphone access
- Recording storage for review

### 🛡️ Anti-Cheating Mechanisms
- Tab switching detection
- Window focus monitoring
- Fullscreen enforcement
- Right-click and developer tools prevention
- Stream monitoring (camera/microphone status)

### 📝 Question Management
- Role-based question loading
- Multiple choice and text answer support
- Timed questions with auto-advance
- Progress tracking

### 📊 Automated Evaluation
- Real-time scoring calculation
- 70% pass threshold
- Detailed result reports
- Email notifications to recruiters

### 📧 Email Integration
- Secure link delivery to candidates
- Result notifications to recruiters
- Detailed performance reports
- SendGrid API support for production (recommended on Render) with SMTP fallback

### 📈 Admin Dashboard
- Session monitoring
- Results export to Excel
- Question bank management
- Statistics and analytics

## Supported Roles

1. **Salesforce Vlocity Developer**
   - DataRaptor, Integration Procedures, OmniScript
   - Vlocity Cards and FlexCards
   - Build tools and deployment

2. **Salesforce Service Cloud Developer**
   - Case Management and Escalation
   - Omni-Channel routing
   - Knowledge Management
   - Live Agent and CTI integration

3. **Quality Analyst**
   - Software Testing Life Cycle (STLC)
   - Test case design and execution
   - Defect management
   - API and regression testing

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Gmail account for email notifications

### 1. Clone and Install
```bash
cd C:\Users\HP\CascadeProjects\interview-app
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure (choose ONE email provider):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (choose ONE)
#
# Option A) Gmail SMTP (local/dev)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
RECRUITER_EMAIL=recipient@example.com

# Option B) SendGrid API (recommended for Render)
# When SENDGRID_API_KEY is set the app uses SendGrid and skips SMTP
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM=verified-sender@example.com

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Application URL
APP_URL=http://localhost:3000
```

### 3. Gmail Setup for Email Notifications (optional)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

### 4. Start the Application
```bash
npm start
```

Access the application at: `http://localhost:3000`

## Usage Guide

### For Administrators

1. **Generate Interview Link**
   - Enter candidate email, name, and role
   - Set interview duration (30–180 minutes)
   - Click "Generate Interview Link"
   - The UI always shows the generated link with a Copy button
   - Email status shown:
     - "Email sent" when confirmed
     - "Email is being sent" when queued via provider
     - "Email not sent" if provider not configured — share link manually

2. **Monitor Sessions**
   - View active and completed sessions in dashboard
   - Export results to Excel
   - Download question banks

3. **Review Results**
   - Automatic email notifications for each completed interview
   - Detailed performance reports with correct/incorrect answers
   - Video recordings for manual review

### For Candidates

1. **Receive Interview Link**
   - Check email for interview invitation
   - Click the secure link to start

2. **Setup Phase & Rules Screen**
   - Allow camera and microphone access
   - Read the rules/instructions shown on the setup screen
   - Click the "Start Interview" button to begin
   - The interview will not start until you click Start

3. **Interview Phase**
   - Answer questions within time limits
   - Stay in fullscreen mode
   - Keep camera and microphone active
   - Navigate using Next/Previous buttons

4. **Completion**
   - Submit final answers
   - Receive confirmation message
   - Results sent to recruitment team

## API Endpoints

### Authentication
- `POST /api/auth/generate-link` - Generate secure interview link
- `GET /api/auth/validate-token` - Validate interview token
- `GET /api/auth/sessions` - Get active sessions

### Interview
- `GET /api/interview/questions/:role` - Load questions by role
- `POST /api/interview/submit` - Submit interview responses
- `GET /api/interview/results/:sessionId` - Get interview results

### Admin
- `GET /api/admin/dashboard` - Get dashboard data
- `GET /api/admin/export-results` - Export results to Excel
- `GET /api/admin/export-questions/:role` - Export questions to Excel

## File Structure

```
interview-app/
├── server.js                 # Main server file
├── package.json             # Dependencies
├── .env.example            # Environment template
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── interview.js       # Interview management
│   └── admin.js           # Admin dashboard
├── data/
│   └── questions/         # Question banks by role
├── public/
│   ├── index.html         # Admin interface
│   ├── interview.html     # Interview interface
│   └── js/
│       ├── admin.js       # Admin functionality
│       └── interview.js   # Interview functionality
├── uploads/               # File uploads
├── recordings/           # Video recordings
└── results/             # Interview results
```

## Security Features

### Anti-Cheating Measures
- **Tab Switching Detection**: Alerts when candidate switches tabs
- **Window Focus Monitoring**: Tracks when interview window loses focus
- **Fullscreen Enforcement**: Requires fullscreen mode throughout interview
- **Developer Tools Prevention**: Blocks F12, Ctrl+Shift+I, etc.
- **Right-Click Disabled**: Prevents context menu access
- **Stream Monitoring**: Ensures camera/microphone stay active

### Data Security
- JWT tokens with expiration
- Secure file uploads
- Session-based access control
- Encrypted communication

## Email Templates

### Interview Invitation
- Professional HTML template
- Interview instructions
- Security guidelines
- Expiration notice

### Result Notification
- Pass/Fail status with color coding
- Detailed score breakdown
- Question-by-question analysis
- Recording information

## Troubleshooting

### Common Issues

1. **Camera/Microphone Access Denied**
   - Check browser permissions
   - Ensure HTTPS in production
   - Try different browser

2. **Email Not Sending**
   - Verify Gmail app password
   - Check SMTP settings
   - Ensure 2FA is enabled

3. **Questions Not Loading**
   - Check question file format
   - Verify role name matches file name
   - Ensure JSON syntax is valid

4. **Recording Issues**
   - Use Chrome on desktop for best MediaRecorder support
   - Ensure HTTPS in production for getUserMedia
   - Microphone tips:
     - Check OS/browser mic permissions and input device
     - Close other apps using the mic
     - Our app requests audio with echoCancellation, noiseSuppression, autoGainControl

### Browser Compatibility
- **Recommended**: Chrome 80+, Firefox 75+
- **Required Features**: MediaRecorder API, WebRTC, Fullscreen API
- **Mobile**: Limited support (desktop recommended)

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use HTTPS for secure media access
3. Configure proper SMTP settings
4. Set strong JWT secret
5. Enable file compression

### Scaling Considerations
- Use database instead of in-memory storage
- Implement Redis for session management
- Add load balancing for multiple instances
- Use cloud storage for recordings

---

## Render Deployment Guide (Free Tier)

This project is designed to be deployed as a single Node/Express service on Render. The free tier is suitable for prototypes and small usage. Cold starts (20–50s) can occur after inactivity.

### 1) Prerequisites
- GitHub repository containing this app
- Gmail App Password (2FA enabled) for SMTP

### 2) Environment Variables (Render → Settings → Environment)
Set the following variables (values shown are examples). Prefer SendGrid on Render:

```
NODE_ENV=production
# Recommended on Render
SENDGRID_API_KEY=replace-with-sendgrid-api-key
SENDGRID_FROM=verified-sender@example.com
RECRUITER_EMAIL=recipient@example.com
JWT_SECRET=replace-with-a-long-random-string
RECORDINGS_PATH=/opt/render/project/src/recordings
RESULTS_PATH=/opt/render/project/src/results
APP_URL=TEMP_PLACEHOLDER
```

Notes:
- `APP_URL` will be updated to your Render URL after the first successful deploy.
- `RECORDINGS_PATH` and `RESULTS_PATH` match the mount points you will create for persistent disks.
- If you use SMTP on Render, Gmail may time out or be blocked on free tier. Prefer SendGrid.

### 3) Create the Web Service
1. Go to https://render.com → New → Web Service
2. Select your repo
3. Configure:
   - Name: `interview-app` (or any unique name)
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: Free
4. Add the Environment Variables from step 2
5. Create Web Service and wait for deploy to finish

### 4) Add Persistent Disks (Recommended)
Persistent disks keep uploaded recordings and generated result files across restarts.

- Create Disk A:
  - Mount Path: `/opt/render/project/src/recordings`
  - Size: 1–2 GB (depending on expected video volume)

- Create Disk B:
  - Mount Path: `/opt/render/project/src/results`
  - Size: 100–500 MB

The application reads these paths from the env vars `RECORDINGS_PATH` and `RESULTS_PATH` set above. No code change is needed.

#### Deploying WITHOUT Persistent Disks (Free-only setup)
- You can skip adding disks. In that case, files are stored on the ephemeral filesystem.
- What this means:
  - Files persist while the instance is running.
  - Files are lost on redeploys, restarts, or when Render free dyno sleeps.
- Recommended adjustments if you skip disks:
  - Keep email notifications enabled (you still receive the results summary via email).
  - Consider lowering recording size or disabling recordings for production use on free tier.
  - If you need durable storage later, switch to a cloud bucket (e.g., S3 free tier) or enable Render persistent disks and set `RECORDINGS_PATH`/`RESULTS_PATH` accordingly.

### 5) Set APP_URL and Redeploy
After the first deploy, Render will assign a URL like `https://your-service.onrender.com`.

- Update `APP_URL` to this value in Render → Environment
- Save → Trigger a Redeploy

This value is used when generating secure interview links that are emailed to candidates.

### 6) Post-Deploy Smoke Tests
Perform these checks from an Incognito browser:

- **Home/Admin**: Open `https://your-service.onrender.com/`
- **Generate link**: Use the admin panel to send yourself an invite
- **Interview start (rules screen)**:
  - Setup screen shows rules and a Start button
  - Start button enables when camera/mic and questions are ready
  - Click Start → timer shows 60:00 and first question loads
- **Anti-cheat**:
  - Switch tabs; after 5 seconds the interview should auto-submit
- **Submit flow**:
  - On last question, click Submit
  - Buttons disable; submission succeeds
  - Redirect to `/thank-you.html`
  - Email arrives at `RECRUITER_EMAIL`
- **Files**:
  - Confirm files saved under mounted paths (`/recordings` and `/results`)

### 7) Free Tier Limitations
### 8) Troubleshooting on Render
- **Emails not sending**:
  - Preferred: use SendGrid (`SENDGRID_API_KEY`, `SENDGRID_FROM` with verified sender)
  - If using SMTP: confirm `EMAIL_USER`, `EMAIL_PASS` (App Password), and logs show success
  - Check spam/promotions in recipient mailbox
- **Recording issues**: Verify browser supports MediaRecorder (Chrome is recommended). Ensure HTTPS.
- **Links invalid**: Ensure `APP_URL` matches your Render URL and that tokens haven’t expired.
- **Files missing after restart**: Verify Persistent Disks are mounted to the same paths as in env vars.
  - If you deployed without disks, this is expected on redeploy or cold start. Use a bucket (S3) or enable disks for durability.
## Gmail App Password: Detailed Steps

To use Gmail SMTP you must use an App Password (not your normal password).

1. Enable 2-Step Verification on your Google Account.
2. Go to Google Account → Security → App passwords.
3. Select App: “Mail”, Device: “Other (Custom name)” (e.g., “Interview App”).
4. Generate. Copy the 16-character password.
5. Set it in your environment as `EMAIL_PASS` both locally and on Render.
6. Keep `EMAIL_HOST=smtp.gmail.com` and `EMAIL_PORT=587`.
7. If sending volume increases or Gmail throttles, consider a transactional email provider (Mailgun/SendGrid free tiers).

---

## Support

For technical issues or questions:
1. Check the troubleshooting section
2. Review server logs for errors
3. Verify environment configuration
4. Contact system administrator

## License

MIT License - See LICENSE file for details
