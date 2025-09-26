const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const { activeSessions } = require('./auth');

const router = express.Router();

// Paths configurable via environment variables
const RECORDINGS_PATH = process.env.RECORDINGS_PATH || path.join(__dirname, '..', 'recordings');
const RESULTS_PATH = process.env.RESULTS_PATH || path.join(__dirname, '..', 'results');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RECORDINGS_PATH);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Email providers (optional)
let transporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

let sendgridReady = false;
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridReady = true;
  } catch (e) {
    console.error('[Interview] Failed to initialize SendGrid:', e);
  }
}

// Load questions based on role
router.get('/questions/:role', (req, res) => {
  try {
    const { role } = req.params;
    const slug = role.toLowerCase().replace(/\s+/g, '-');
    const questionsPath = path.join(__dirname, '..', 'data', 'questions', `${slug}.json`);
    console.log(`[Questions] role param="${role}" slug="${slug}" path="${questionsPath}"`);
    
    if (!fs.existsSync(questionsPath)) {
      console.error(`[Questions] File not found for role slug: ${slug}`);
      return res.status(404).json({ error: `Questions not found for role: ${slug}` });
    }

    const questions = fs.readJsonSync(questionsPath);
    
    // Remove correct answers from the response (security)
    const questionsWithoutAnswers = questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options || null,
      timeLimit: q.timeLimit || 120 // 2 minutes default
    }));

    res.json(questionsWithoutAnswers);
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Failed to load questions', detail: String(error) });
  }
});

// Submit interview responses
router.post('/submit', upload.single('recording'), async (req, res) => {
  try {
    const { sessionId, responses, token, transcript } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = activeSessions.get(sessionId);

    if (!session || session.status === 'completed') {
      return res.status(400).json({ error: 'Invalid session' });
    }

    // Parse responses if it's a string
    const parsedResponses = typeof responses === 'string' ? JSON.parse(responses) : responses;

    // Load correct answers
    const questionsPath = path.join(__dirname, '..', 'data', 'questions', `${decoded.role.toLowerCase().replace(/\s+/g, '-')}.json`);
    const questions = fs.readJsonSync(questionsPath);

    // Calculate score
    let correctAnswers = 0;
    const detailedResults = [];

    questions.forEach((question, index) => {
      const userResponse = parsedResponses[index];
      const isCorrect = question.correctAnswer === userResponse?.answer;
      
      if (isCorrect) correctAnswers++;

      detailedResults.push({
        questionId: question.id,
        question: question.question,
        userAnswer: userResponse?.answer || 'No answer',
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeTaken: userResponse?.timeTaken || 0
      });
    });

    const scorePercentage = (correctAnswers / questions.length) * 100;
    const isPassed = scorePercentage >= 70;

    // Update session
    session.status = 'completed';
    session.completedAt = new Date();
    session.score = scorePercentage;
    session.responses = parsedResponses;
    session.detailedResults = detailedResults;
    session.recordingFile = req.file ? req.file.filename : null;

    // Generate result summary
    const resultSummary = {
      candidateName: decoded.candidateName,
      candidateEmail: decoded.candidateEmail,
      role: decoded.role,
      score: scorePercentage,
      totalQuestions: questions.length,
      correctAnswers,
      isPassed,
      completedAt: session.completedAt,
      detailedResults,
      recordingFile: session.recordingFile,
      transcript: transcript || ''
    };

    // Save results to file
    const resultsPath = path.join(RESULTS_PATH, `${sessionId}.json`);
    fs.ensureDirSync(path.dirname(resultsPath));
    fs.writeJsonSync(resultsPath, resultSummary, { spaces: 2 });

    // Send email to recruiter (non-blocking)
    sendResultEmail(resultSummary, isPassed)
      .then(() => console.log('[Interview] Result email triggered'))
      .catch((e) => console.error('[Interview] Result email failed (non-blocking):', e));

    res.json({
      success: true,
      message: 'Interview submitted successfully. Results have been sent to the recruitment team.',
      sessionId
    });

  } catch (error) {
    console.error('Error submitting interview:', error);
    res.status(500).json({ error: 'Failed to submit interview' });
  }
});

// Send result email to recruiter
async function sendResultEmail(resultSummary, isPassed) {
  const status = isPassed ? 'SUCCESSFUL' : 'UNSUCCESSFUL';
  const statusColor = isPassed ? '#28a745' : '#dc3545';

  const detailedResultsHtml = resultSummary.detailedResults.map((result, index) => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">${index + 1}</td>
      <td style="padding: 10px;">${result.question}</td>
      <td style="padding: 10px;">${result.userAnswer}</td>
      <td style="padding: 10px;">${result.correctAnswer}</td>
      <td style="padding: 10px; color: ${result.isCorrect ? '#28a745' : '#dc3545'};">
        ${result.isCorrect ? '✓' : '✗'}
      </td>
      <td style="padding: 10px;">${result.timeTaken}s</td>
    </tr>
  `).join('');

  // Optional secure recording download link
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  const hasRecording = !!resultSummary.recordingFile;
  let downloadSection = '';
  let attachmentInfo = { canAttach: false, path: '', size: 0 };
  if (hasRecording) {
    try {
      const filePath = path.join(RECORDINGS_PATH, resultSummary.recordingFile);
      const stat = fs.statSync(filePath);
      attachmentInfo = { canAttach: stat.size <= 15 * 1024 * 1024, path: filePath, size: stat.size };
      const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      const sig = signDownloadToken(resultSummary.sessionId, resultSummary.recordingFile, expires);
      const link = `${appUrl}/api/interview/recording/${encodeURIComponent(resultSummary.sessionId)}?file=${encodeURIComponent(resultSummary.recordingFile)}&expires=${expires}&sig=${sig}`;
      downloadSection = `
        <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <p><strong>Recording File:</strong> ${resultSummary.recordingFile}</p>
          <p><a href="${link}">Download recording (available for 24 hours)</a></p>
        </div>`;
    } catch (e) {
      console.warn('[Interview] Could not stat recording for email:', e);
    }
  }

  const commonHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1>Interview Result: ${status}</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Candidate Information</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${resultSummary.candidateName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${resultSummary.candidateEmail}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Role:</td><td style="padding: 8px;">${resultSummary.role}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Completed At:</td><td style="padding: 8px;">${resultSummary.completedAt}</td></tr>
          </table>

          <h2>Score Summary</h2>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>Overall Score:</strong> ${resultSummary.score.toFixed(1)}%</p>
            <p><strong>Correct Answers:</strong> ${resultSummary.correctAnswers} out of ${resultSummary.totalQuestions}</p>
            <p><strong>Result:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
          </div>

          <h2>Detailed Results</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; border: 1px solid #ddd;">#</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Question</th>
                <th style="padding: 10px; border: 1px solid #ddd;">User Answer</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Correct Answer</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Result</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${detailedResultsHtml}
            </tbody>
          </table>

          ${resultSummary.recordingFile ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
              <p><strong>Recording File:</strong> ${resultSummary.recordingFile}</p>
              <p><a href="${appUrl}/api/interview/recording/${encodeURIComponent(resultSummary.sessionId)}?file=${encodeURIComponent(resultSummary.recordingFile)}&expires=${expires}&sig=${sig}">Download recording (available for 24 hours)</a></p>
            </div>
          ` : ''}

          ${resultSummary.transcript ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
              <h3>Transcript</h3>
              <pre style="white-space: pre-wrap; font-family: inherit;">${resultSummary.transcript}</pre>
          ` : ''}
        </div>
      </div>
    `;

  const subject = `Interview Result - ${status} - ${resultSummary.candidateName}`;

  if (sendgridReady) {
    const fromEmail = process.env.SENDGRID_FROM || process.env.EMAIL_USER;
    if (!fromEmail) throw new Error('No SENDGRID_FROM configured');
    const msg = {
      to: process.env.RECRUITER_EMAIL,
      from: fromEmail,
      subject,
      html: commonHtml
    };
    // Attach only if small enough
    if (hasRecording && attachmentInfo.canAttach) {
      const fileContent = fs.readFileSync(attachmentInfo.path);
      msg.attachments = [{
        content: fileContent.toString('base64'),
        filename: resultSummary.recordingFile,
        type: 'video/webm',
        disposition: 'attachment'
      }];
    }
    await sgMail.send(msg);
    return;
  }

  if (transporter) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECRUITER_EMAIL,
      subject,
      html: commonHtml,
      attachments: hasRecording && attachmentInfo.canAttach ? [
        {
          filename: resultSummary.recordingFile,
          path: attachmentInfo.path
        }
      ] : []
    };
    await transporter.sendMail(mailOptions);
    return;
  }

  console.warn('[Interview] No email provider configured; skipping result email.');
}

// Signed download route for recordings
router.get('/recording/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { file, expires, sig } = req.query;
    if (!sessionId || !file || !expires || !sig) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    const expiresNum = Number(expires);
    if (!expiresNum || Date.now() > expiresNum) {
      return res.status(403).json({ error: 'Link expired' });
    }
    const expected = signDownloadToken(sessionId, file, expiresNum);
    if (expected !== sig) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    const filePath = path.join(RECORDINGS_PATH, file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.download(filePath);
  } catch (e) {
    console.error('Download error:', e);
    res.status(500).json({ error: 'Failed to download recording' });
  }
});

function signDownloadToken(sessionId, fileName, expires) {
  const secret = process.env.JWT_SECRET || 'default-secret';
  const h = crypto.createHmac('sha256', secret);
  h.update(`${sessionId}|${fileName}|${expires}`);
  return h.digest('hex');
}

// Get interview results (for admin)
router.get('/results/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const resultsPath = path.join(__dirname, '..', 'results', `${sessionId}.json`);

    if (!fs.existsSync(resultsPath)) {
      return res.status(404).json({ error: 'Results not found' });
    }

    const results = await fs.readJson(resultsPath);
    res.json(results);
  } catch (error) {
    console.error('Error loading results:', error);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

module.exports = router;
