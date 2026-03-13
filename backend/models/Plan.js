import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    steps: [{ 
        description: String, 
        completed: { type: Boolean, default: false } 
    }],
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);
