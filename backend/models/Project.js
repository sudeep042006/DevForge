import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // optional for now
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
