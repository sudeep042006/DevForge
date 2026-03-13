import mongoose from 'mongoose';

const debugSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sourceCode: { type: String, required: true },
    errorLog: { type: String, required: true },
    aiFix: { type: String, default: '' },
    status: { type: String, enum: ['Unresolved', 'Resolved'], default: 'Unresolved' },
}, { timestamps: true });

export default mongoose.model('Debug', debugSchema);
