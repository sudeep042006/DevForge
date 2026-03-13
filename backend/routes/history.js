import express from 'express';
import RepoHistory from '../models/RepoHistory.js';

const router = express.Router();

// GET /api/history - Return all past repo analyses, newest first
router.get('/', async (req, res) => {
    try {
        const history = await RepoHistory.find()
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json(history);
    } catch (err) {
        console.error('[Node.js] Error fetching repo history:', err.message);
        return res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

// GET /api/history/activity - Daily scan counts for the last 30 days (for Dashboard Activity Graph)
router.get('/activity', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const results = await RepoHistory.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Build a filled array for all 30 days (0 if no activity)
        const activityMap = {};
        results.forEach(r => { activityMap[r._id] = r.count; });

        const days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            days.push({ date: key, scans: activityMap[key] || 0 });
        }

        // Also return overall stats
        const totalScans = await RepoHistory.countDocuments();
        const uniqueRepos = await RepoHistory.distinct('repoUrl');

        return res.status(200).json({
            activity: days,
            stats: {
                totalScans,
                uniqueRepos: uniqueRepos.length
            }
        });
    } catch (err) {
        console.error('[Node.js] Error fetching activity:', err.message);
        return res.status(500).json({ error: 'Failed to fetch activity data.' });
    }
});

// DELETE /api/history/:id - Delete a single history record
router.delete('/:id', async (req, res) => {
    try {
        await RepoHistory.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Record deleted.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to delete record.' });
    }
});

export default router;
