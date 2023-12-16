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
/**
 * @swagger
 * /api/tills:
 *   get:
 *     summary: Retrieve a list of tills
 *     description: Retrieve a list of users from Database. Can be used to populate a list of fake tills when prototyping or testing an API.
 *     parameters:
 *       - in: path
 *         name: page
 *         required: false
 *         description: The page .
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: pageSize
 *         required: false
 *         description: The quantity of results per page.
 *         schema:
 *           type: integer
 *         example: 15
 *       - in: path
 *         name: sortOrder
 *         required: false
 *         description: The direction of sorting.
 *         example: asc
 *         schema:
 *           type: string
 *       - in: path
 *         name: sortBy
 *         required: false
 *         description: The argument of sorting.
 *         schema:
 *           type: string
 *         example: TILL_NAME
 *     responses:
 *       200:
 *         description: A list of tills.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The Till ID.
 *                         example: 0
 *                       TILL_NAME:
 *                         type: string
 *                         description: The till description.
 *                         example: Caja 1
 *                       TILL_ACCOUNT_NUMBER:
 *                         type: string
 *                         description: 
 *                         example: 1234124
 *                       person_id:
 *                         type: integer
 *                         description: The id of the person to whom the till belongs
 *                         example: 1
 *                       t_type_id:
 *                         type: integer
 *                         description: The id of the till type
 *                         example: 1
*/
router.get('/tills', getAllTills);
/**
 * @swagger
 *
 * /api/tills:
 *   post:
 *     produces:
 *       - application/json
 *     parameters:
 *       - TILL_NAME: till description
 *         in: formData
 *         required: true
 *         type: string
 *         example: "Caja1"
 *       - name: TILL_ACCOUNT_NUMBER
 *         in: formData
 *         required: true
 *         type: string
 *         example: 1234124
 *       - name: t_type_id
 *         in: formData
 *         required: true
 *         type: integer
 *         example: 11
 *       - name: person_id
 *         in: formData
 *         required: true
 *         type: integer
 *         example: 123
 */
router.post('/tills', createTills);
router.put('/tills/:id', updateTills);
router.delete('/tills/:id', deleteTills);
router.get('/tills/:id', showTills);
router.get('/searchtills', searchTills);

export default router;