import express, { Router } from 'express';
import {
  getAllTills,
  createTills,
  updateTills,
  deleteTills,
  showTills,
  searchTills
} from '../controllers/tillscontroller.js';

const router = express.Router();

router.get('/tills', getAllTills);
router.post('/tills', createTills);
router.put('/tills/:id', updateTills);
router.delete('/tills/:id', deleteTills);
router.get('/tills/:id', showTills);
router.get('/searchtills', searchTills);

export default router;