import express from 'express';
import { createCrudControllers } from '../controllers/crudFactory.js';
import Project from '../models/Project.js';
import Code from '../models/Code.js';
import GithubRepo from '../models/GithubRepo.js';
import Plan from '../models/Plan.js';
import Solution from '../models/Solution.js';
import Debug from '../models/Debug.js';

const router = express.Router();

// Helper to mount standard CRUD routes for a given path and model
const mountCrudRoutes = (path, Model) => {
    const controllers = createCrudControllers(Model);
    
    // e.g. /api/core/projects
    router.route(`/${path}`)
        .get(controllers.getMany)
        .post(controllers.createOne);
        
    router.route(`/${path}/:id`)
        .get(controllers.getOne)
        .put(controllers.updateOne)
        .delete(controllers.removeOne);
};

// Mount all entities
mountCrudRoutes('projects', Project);
mountCrudRoutes('codes', Code);
mountCrudRoutes('repos', GithubRepo);
mountCrudRoutes('plans', Plan);
mountCrudRoutes('solutions', Solution);
mountCrudRoutes('debugs', Debug);

export default router;
