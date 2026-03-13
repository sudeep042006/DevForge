import mongoose from 'mongoose';

const githubRepoSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    repoUrl: { type: String, required: true },
    branch: { type: String, default: 'main' },
    lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('GithubRepo', githubRepoSchema);
