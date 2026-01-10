import express from 'express';
import {
  search,
  popularKeywords,
  suggestions,
} from '../controllers/searchController';

const router = express.Router();

// GET /api/search?q=keyword&page=1&limit=20&categoryId=1&minPrice=100000&maxPrice=500000&colors=Đen,Trắng&sizes=S,M&sortBy=price_asc
router.get('/', search);

// GET /api/search/popular - Get popular/trending keywords
router.get('/popular', popularKeywords);

// GET /api/search/suggestions?q=ao - Autocomplete suggestions
router.get('/suggestions', suggestions);

export default router;
