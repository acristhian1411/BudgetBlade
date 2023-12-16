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

/**
 * @swagger
 * components:
 *   schemas:
 *     PersonTypes:
 *       type: object
 *       required:
 *         - p_type_desc
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the persontype
 *         p_type_desc:
 *           type: string
 *           description: The title of your persontype
 *         createdAt:
 *           type: string
 *           format: date
 *           description: The date the persontype was added
 *       example:
 *         id: 22
 *         p_type_desc: Proveedor
 *         createdAt: 2020-03-10T04:05:06.157Z
 */

/**
 * @swagger
 * tags:
 *   name: PersonTypes
 *   description: The persontypes managing API
 * /api/persontypes:
 *   get:
 *     summary: Lists all the persontypes
 *     tags: [PersonTypes]
 *     responses:
 *       200:
 *         description: The list of the persontypes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PersonTypes'
 *   post:
 *     summary: Create a new persontype
 *     tags: [PersonTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonTypes'
 *     responses:
 *       200:
 *         description: The created persontype.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PersonTypes'
 *       500:
 *         description: Some server error
 * /api/searchpersontypes:
 *   get:
 *     summary: Get the persontype by a search value
 *     tags: [PersonTypes]
 *     parameters:
 *       - in: path
 *         name: p_type_desc
 *         schema:
 *           type: string
 *         required: true
 *         description: The search value
 *     responses:
 *       200:
 *         description: The persontype response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PersonTypes'
 *       404:
 *         description: The persontype was not found
 * /api/persontypes/{id}:
 *   get:
 *     summary: Get the persontype by id
 *     tags: [PersonTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The persontype id
 *     responses:
 *       200:
 *         description: The persontype response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PersonTypes'
 *       404:
 *         description: The persontype was not found
 *   put:
 *    summary: Update the persontype by the id
 *    tags: [PersonTypes]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The persontype id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/PersonTypes'
 *    responses:
 *      200:
 *        description: The persontype was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/PersonTypes'
 *      404:
 *        description: The persontype was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the persontype by id
 *     tags: [PersonTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The persontype id
 *
 *     responses:
 *       200:
 *         description: The persontype was deleted
 *       404:
 *         description: The persontype was not found
 * 
 */

export default router;


