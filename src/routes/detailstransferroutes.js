import express, { Router } from 'express';
import {
  getAllDetailsTransfers,
  createDetailsTransfer,
  updateDetailsTransfer,
  deleteDetailsTransfer,
  showDetailsTransfer,
  searchDetailsTransfers,
} from '../controllers/detailstransfercontroller.js';

const router = express.Router();

router.get('/detailstransfer', getAllDetailsTransfers);
router.post('/detailstransfer', createDetailsTransfer);
router.put('/detailstransfer/:id', updateDetailsTransfer);
router.delete('/detailstransfer/:id', deleteDetailsTransfer);
router.get('/detailstransfer/:id', showDetailsTransfer);
router.get('/searchdetailstransfer', searchDetailsTransfers);

export default router;