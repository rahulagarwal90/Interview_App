const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Load all question files
const roles = [
    'salesforce-vlocity-developer',
    'salesforce-service-cloud-developer', 
    'quality-analyst'
];

const workbook = XLSX.utils.book_new();

roles.forEach(role => {
    const questionsPath = path.join(__dirname, 'data', 'questions', `${role}.json`);
    
    if (fs.existsSync(questionsPath)) {
        const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        
        // Format data for Excel
        const excelData = questions.map((q, index) => ({
            'Question #': index + 1,
            'Question ID': q.id,
            'Question': q.question,
            'Type': q.type,
            'Options': q.options ? q.options.join(' | ') : 'N/A',
            'Correct Answer': q.correctAnswer,
            'Time Limit (seconds)': q.timeLimit || 120,
            'Difficulty': q.difficulty || 'Medium'
        }));
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Auto-size columns
        const colWidths = [
            { wch: 12 }, // Question #
            { wch: 15 }, // Question ID
            { wch: 50 }, // Question
            { wch: 15 }, // Type
            { wch: 60 }, // Options
            { wch: 40 }, // Correct Answer
            { wch: 18 }, // Time Limit
            { wch: 12 }  // Difficulty
        ];
        worksheet['!cols'] = colWidths;
        
        // Add worksheet to workbook with shortened names
        const sheetNames = {
            'salesforce-vlocity-developer': 'Vlocity Developer',
            'salesforce-service-cloud-developer': 'Service Cloud Dev',
            'quality-analyst': 'Quality Analyst'
        };
        const sheetName = sheetNames[role] || role;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
});

// Create summary sheet
const summaryData = [
    {
        'Role': 'Salesforce Vlocity Developer',
        'Total Questions': 10,
        'Multiple Choice': 8,
        'Text Questions': 2,
        'Difficulty Distribution': 'Easy: 3, Medium: 4, Hard: 3'
    },
    {
        'Role': 'Salesforce Service Cloud Developer', 
        'Total Questions': 10,
        'Multiple Choice': 6,
        'Text Questions': 4,
        'Difficulty Distribution': 'Easy: 2, Medium: 5, Hard: 3'
    },
    {
        'Role': 'Quality Analyst',
        'Total Questions': 10,
        'Multiple Choice': 6,
        'Text Questions': 4,
        'Difficulty Distribution': 'Easy: 3, Medium: 5, Hard: 2'
    }
];

const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
summaryWorksheet['!cols'] = [
    { wch: 30 }, // Role
    { wch: 15 }, // Total Questions
    { wch: 15 }, // Multiple Choice
    { wch: 15 }, // Text Questions
    { wch: 40 }  // Difficulty Distribution
];

XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

// Write the file
XLSX.writeFile(workbook, 'Interview-Questions-Database.xlsx');

console.log('Excel file generated successfully: Interview-Questions-Database.xlsx');
console.log('\nFile contains:');
console.log('- Summary sheet with overview');
console.log('- Salesforce Vlocity Developer questions (10)');
console.log('- Salesforce Service Cloud Developer questions (10)');
console.log('- Quality Analyst questions (10)');
console.log('\nTotal: 30 questions across 3 roles');
