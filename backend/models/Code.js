import mongoose from 'mongoose';

const codeSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    fileName: { type: String, required: true },
    content: { type: String, required: true },
    language: { type: String, default: 'javascript' },
}, { timestamps: true });

export default mongoose.model('Code', codeSchema);
