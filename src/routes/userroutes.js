// Utiliza import para importar los módulos necesarios
import express from 'express';
import { isAuthenticated } from '../middlewares/middlewares.js';
import { findUserById } from '../controllers/usercontroller.js';

const router = express.Router();

router.get('/profile', isAuthenticated,  async (req, res, next) => {
    try {
        const { userId } = req.body;
        const user = await findUserById(userId);
        delete user.password;
        res.json(user);
    } catch (err) {
    next(err);
}
});

// Exporta el router para que pueda ser utilizado por la aplicación
export default router;
