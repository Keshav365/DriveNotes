import express from 'express';
import { catchAsync } from '../middleware/errorHandler';

const router = express.Router();

router.get('/', catchAsync(async (req, res) => {
  res.status(501).json({ success: false, message: 'Calendar API - Coming soon!' });
}));

export default router;
