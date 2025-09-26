const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Store active interview sessions (in production, use a database)
const activeSessions = new Map();

// Generate secure interview link
router.post('/generate-link', async (req, res) => {
  try {
    const { candidateEmail, candidateName, role, duration = 60 } = req.body;

    if (!candidateEmail || !candidateName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique session ID
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + duration * 60 * 1000); // duration in minutes

    // Create JWT token for secure access
    const token = jwt.sign(
      {
        sessionId,
        candidateEmail,
        candidateName,
        role,
        expiresAt: expiresAt.getTime()
      },
      process.env.JWT_SECRET,
      { expiresIn: `${duration}m` }
    );

    // Store session data
    activeSessions.set(sessionId, {
      candidateEmail,
      candidateName,
      role,
      token,
      expiresAt,
      status: 'pending',
      createdAt: new Date()
    });

    // Generate interview link
    const interviewLink = `${process.env.APP_URL}/interview?token=${token}`;

    // Send email to candidate
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: candidateEmail,
      subject: `Interview Invitation - ${role} Position`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Interview Invitation</h2>
          <p>Dear ${candidateName},</p>
          <p>You have been invited to participate in a video interview for the <strong>${role}</strong> position.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #007bff;">Interview Details:</h3>
            <ul>
              <li><strong>Position:</strong> ${role}</li>
              <li><strong>Duration:</strong> ${duration} minutes</li>
              <li><strong>Expires:</strong> ${expiresAt.toLocaleString()}</li>
            </ul>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404;">Important Instructions:</h4>
            <ul>
              <li>Ensure your camera and microphone are working properly</li>
              <li>Find a quiet, well-lit environment</li>
              <li>Do not switch tabs or applications during the interview</li>
              <li>The interview will be recorded for evaluation purposes</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Interview
            </a>
          </div>

          <p style="color: #666; font-size: 12px;">
            This link will expire on ${expiresAt.toLocaleString()}. 
            If you have any technical issues, please contact the recruitment team.
          </p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error('Email send failed, proceeding with link generation:', emailErr);
      // Continue; admin can copy the link from the response/UI
    }

    res.json({
      success: true,
      sessionId,
      interviewLink,
      expiresAt
    });

  } catch (error) {
    console.error('Error generating interview link:', error);
    res.status(500).json({ error: 'Failed to generate interview link' });
  }
});

// Validate interview token
router.get('/validate-token', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = activeSessions.get(decoded.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Interview already completed' });
    }

    if (new Date() > session.expiresAt) {
      return res.status(400).json({ error: 'Interview link has expired' });
    }

    res.json({
      valid: true,
      candidateName: decoded.candidateName,
      role: decoded.role,
      sessionId: decoded.sessionId
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Get active sessions (for admin)
router.get('/sessions', (req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
    sessionId: id,
    ...data
  }));
  res.json(sessions);
});

module.exports = router;
module.exports.activeSessions = activeSessions;
