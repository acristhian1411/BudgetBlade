import express, { Router } from 'express';
import {
  getAllAccountPlans,
  createAccountPlans,
  updateAccountPlans,
  deleteAccountPlans,
  showAccountPlans,
  searchAccountPlans,
  findByCode
} from '../controllers/accountplanscontroller.js';

const router = express.Router();

router.get('/accountplans', getAllAccountPlans);
router.post('/accountplans', createAccountPlans);
router.put('/accountplans/:id', updateAccountPlans);
router.delete('/accountplans/:id', deleteAccountPlans);
router.get('/accountplans/:id', showAccountPlans);
router.get('/searchaccountplans', searchAccountPlans);
router.get('/findAccountplansByCode', findByCode);

/**
 * @swagger
 * components:
 *   schemas:
 *     AccountPlans:
 *       type: object
 *       required:
 *         - account_pid
 *         - account_desc
 *         - account_code
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the accountplan
 *         account_pid:
 *           type: integer
 *           description: The title of your accountplan
 *         account_desc:
 *           type: string
 *           description: The title of your accountplan
 *         account_code:
 *           type: string
 *           description: The title of your accountplan
 *         createdAt:
 *           type: string
 *           format: date
 *           description: The date the accountplan was added
 *       example:
 *         id: 22
 *         account_pid: 1
 *         account_desc: Pasivo
 *         account_code: 1.2.2
 *         createdAt: 2020-03-10T04:05:06.157Z
 */

/**
 * @swagger
 * tags:
 *   name: AccountPlans
 *   description: The accountplans managing API
 * /api/accountplans:
 *   get:
 *     summary: Lists all the accountplans
 *     tags: [AccountPlans]
 *     responses:
 *       200:
 *         description: The list of the accountplans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AccountPlans'
 *   post:
 *     summary: Create a new accountplan
 *     tags: [AccountPlans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountPlans'
 *     responses:
 *       200:
 *         description: The created accountplan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountPlans'
 *       500:
 *         description: Some server error
 * /api/searchaccountplans:
 *   get:
 *     summary: Get the accountplan by a search value
 *     tags: [AccountPlans]
 *     parameters:
 *       - in: path
 *         name: account_desc
 *         schema:
 *           type: string
 *         required: true
 *         description: The search value
 *     responses:
 *       200:
 *         description: The accountplan response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountPlans'
 *       404:
 *         description: The accountplan was not found
 * /api/accountplans/{id}:
 *   get:
 *     summary: Get the accountplan by id
 *     tags: [AccountPlans]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The accountplan id
 *     responses:
 *       200:
 *         description: The accountplan response by id
 *         contens:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountPlans'
 *       404:
 *         description: The accountplan was not found
 *   put:
 *    summary: Update the accountplan by the id
 *    tags: [AccountPlans]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: The accountplan id
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/AccountPlans'
 *    responses:
 *      200:
 *        description: The accountplan was updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/AccountPlans'
 *      404:
 *        description: The accountplan was not found
 *      500:
 *        description: Some error happened
 *   delete:
 *     summary: Remove the accountplan by id
 *     tags: [AccountPlans]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The accountplan id
 *
 *     responses:
 *       200:
 *         description: The accountplan was deleted
 *       404:
 *         description: The accountplan was not found
 * 
 */

export default router;