import express, { Router } from 'express';
import {
  getAllPersonTypes,
  createPersonType,
  updatePersonType,
  deletePersonType,
  showPersonType,
  searchPersonTypes
} from '../controllers/persontypescontroller.js';

const router = express.Router();

router.get('/persontypes', getAllPersonTypes);
router.post('/persontypes', createPersonType);
router.put('/persontypes/:id', updatePersonType);
router.delete('/persontypes/:id', deletePersonType);
router.get('/persontypes/:id', showPersonType);
router.get('/searchpersontypes', searchPersonTypes);

export default router;


