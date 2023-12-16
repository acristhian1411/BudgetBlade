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

/**
 * @swagger
 * components:
 *   schemas:
 *     TillsTypes:
 *       type: object
 *       required:
 *         - title
 *         - author
 *         - finished
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the tillstype
 *         t_type_desc:
 *           type: string
 *           description: The title of your tillstype
 *         createdAt:
 *           type: string
 *           format: date
 *           description: The date the tillstype was added
 *       example:
 *         id: 22
 *         t_type_desc: Banco
 *         createdAt: 2020-03-10T04:05:06.157Z
 */

/**
 * @swagger
 * tags:
 *   name: TillsTypes
 *   description: The tillstypes managing API
 * /api/tillstypes:
 *   get:
 *     summary: Lists all the tillstypes
 *     tags: [TillsTypes]
 *     responses:
 *       200:
 *         description: The list of the tillstypes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TillsTypes'
 *   post:
 *     summary: Create a new tillstype
 *     tags: [TillsTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TillsTypes'
 *     responses:
 *       200:
 *         description: The csreated tillstype.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TillsTypes'
 *       500:
 *         description: Some server error
 * /api/searchtillstypes:
 *   get:
 *     summary: Get the tillstype by a search value
 *     tags: [TillsTypes]
 *     parameters:
 *       - in: path
 *         name: t_type_desc
 *         schema:
 *           type: string
 *         required: true
 *         description: The search value
 *     responses:
 *       200:
 *         description: The tillstype response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TillsTypes'
 *       404:
 *         description: The tillstype was not found
 * /api/tillstypes/{id}:
 *   get:
 *     summary: Get the tillstype by id
 *     tags: [TillsTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The tillstype id
 *     responses:
 *       200:
 *         description: The tillstype response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TillsTypes'
 *       404:
 *         description: The tillstype was not found
 *   put:
 *    summary: Update the tillstype by the id
 *    tags: [TillsTypes]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The tillstype id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/TillsTypes'
 *    responses:
 *      200:
 *        description: The tillstype was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/TillsTypes'
 *      404:
 *        description: The tillstype was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the tillstype by id
 *     tags: [TillsTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The tillstype id
 *
 *     responses:
 *       200:
 *         description: The tillstype was deleted
 *       404:
 *         description: The tillstype was not found
 * 
 */

export default router;