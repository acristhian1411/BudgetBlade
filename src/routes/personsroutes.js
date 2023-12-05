import express, { Router } from 'express';
import {
  getAllPersons,
  createPersons,
  updatePersons,
  deletePersons,
  showPersons,
  searchPersons
} from '../controllers/personController.js';

const router = express.Router();

router.get('/persons', getAllPersons);
router.post('/persons', createPersons);
router.put('/persons/:id', updatePersons);
router.delete('/persons/:id', deletePersons);
router.get('/persons/:id', showPersons);
router.get('/searchpersons', searchPersons);

export default router;


