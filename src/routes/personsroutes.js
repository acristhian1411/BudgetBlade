import express, { Router } from 'express';
import {
  getAllPersons,
  createPersons,
  updatePersons,
  deletePersons,
  showPersons,
  searchPersons,
  personTypesList
} from '../controllers/personController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/')); // Guardar archivos en la carpeta "uploads"
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Mantener el nombre original del archivo
  }
});

// Middleware de multer para la subida de archivos
const upload = multer({ storage: storage }).single('photo');


router.get('/persons', getAllPersons);
router.post('/persons', createPersons);
router.put('/persons/:id',upload, updatePersons);
router.delete('/persons/:id', deletePersons);
router.get('/persons/:id', showPersons);
router.get('/searchpersons', searchPersons);
router.get('/personTypesList/:id', personTypesList);

/**
 * @swagger
 * components:
 *   schemas:
 *     Persons:
 *       type: object
 *       required:
 *         - person_fname
 *         - person_lname
 *         - person_idnumber
 *         - birthDate
 *         - p_type_id
 *       properties:
 *         person_id:
 *           type: string
 *           description: The auto-generated id of the person
 *         person_fname:
 *           type: string
 *           description: The first name of your person
 *         person_lname:
 *           type: string
 *           description: The last name of your person
 *         person_idnumber:
 *           type: string
 *           description: The dni of your person
 *         birthDate:
 *           type: date
 *           description: The birthdate of your person
 *         p_type_id:
 *           type: integer
 *           description: The id of person type of your person
 *         createdAt:
 *           type: string
 *           format: date
 *           description: The date the person was added
  *       example:
  *         person_id: 22
  *         person_fname: Pepe
  *         person_lname: Perez
  *         person_idnumber: 12332-12
  *         birthDate: 12/12/2001
  *         p_type_id: 1
  *         createdAt: 2020-03-10T04:05:06.157Z
 */

/**
 * @swagger
 * tags:
 *   name: Persons
 *   description: The persons managing API
 * /api/persons:
 *   get:
 *     summary: Lists all the persons
 *     tags: [Persons]
 *     responses:
 *       200:
 *         description: The list of the persons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Persons'
 *   post:
 *     summary: Create a new person
 *     tags: [Persons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Persons'
 *     responses:
 *       200:
 *         description: The created person.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persons'
 *       500:
 *         description: Some server error
 * /api/searchpersons:
 *   get:
 *     summary: Get the person by a search value
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: p_type_desc
 *         schema:
 *           type: string
 *         required: true
 *         description: The search value
 *     responses:
 *       200:
 *         description: The person response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persons'
 *       404:
 *         description: The person was not found
 * /api/personTypesList/{id}:
 *   get:
 *     summary: Get a list of persons by p_type_id
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The id of the person type
 *     responses:
 *       200:
 *         description: The person response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persons'
 *       404:
 *         description: The person was not found
 * /api/persons/{id}:
 *   get:
 *     summary: Get the person by id
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The person id
 *     responses:
 *       200:
 *         description: The person response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persons'
 *       404:
 *         description: The person was not found
 *   put:
 *    summary: Update the person by the id
 *    tags: [Persons]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The person id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Persons'
 *    responses:
 *      200:
 *        description: The person was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Persons'
 *      404:
 *        description: The person was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the person by id
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The person id
 *
 *     responses:
 *       200:
 *         description: The person was deleted
 *       404:
 *         description: The person was not found
 * 
 */

export default router;


