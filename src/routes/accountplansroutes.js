import express, { Router } from 'express';
import {
  getAllAccountPlans,
  createAccountPlans,
  updateAccountPlans,
  deleteAccountPlans,
  showAccountPlans,
  searchAccountPlans
} from '../controllers/accountplanscontroller.js';

const router = express.Router();

router.get('/accountplans', getAllAccountPlans);
router.post('/accountplans', createAccountPlans);
router.put('/accountplans/:id', updateAccountPlans);
router.delete('/accountplans/:id', deleteAccountPlans);
router.get('/accountplans/:id', showAccountPlans);
router.get('/searchaccountplans', searchAccountPlans);

export default router;