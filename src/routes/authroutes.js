// Utiliza import para importar los módulos necesarios
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateTokens } from '../utilities/jwt.js';
import bcrypt from 'bcrypt';
import { addRefreshTokenToWhitelist,
  findRefreshTokenById,
  deleteRefreshToken,
  revokeTokens } from '../controllers/authcontroller.js';
import { findUserByEmail, createUserByEmailAndPassword } from '../controllers/usercontroller.js';
import hashToken from '../utilities/hashToken.js';
// const { hashToken } = require('../../utils/hashToken');
const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, person_id } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error('You must provide an email and a password.');
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      res.status(400);
      throw new Error('Email already in use.');
    }

    const user = await createUserByEmailAndPassword({ email, password,person_id });
    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(user, jti);
    await addRefreshTokenToWhitelist({ jti, refreshToken, userId: user.id });

    res.json({
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400);
        throw new Error('You must provide an email and a password.');
      }
  
      const existingUser = await findUserByEmail(email);
  
      if (!existingUser) {
        res.status(403);
        throw new Error('Invalid login credentials.');
      }
  
      const validPassword = await bcrypt.compare(password, existingUser.password);
      if (!validPassword) {
        res.status(403);
        throw new Error('Invalid login credentials.');
      }
  
      const jti = uuidv4();
      const { accessToken, refreshToken } = generateTokens(existingUser, jti);
      await addRefreshTokenToWhitelist({ jti, refreshToken, userId: existingUser.id });
  
      res.json({
        accessToken,
        refreshToken
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/refreshToken', async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400);
        throw new Error('Missing refresh token.');
      }
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const savedRefreshToken = await findRefreshTokenById(payload.jti);
  
      if (!savedRefreshToken || savedRefreshToken.revoked === true) {
        res.status(401);
        throw new Error('Unauthorized');
      }
  
      const hashedToken = hashToken(refreshToken);
      if (hashedToken !== savedRefreshToken.hashedToken) {
        res.status(401);
        throw new Error('Unauthorized');
      }
  
      const user = await findUserById(payload.userId);
      if (!user) {
        res.status(401);
        throw new Error('Unauthorized');
      }
  
      await deleteRefreshToken(savedRefreshToken.id);
      const jti = uuidv4();
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, jti);
      await addRefreshTokenToWhitelist({ jti, refreshToken: newRefreshToken, userId: user.id });
  
      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (err) {
      next(err);
    }
  });
  
  // This endpoint is only for demo purpose.
  // Move this logic where you need to revoke the tokens( for ex, on password reset)
  router.post('/revokeRefreshTokens', async (req, res, next) => {
    try {
      const { userId } = req.body;
      await revokeTokens(userId);
      res.json({ message: `Tokens revoked for user with id #${userId}` });
    } catch (err) {
      next(err);
    }
  });

// Exporta el router para que pueda ser utilizado por la aplicación
export default router;
