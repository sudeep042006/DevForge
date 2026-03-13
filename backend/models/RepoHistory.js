import mongoose from 'mongoose';

const repoHistorySchema = new mongoose.Schema({
    repoUrl: { type: String, required: true },
    owner: { type: String },
    repoName: { type: String },
    aiSummary: {
        projectExplanation: { type: String, default: '' },
        mainModules: { type: String, default: '' },
    },
    architectureDiagram: { type: String, default: '' },
    filesCount: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'error'], default: 'success' },
}, {
    timestamps: true // Adds createdAt + updatedAt automatically
});

export default mongoose.model('RepoHistory', repoHistorySchema);
