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
Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
RECRUITER_EMAIL=reenarani.a@gmail.com

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Application URL
APP_URL=http://localhost:3000
```

### 3. Gmail Setup for Email Notifications
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
   - Set interview duration (30-180 minutes)
   - Click "Generate Interview Link"
   - Link is automatically emailed to candidate

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

2. **Setup Phase**
   - Allow camera and microphone access
   - Ensure proper lighting and quiet environment
   - Read anti-cheating guidelines

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
   - Check browser compatibility (Chrome recommended)
   - Ensure sufficient disk space
   - Verify MediaRecorder support

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

## Support

For technical issues or questions:
1. Check the troubleshooting section
2. Review server logs for errors
3. Verify environment configuration
4. Contact system administrator

## License

MIT License - See LICENSE file for details
