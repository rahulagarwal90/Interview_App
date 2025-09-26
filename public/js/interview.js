// Interview functionality
let mediaRecorder;
let recordedChunks = [];
let currentQuestionIndex = 0;
let questions = [];
let responses = [];
let questionStartTime;
let globalTimer;
let socket;
let sessionData = {};
let stream;

// Speech-to-text variables
let recognition;
let transcriptText = '';

// Safe speech recognition helpers (no-op if API not available)
function startSpeechRecognition() {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return; // Not supported
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) transcriptText += transcript + ' ';
                else interim += transcript;
            }
        };
        recognition.onerror = () => {};
        recognition.start();
        console.log('[Interview] Speech recognition started');
    } catch (e) {
        console.warn('[Interview] Speech recognition unavailable:', e);
    }
}

function stopSpeechRecognition() {
    try {
        if (recognition && typeof recognition.stop === 'function') {
            recognition.stop();
            console.log('[Interview] Speech recognition stopped');
        }
    } catch (e) {
        // ignore
    } finally {
        recognition = undefined;
    }
}

// Anti-cheating variables
let tabSwitchCount = 0;
let windowBlurCount = 0;
let isFullscreen = false;
let mediaReady = false;
let questionsReady = false;
let interviewStarted = false;
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    socket = io();
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showError('Invalid interview link. Please contact the recruitment team.');
        return;
    }
    
    // Validate token and initialize interview
    validateTokenAndInit(token);
    
    // Setup anti-cheating monitoring
    setupAntiCheating();
    
    // Setup event listeners
    setupEventListeners();
});

async function validateTokenAndInit(token) {
    try {
        const response = await fetch(`/api/auth/validate-token?token=${token}`);
        const result = await response.json();
        
        if (result.valid) {
            sessionData = {
                token: token,
                sessionId: result.sessionId,
                candidateName: result.candidateName,
                role: result.role
            };
            
            document.getElementById('candidateInfo').textContent = `${result.candidateName} - ${result.role}`;
            
            // Load questions
            await loadQuestions(result.role);
            
            // Initialize media
            await initializeMedia();

            // Explicitly start the interview once both are ready
            if (!interviewStarted && mediaReady && questionsReady) {
                console.log('[Interview] Auto-start after init');
                startInterview();
            }
        } else {
            showError(result.error || 'Invalid or expired interview link.');
        }
    } catch (error) {
        console.error('Token validation error:', error);
        showError('Failed to validate interview link. Please try again.');
    }
}

async function loadQuestions(role) {
    try {
        const makeSlug = (r) => r.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        let roleSlug = makeSlug(role);

        let response = await fetch(`/api/interview/questions/${roleSlug}`);
        if (!response.ok) {
            // Try alternative known slugs
            const known = {
                'salesforce-vlocity-developer': 'salesforce-vlocity-developer',
                'salesforce-service-cloud-developer': 'salesforce-service-cloud-developer',
                'quality-analyst': 'quality-analyst'
            };
            if (known[roleSlug] === undefined) {
                // Attempt map by includes
                const rlow = role.toLowerCase();
                if (rlow.includes('vlocity')) roleSlug = 'salesforce-vlocity-developer';
                else if (rlow.includes('service') && rlow.includes('cloud')) roleSlug = 'salesforce-service-cloud-developer';
                else if (rlow.includes('quality')) roleSlug = 'quality-analyst';
                response = await fetch(`/api/interview/questions/${roleSlug}`);
            }
        }
        if (!response.ok) throw new Error(`Failed to load questions (${response.status})`);
        questions = await response.json();
        
        document.getElementById('totalQuestions').textContent = questions.length;
        
        // Initialize responses array
        responses = new Array(questions.length).fill(null);
        questionsReady = true;
        maybeEnableStart();
        // Safety fallback: auto-start shortly if everything is ready
        setTimeout(() => {
            if (!interviewStarted && mediaReady && questionsReady) {
                console.log('[Interview] Fallback auto-start after loadQuestions');
                startInterview();
            }
        }, 500);
    } catch (error) {
        console.error('Error loading questions:', error);
        showError('Failed to load interview questions. Please refresh the page.');
    }
}

async function initializeMedia() {
    try {
        // Request camera and microphone access
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
        });
        
        // Setup video elements
        const setupVideo = document.getElementById('setupVideo');
        const candidateVideo = document.getElementById('candidateVideo');
        
        setupVideo.srcObject = stream;
        candidateVideo.srcObject = stream;
        
        // Setup media recorder
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            console.log('Recording stopped');
        };
        
        // Mark media ready and maybe enable Start
        mediaReady = true;
        maybeEnableStart();
        // Safety fallback: auto-start shortly if everything is ready
        setTimeout(() => {
            if (!interviewStarted && mediaReady && questionsReady) {
                console.log('[Interview] Fallback auto-start after initializeMedia');
                startInterview();
            }
        }, 500);
        
        // Monitor stream status
        monitorStreamStatus();
        
    } catch (error) {
        console.error('Media access error:', error);
        const ss = document.getElementById('setupStatus');
        if (ss) {
            ss.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to access camera and microphone. Please allow permissions and refresh the page.
                </div>
            `;
        }
    }
}

function setupEventListeners() {
    // Start interview button
    document.getElementById('startInterview').addEventListener('click', startInterview);
    
    // Navigation buttons
    document.getElementById('nextButton').addEventListener('click', nextQuestion);
    document.getElementById('prevButton').addEventListener('click', prevQuestion);
    document.getElementById('submitButton').addEventListener('click', submitInterview);
    document.getElementById('closeInterview').addEventListener('click', closeInterview);
}

function startInterview() {
    if (interviewStarted) return;
    interviewStarted = true;
    console.log('[Interview] startInterview invoked');
    // Hide setup screen and show interview screen
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('interviewScreen').style.display = 'block';
    
    // Start recording
    try {
        console.log('[Interview] Starting recorder');
        mediaRecorder.start();
    } catch (e) {
        console.warn('[Interview] Failed to start recorder:', e);
    }
    // Start speech recognition (guarded)
    if (typeof startSpeechRecognition === 'function') {
        startSpeechRecognition();
    }
    
    // Request fullscreen
    requestFullscreen();
    
    // Load first question (immediate and delayed fallback)
    if (Array.isArray(questions) && questions.length > 0) {
        loadQuestion(0);
        setTimeout(() => {
            if (document.getElementById('questionText')?.textContent === 'Loading question...') {
                console.log('[Interview] Retry render first question');
                loadQuestion(0);
            }
        }, 300);
    } else {
        console.warn('[Interview] Questions not loaded yet');
        // Retry shortly
        setTimeout(() => {
            if (Array.isArray(questions) && questions.length > 0) {
                loadQuestion(0);
            }
        }, 300);
    }
    
    // Notify server that interview started
    socket.emit('interview-started', sessionData);

    // Start global timer for entire interview (60 minutes)
    startGlobalTimer(3600);
}

function loadQuestion(index) {
    try {
        console.log('[Interview] loadQuestion', index);
        currentQuestionIndex = index;
        const question = questions[index];
        if (!question) {
            console.warn('[Interview] No question found at index', index, questions);
            return;
        }

        // Update progress
        const progress = ((index + 1) / questions.length) * 100;
        const pb = document.getElementById('progressBar');
        const cur = document.getElementById('currentQuestion');
        if (pb) pb.style.width = `${progress}%`;
        if (cur) cur.textContent = index + 1;

        // Display question
        const qt = document.getElementById('questionText');
        if (qt) qt.textContent = question.question || '';

        // Setup question type specific UI
        if (question.type === 'multiple-choice') {
            setupMultipleChoice(question);
        } else {
            setupTextAnswer(question);
        }

        // Update navigation buttons
        updateNavigationButtons();

        // Record question start time
        questionStartTime = Date.now();
    } catch (err) {
        console.error('[Interview] Error in loadQuestion:', err);
        const qt = document.getElementById('questionText');
        if (qt) qt.textContent = 'Failed to render question. Please click Next.';
    }
}

function setupMultipleChoice(question) {
    try {
        const mc = document.getElementById('multipleChoiceOptions');
        const ta = document.getElementById('textAnswer');
        if (mc) mc.style.display = 'block';
        if (ta) ta.style.display = 'none';

        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        optionsContainer.innerHTML = '';

        (question.options || []).forEach((option) => {
            const button = document.createElement('button');
            button.className = 'btn option-button w-100';
            button.textContent = option;
            button.addEventListener('click', () => selectOption(button, option));
            // Restore previous selection
            if (responses[currentQuestionIndex]?.answer === option) {
                button.classList.add('selected');
            }
            optionsContainer.appendChild(button);
        });
    } catch (e) {
        console.error('[Interview] setupMultipleChoice error:', e);
    }
}

function setupTextAnswer(question) {
    try {
        const mc = document.getElementById('multipleChoiceOptions');
        const ta = document.getElementById('textAnswer');
        if (mc) mc.style.display = 'none';
        if (ta) ta.style.display = 'block';

        const textArea = document.getElementById('textResponse');
        if (!textArea) return;
        textArea.value = responses[currentQuestionIndex]?.answer || '';
        // Remove previous listener by cloning node
        const clone = textArea.cloneNode(true);
        textArea.parentNode.replaceChild(clone, textArea);
        clone.addEventListener('input', () => {
            saveResponse(clone.value);
        });
    } catch (e) {
        console.error('[Interview] setupTextAnswer error:', e);
    }
}

function selectOption(button, option) {
    // Remove selection from other buttons
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Select current button
    button.classList.add('selected');
    
    // Save response
    saveResponse(option);
}

function saveResponse(answer) {
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    
    responses[currentQuestionIndex] = {
        questionId: questions[currentQuestionIndex].id,
        answer: answer,
        timeTaken: timeTaken
    };
}

function startGlobalTimer(totalSeconds) {
    clearInterval(globalTimer);
    let timeLeft = totalSeconds;
    updateTimerDisplay(timeLeft);
    globalTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(globalTimer);
            submitInterview();
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = display;
    
    // Change color when time is running out
    const timerElement = document.getElementById('timer');
    if (seconds <= 30) {
        timerElement.style.color = '#dc3545';
    } else if (seconds <= 60) {
        timerElement.style.color = '#ffc107';
    } else {
        timerElement.style.color = '#28a745';
    }
}

function nextQuestion() {
    // Prevent navigation if questions not loaded
    if (!questions || questions.length === 0) {
        console.warn('[Interview] Cannot navigate: questions not loaded');
        return;
    }
    // Save current response if text answer
    if (questions[currentQuestionIndex].type === 'text') {
        const textResponse = document.getElementById('textResponse').value;
        if (textResponse.trim()) {
            saveResponse(textResponse);
        }
    }
    
    if (currentQuestionIndex < questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    }
}

function prevQuestion() {
    if (!questions || questions.length === 0) {
        return;
    }
    if (currentQuestionIndex > 0) {
        loadQuestion(currentQuestionIndex - 1);
    }
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const submitButton = document.getElementById('submitButton');
    
    // Show/hide previous button
    prevButton.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    
    // Show submit button on last question
    if (currentQuestionIndex === questions.length - 1) {
        nextButton.style.display = 'none';
        submitButton.style.display = 'inline-block';
    } else {
        nextButton.style.display = 'inline-block';
        submitButton.style.display = 'none';
    }
}

async function submitInterview() {
    if (isSubmitting) return;
    isSubmitting = true;
    // Disable action buttons to avoid double submits
    const nextButton = document.getElementById('nextButton');
    const prevButton = document.getElementById('prevButton');
    const submitButton = document.getElementById('submitButton');
    if (nextButton) nextButton.disabled = true;
    if (prevButton) prevButton.disabled = true;
    if (submitButton) submitButton.disabled = true;
    // Stop recording
    try {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            console.log('[Interview] Stopping recorder');
            const stopPromise = new Promise((resolve) => {
                mediaRecorder.onstop = () => {
                    console.log('[Interview] Recorder stopped');
                    resolve();
                };
            });
            mediaRecorder.stop();
            await stopPromise;
        }
    } catch (e) {
        console.warn('[Interview] Error stopping recorder:', e);
    }
    // Stop speech recognition
    stopSpeechRecognition();
    clearInterval(globalTimer);
    
    // Save final response if text answer
    if (questions[currentQuestionIndex].type === 'text') {
        const textResponse = document.getElementById('textResponse').value;
        if (textResponse.trim()) {
            saveResponse(textResponse);
        }
    }
    
    // Prepare submission data
    const formData = new FormData();
    formData.append('sessionId', sessionData.sessionId);
    formData.append('token', sessionData.token);
    formData.append('responses', JSON.stringify(responses));
    formData.append('transcript', transcriptText);
    
    // Add recording if available
    if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        formData.append('recording', blob, `interview-${sessionData.sessionId}.webm`);
    }
    
    try {
        console.log('[Interview] Submitting interview payload');
        const response = await fetch('/api/interview/submit', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show completion screen
            document.getElementById('interviewScreen').style.display = 'none';
            document.getElementById('completionScreen').style.display = 'block';
            // Stop all media tracks
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
            // Exit fullscreen and redirect to a local thank-you page (avoids window.close restrictions)
            setTimeout(() => {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                window.location.href = '/thank-you.html';
            }, 1500);
        } else {
            showError(result.error || 'Failed to submit interview.');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showError('Network error when submitting. Please try again.');
    }
    isSubmitting = false;
}

function closeInterview() {
    // Stop media streams
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    // Stop speech recognition
    stopSpeechRecognition();
    
    // Exit fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    
    // Close window
    window.close();
}
function setupAntiCheating() {
    // Tab switch detection
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            windowBlurCount++;
            showCheatingAlert('Tab switching detected. Interview will end in 5 seconds.');
            socket.emit('cheating-detected', { type: 'tab-switch', sessionId: sessionData.sessionId, count: windowBlurCount });
            // Strict enforcement: end interview in 5 seconds if still not visible
            setTimeout(() => {
                if (document.hidden && !isSubmitting) submitInterview();
            }, 5000);
        }
    });
    
    // Window focus detection
    window.addEventListener('blur', function() {
        tabSwitchCount++;
        showCheatingAlert('Window focus lost. Interview will end in 5 seconds.');
        socket.emit('cheating-detected', { type: 'window-blur', sessionId: sessionData.sessionId, count: tabSwitchCount });
        setTimeout(() => {
            if (!document.hasFocus() && !isSubmitting) submitInterview();
        }, 5000);
    });
    
    // Prevent right-click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showCheatingAlert('Right-click is disabled during the interview.');
    });
    
    // Prevent common keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C')) {
            e.preventDefault();
            showCheatingAlert('Developer tools are disabled during the interview.');
        }
    });
    
    // Fullscreen exit detection
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement && isFullscreen) {
            showCheatingAlert('Please stay in fullscreen mode during the interview.');
            setTimeout(requestFullscreen, 1000);
        }
    });
}

function requestFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        isFullscreen = true;
    }
}

function showCheatingAlert(message) {
    const alertDiv = document.getElementById('cheatingAlert');
    const messageSpan = document.getElementById('cheatingMessage');
    
    messageSpan.textContent = message;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function monitorStreamStatus() {
    setInterval(() => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            
            if (!videoTrack || !videoTrack.enabled || !audioTrack || !audioTrack.enabled) {
                showCheatingAlert('Camera or microphone has been disabled! Please enable them to continue.');
                socket.emit('stream-disabled', {
                    sessionId: sessionData.sessionId,
                    video: videoTrack ? videoTrack.enabled : false,
                    audio: audioTrack ? audioTrack.enabled : false
                });
            }
        }
    }, 5000);
}

function showError(message) {
    document.body.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body text-center p-5">
                            <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                            <h3 class="mt-3 mb-3">Interview Error</h3>
                            <p class="lead">${message}</p>
                            <button class="btn btn-primary" onclick="window.close()">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Enable the Start button only when both questions and media are ready
function maybeEnableStart() {
    const startBtn = document.getElementById('startInterview');
    const ss = document.getElementById('setupStatus');
    if (mediaReady && questionsReady) {
        // Auto-start interview immediately for a smoother UX
        if (ss) ss.innerHTML = '';
        if (startBtn) startBtn.style.display = 'none';
        startInterview();
    }
}
