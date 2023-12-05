import supertest from 'supertest';
import app from '../src/index.js'; // Reemplaza 'tu_app' con el nombre de tu aplicación Express
import {faker} from '@faker-js/faker'
const request = supertest(app);

describe('Tills Controller', () => {
  it('debería obtener todos los tipos de tills', async () => {
    const response = await request.get('/api/tillstypes');
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería crear un nuevo tipo de tills', async () => {
    const newType = { t_type_desc: faker.commerce.department() };
    const response = await request.post('/api/tillstypes').send(newType);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería obtener un tipo de tills por ID', async () => {
    const typeId = 3; // Reemplaza con un ID válido
    const response = await request.get(`/api/tillstypes/${typeId}`);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería actualizar un tipo de tills por ID', async () => {
    const typeId = 10; // Reemplaza con un ID válido
    const updatedType = { t_type_desc: faker.commerce.department() };
    const response = await request.put(`/api/tillstypes/${typeId}`).send(updatedType);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería eliminar un tipo de tills por ID', async () => {
    const typeId = 10; // Reemplaza con un ID válido
    const response = await request.delete(`/api/tillstypes/${typeId}`);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });
});
