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
import {verifyToken} from '../controllers/authcontroller.js'

const router = express.Router();

router.get('/accountplans',verifyToken, getAllAccountPlans);
router.post('/accountplans',verifyToken, createAccountPlans);
router.put('/accountplans/:id',verifyToken, updateAccountPlans);
router.delete('/accountplans/:id',verifyToken, deleteAccountPlans);
router.get('/accountplans/:id',verifyToken, showAccountPlans);
router.get('/searchaccountplans',verifyToken, searchAccountPlans);
router.get('/findAccountplansByCode',verifyToken, findByCode);

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
 *           description: The id of the account plan to which it belongs
 *         account_desc:
 *           type: string
 *           description: The description of your accountplan
 *         account_code:
 *           type: string
 *           description: The code of your accountplan
 *         createdAt:
 *           type: string
 *           format: date
 *           description: The date the accountplan was added
 *       example:
 *         id: 22
 *         account_pid: 1
 *         account_desc: Pasivo
 *         account_code: 1.0.0
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
 *         description: The list of the AccountPlans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccountPlans'
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of results
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
 * /api/findAccountplansByCode:
 *   get:
 *     summary: Get the accountplan by a code value
 *     tags: [AccountPlans]
 *     parameters:
 *       - in: query
 *         name: desc
 *         schema:
 *           type: string
 *         required: false
 *         description: The search value
 *         example: Activo
 *       - in: query
 *         name: p1
 *         schema:
 *           type: string
 *         required: false
 *         description: The search value
 *         example: 1
 *       - in: query
 *         name: p2
 *         schema:
 *           type: string
 *         required: false
 *         description: The search value
 *         example: 2
 *       - in: query
 *         name: p3
 *         schema:
 *           type: string
 *         required: false
 *         description: The search value
 *         example: 3
 *     responses:
 *       200:
 *         description: The list of the AccountPlans filtered by code and optionaly by description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccountPlans'
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of results
 *       404:
 *         description: The accountplan was not found
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
 *         description: The list of the AccountPlans filtered by description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccountPlans'
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of results
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