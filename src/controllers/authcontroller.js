// Utiliza import para importar los módulos necesarios
import {prisma } from '../utilities/db.js'
import hashToken from '../utilities/hashToken.js'
import jsonwebtoken from 'jsonwebtoken'


// Usado cuando creamos un token de refresco.
function addRefreshTokenToWhitelist({ jti, refreshToken, userId }) {
  return prisma.refreshToken.create({
    data: {
      id: jti,
      hashedToken: hashToken(refreshToken),
      userId
    },
  });
}

function verifyToken(req,res,next){
  const token = req.headers['authorization'];
  if(token == null || token == 'null' || token == 'undefined'){
    return res.status(401).json({message:'No token provided'})
  }
  jsonwebtoken.verify(token.split(' ')[1], process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token inválido' });
    req.user = decoded;
    next();
});
}
// Usado para verificar si el token enviado por el cliente está en la base de datos.
function findRefreshTokenById(id) {
  return prisma.refreshToken.findUnique({
    where: {
      id,
    },
  });
}

// Eliminar tokens después de su uso.
function deleteRefreshToken(id) {
  return prisma.refreshToken.update({
    where: {
      id,
    },
    data: {
      revoked: true
    }
  });
}

function revokeTokens(userId) {
  return prisma.refreshToken.updateMany({
    where: {
      userId
    },
    data: {
      revoked: true
    }
  });
}

// Exporta las funciones necesarias
export {
  addRefreshTokenToWhitelist,
  findRefreshTokenById,
  deleteRefreshToken,
  revokeTokens,
  verifyToken
};
