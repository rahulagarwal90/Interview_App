// Admin panel functionality
document.addEventListener('DOMContentLoaded', function() {
    const adminForm = document.getElementById('adminForm');
    const resultDiv = document.getElementById('result');

    // Handle form submission
    adminForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            candidateEmail: document.getElementById('candidateEmail').value,
            candidateName: document.getElementById('candidateName').value,
            role: document.getElementById('role').value,
            duration: parseInt(document.getElementById('duration').value)
        };

        try {
            const response = await fetch('/api/auth/generate-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result && result.success) {
                let emailNote = '';
                if (result.emailSent) {
                    emailNote = `<div class=\"alert alert-info\"><i class=\"fas fa-envelope me-2\"></i>Email sent to ${formData.candidateEmail}</div>`;
                } else if (result.emailAttempted) {
                    emailNote = `<div class=\"alert alert-info\"><i class=\"fas fa-paper-plane me-2\"></i>Email is being sent. If not received in a few minutes, copy the link below and share manually.</div>`;
                } else {
                    emailNote = `<div class=\"alert alert-warning\"><i class=\"fas fa-envelope me-2\"></i>Email not sent (provider unavailable). Copy the link below and share manually.</div>`;
                }
                showResult('success', `
                    <h5><i class="fas fa-check-circle me-2"></i>Interview Link Generated Successfully!</h5>
                    <p><strong>Session ID:</strong> ${result.sessionId}</p>
                    <p><strong>Interview Link:</strong></p>
                    <div class="input-group mb-3">
                        <input type="text" class="form-control" value="${result.interviewLink}" id="linkToCopy" readonly>
                        <button class="btn btn-outline-secondary" type="button" onclick="copyLink()">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <p><strong>Expires:</strong> ${new Date(result.expiresAt).toLocaleString()}</p>
                    ${emailNote}
                `);
                adminForm.reset();
            } else {
                showResult('error', `<h5><i class="fas fa-exclamation-triangle me-2"></i>Error</h5><p>${result.error}</p>`);
            }
        } catch (error) {
            console.error('Error:', error);
            showResult('error', `<h5><i class="fas fa-exclamation-triangle me-2"></i>Error</h5><p>Failed to generate interview link. Please try again.</p>`);
        }
    });

    // Load dashboard on page load
    loadDashboard();
});

function showResult(type, content) {
    const resultDiv = document.getElementById('result');
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    
    resultDiv.innerHTML = `
        <div class="alert ${alertClass}" role="alert">
            ${content}
        </div>
    `;
    resultDiv.style.display = 'block';
    
    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

function copyLink() {
    const linkInput = document.getElementById('linkToCopy');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        
        // Show feedback
        const copyBtn = event.target.closest('button');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.classList.remove('btn-outline-secondary');
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-outline-secondary');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

async function loadDashboard() {
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        
        displayDashboard(data);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('dashboardContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to load dashboard data.
            </div>
        `;
    }
}

function displayDashboard(data) {
    const { activeSessions, completedResults, statistics } = data;
    
    const dashboardHTML = `
        <!-- Statistics Cards -->
        <div class="row mb-4">
            <div class="col-md-2">
                <div class="card bg-primary text-white text-center">
                    <div class="card-body">
                        <h3>${statistics.totalSessions}</h3>
                        <small>Total Sessions</small>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card bg-success text-white text-center">
                    <div class="card-body">
                        <h3>${statistics.completedSessions}</h3>
                        <small>Completed</small>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card bg-warning text-white text-center">
                    <div class="card-body">
                        <h3>${statistics.pendingSessions}</h3>
                        <small>Pending</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white text-center">
                    <div class="card-body">
                        <h3>${statistics.passedCandidates}</h3>
                        <small>Passed Candidates</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-danger text-white text-center">
                    <div class="card-body">
                        <h3>${statistics.failedCandidates}</h3>
                        <small>Failed Candidates</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Active Sessions -->
        <div class="row">
            <div class="col-md-6">
                <h5><i class="fas fa-clock me-2"></i>Active Sessions</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeSessions.map(session => `
                                <tr>
                                    <td>${session.candidateName}</td>
                                    <td>${session.role}</td>
                                    <td>
                                        <span class="badge ${session.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                                            ${session.status}
                                        </span>
                                    </td>
                                    <td>${new Date(session.createdAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="col-md-6">
                <h5><i class="fas fa-chart-bar me-2"></i>Recent Results</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Role</th>
                                <th>Score</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${completedResults.slice(0, 10).map(result => `
                                <tr>
                                    <td>${result.candidateName}</td>
                                    <td>${result.role}</td>
                                    <td>${result.score.toFixed(1)}%</td>
                                    <td>
                                        <span class="badge ${result.isPassed ? 'bg-success' : 'bg-danger'}">
                                            ${result.isPassed ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = dashboardHTML;
}

async function exportResults() {
    try {
        const response = await fetch('/api/admin/export-results');
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'interview-results.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showNotification('success', 'Results exported successfully!');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting results:', error);
        showNotification('error', 'Failed to export results.');
    }
}

async function exportQuestions() {
    const role = prompt('Enter role to export questions for:\n1. Salesforce Vlocity Developer\n2. Salesforce Service Cloud Developer\n3. Quality Analyst');
    
    if (!role) return;
    
    const roleMap = {
        '1': 'Salesforce Vlocity Developer',
        '2': 'Salesforce Service Cloud Developer', 
        '3': 'Quality Analyst'
    };
    
    const selectedRole = roleMap[role] || role;
    const roleSlug = selectedRole.toLowerCase().replace(/\s+/g, '-');
    
    try {
        const response = await fetch(`/api/admin/export-questions/${roleSlug}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${roleSlug}-questions.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showNotification('success', 'Questions exported successfully!');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting questions:', error);
        showNotification('error', 'Failed to export questions.');
    }
}

function showNotification(type, message) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}
