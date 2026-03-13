import mongoose from 'mongoose';


const scanRecordSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false // Set to false for the hackathon so you can test quickly without making users first
    },
    fileName: {
        type: String,
        required: true,
        default: 'untitled_script.js'
    },
    codeSnippet: {
        type: String,
        required: true
    },
    riskScore: {
        type: Number, // This comes from your Python ML Model (e.g., 85.5% risk of bugs)
        required: true
    },
    detectedBugs: [{
        bugType: String, // e.g., "Security", "Performance", "Logical"
        lineNumbers: [Number],
        description: String
    }],
    aiSuggestedFixes: [{
        originalCode: String,
        fixedCode: String,
        explanation: String
    }]
}, { 
    timestamps: true // Automatically adds createdAt and updatedAt
});

const ScanRecord = mongoose.model('ScanRecord', scanRecordSchema);

export default ScanRecord;