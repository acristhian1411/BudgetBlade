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

/**
 * @swagger
 * components:
 *   schemas:
 *     Tills:
 *       type: object
 *       required:
 *         - TILL_NAME
 *         - TILL_ACCOUNT_NUMBER
 *         - person_id
 *         - t_type_id
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the till
 *         TILL_NAME:
 *           type: string
 *           description: The title of your till
 *         TILL_ACCOUNT_NUMBER:
 *           type: string
 *           description: The title of your till
 *         person_id:
 *           type: string
 *           description: The id of the person who owns the till
 *         t_type_id:
 *           type: string
 *           description: The id of the till type
 *         createdAt:
 *           type: string
 *           format: date
 *           description: The date the till was added
 *       example:
 *         id: 22
 *         TILL_NAME: Caja1
 *         TILL_ACCOUNT_NUMBER: 12344-4
 *         person_id: 12
 *         t_type_id: 21
 *         createdAt: 2020-03-10T04:05:06.157Z
 */

/**
 * @swagger
 * tags:
 *   name: Tills
 *   description: The tills managing API
 * /api/tills:
 *   get:
 *     summary: Lists all the tills
 *     tags: [Tills]
 *     responses:
 *       200:
 *         description: The list of the tills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tills'
 *   post:
 *     summary: Create a new till
 *     tags: [Tills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tills'
 *     responses:
 *       200:
 *         description: The created till.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tills'
 *       500:
 *         description: Some server error
 * /api/searchtills:
 *   get:
 *     summary: Get the till by a search value
 *     tags: [Tills]
 *     parameters:
 *       - in: path
 *         name: t_type_desc
 *         schema:
 *           type: string
 *         required: true
 *         description: The search value
 *     responses:
 *       200:
 *         description: The till response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tills'
 *       404:
 *         description: The till was not found
 * /api/tills/{id}:
 *   get:
 *     summary: Get the till by id
 *     tags: [Tills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The till id
 *     responses:
 *       200:
 *         description: The till response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tills'
 *       404:
 *         description: The till was not found
 *   put:
 *    summary: Update the till by the id
 *    tags: [Tills]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The till id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Tills'
 *    responses:
 *      200:
 *        description: The till was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Tills'
 *      404:
 *        description: The till was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the till by id
 *     tags: [Tills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The till id
 *
 *     responses:
 *       200:
 *         description: The till was deleted
 *       404:
 *         description: The till was not found
 * 
 */


export default router;