// Utiliza import para importar los módulos necesarios
import bcrypt from 'bcrypt';
import {prisma } from '../utilities/db.js'

function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: {
      email,
    },
  });
}

function createUserByEmailAndPassword(user) {
  user.password = bcrypt.hashSync(user.password, 12);
  return prisma.user.create({
    data: user,
  });
}

function findUserById(id) {
  return prisma.user.findFirst({
    where: {
      id: id,
    },
  });
}

// Exporta las funciones necesarias
export {
  findUserByEmail,
  findUserById,
  createUserByEmailAndPassword
};
