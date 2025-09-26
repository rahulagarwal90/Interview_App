const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const XLSX = require('xlsx');
const { activeSessions } = require('./auth');

const router = express.Router();

// Admin dashboard - get all sessions and results
router.get('/dashboard', (req, res) => {
  try {
    const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
      sessionId: id,
      ...data
    }));

    // Get completed results
    const resultsDir = path.join(__dirname, '..', 'results');
    const completedResults = [];

    if (fs.existsSync(resultsDir)) {
      const resultFiles = fs.readdirSync(resultsDir);
      resultFiles.forEach(file => {
        if (file.endsWith('.json')) {
          const resultData = fs.readJsonSync(path.join(resultsDir, file));
          completedResults.push(resultData);
        }
      });
    }

    res.json({
      activeSessions: sessions,
      completedResults,
      statistics: {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        pendingSessions: sessions.filter(s => s.status === 'pending').length,
        passedCandidates: completedResults.filter(r => r.isPassed).length,
        failedCandidates: completedResults.filter(r => !r.isPassed).length
      }
    });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// Export results to Excel
router.get('/export-results', (req, res) => {
  try {
    const resultsDir = path.join(__dirname, '..', 'results');
    const results = [];

    if (fs.existsSync(resultsDir)) {
      const resultFiles = fs.readdirSync(resultsDir);
      resultFiles.forEach(file => {
        if (file.endsWith('.json')) {
          const resultData = fs.readJsonSync(path.join(resultsDir, file));
          results.push({
            'Candidate Name': resultData.candidateName,
            'Email': resultData.candidateEmail,
            'Role': resultData.role,
            'Score (%)': resultData.score.toFixed(1),
            'Correct Answers': resultData.correctAnswers,
            'Total Questions': resultData.totalQuestions,
            'Result': resultData.isPassed ? 'PASSED' : 'FAILED',
            'Completed At': resultData.completedAt,
            'Recording File': resultData.recordingFile || 'N/A'
          });
        }
      });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(results);
    XLSX.utils.book_append_sheet(wb, ws, 'Interview Results');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=interview-results.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting results:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
});

// Get questions for a specific role
router.get('/questions/:role', (req, res) => {
  try {
    const { role } = req.params;
    const questionsPath = path.join(__dirname, '..', 'data', 'questions', `${role.toLowerCase().replace(/\s+/g, '-')}.json`);
    
    if (!fs.existsSync(questionsPath)) {
      return res.status(404).json({ error: 'Questions not found for this role' });
    }

    const questions = fs.readJsonSync(questionsPath);
    res.json(questions);
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

// Export questions to Excel
router.get('/export-questions/:role', (req, res) => {
  try {
    const { role } = req.params;
    const questionsPath = path.join(__dirname, '..', 'data', 'questions', `${role.toLowerCase().replace(/\s+/g, '-')}.json`);
    
    if (!fs.existsSync(questionsPath)) {
      return res.status(404).json({ error: 'Questions not found for this role' });
    }

    const questions = fs.readJsonSync(questionsPath);
    
    // Format for Excel
    const excelData = questions.map((q, index) => ({
      'Question #': index + 1,
      'Question': q.question,
      'Type': q.type,
      'Options': q.options ? q.options.join(' | ') : 'N/A',
      'Correct Answer': q.correctAnswer,
      'Time Limit (seconds)': q.timeLimit || 120,
      'Difficulty': q.difficulty || 'Medium'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, `${role} Questions`);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=${role.replace(/\s+/g, '-')}-questions.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting questions:', error);
    res.status(500).json({ error: 'Failed to export questions' });
  }
});

module.exports = router;
