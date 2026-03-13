export const createCrudControllers = (Model) => {
    return {
        // Create one
        createOne: async (req, res) => {
            try {
                const doc = await Model.create(req.body);
                res.status(201).json({ data: doc });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        },

        // Get many
        getMany: async (req, res) => {
            try {
                const docs = await Model.find(req.query).sort({ createdAt: -1 });
                res.status(200).json({ data: docs });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        },

        // Get one
        getOne: async (req, res) => {
            try {
                const doc = await Model.findById(req.params.id);
                if (!doc) {
                    return res.status(404).json({ error: 'Document not found' });
                }
                res.status(200).json({ data: doc });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        },

        // Update one
        updateOne: async (req, res) => {
            try {
                const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
                if (!doc) {
                    return res.status(404).json({ error: 'Document not found' });
                }
                res.status(200).json({ data: doc });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        },

        // Remove one
        removeOne: async (req, res) => {
            try {
                const doc = await Model.findByIdAndDelete(req.params.id);
                if (!doc) {
                    return res.status(404).json({ error: 'Document not found' });
                }
                res.status(200).json({ data: doc });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        }
    };
};
