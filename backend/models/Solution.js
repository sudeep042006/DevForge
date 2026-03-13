import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    problemDescription: { type: String, required: true },
    codeSnippet: { type: String, required: true },
    explanation: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Solution', solutionSchema);
