import express, { Router } from 'express';
import {
  getAllTillsTypes,
  createTillsType,
  updateTillsType,
  deleteTillsType,
  showTillsType,
  searchTillsTypes
} from '../controllers/tilltypescontroller.js';

const router = express.Router();

router.get('/tillstypes', getAllTillsTypes);
router.post('/tillstypes', createTillsType);
router.put('/tillstypes/:id', updateTillsType);
router.delete('/tillstypes/:id', deleteTillsType);
router.get('/tillstypes/:id', showTillsType);
router.get('/searchtillstypes', searchTillsTypes);

export default router;