import { Router } from 'express';
import { getCourses, getCourse, createCourse, updateCourse, deleteCourse } from '../controllers/courseController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // Protect all routes

router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
