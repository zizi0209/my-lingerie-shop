import express from 'express';
import { getFilters } from '../controllers/filterController';

const router = express.Router();

// GET /api/filters - Lấy tất cả filter options
router.get('/', getFilters);

export default router;
