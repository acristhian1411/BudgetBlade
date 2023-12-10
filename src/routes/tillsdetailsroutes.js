import express, { Router } from 'express';
import {
  getAllTillsDetails,
  createTillsDetails,
  createManyTillsDetails,
  updateTillsDetails,
  deleteTillsDetails,
  showTillsDetails
} from '../controllers/tillsdetailscontroller.js';

const router = express.Router();

router.get('/tillsdetails', getAllTillsDetails);
router.post('/tillsdetails', createTillsDetails);
router.post('/manytillsdetails', createManyTillsDetails);
router.put('/tillsdetails/:id', updateTillsDetails);
router.delete('/tillsdetails/:id', deleteTillsDetails);
router.get('/tillsdetails/:id', showTillsDetails);

export default router;