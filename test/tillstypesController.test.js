import supertest from 'supertest';
import app from '../src/aux_index'; // Reemplaza 'tu_app' con el nombre de tu aplicación Express
import {faker} from '@faker-js/faker'
const request = supertest(app);


describe("GET /api/tillstypes", () => {
  it("should return all tillstypes", async () => {
      return request
          .get("/api/tillstypes")
          .expect('Content-Type', /json/)
          .expect(200)
          .then((res) => {
              expect(res.statusCode).toBe(200);
          })
  });
});
describe('Tills Controller', () => {
  it('debería crear un nuevo tipo de tills', async () => {
    const newType = { t_type_desc: faker.commerce.department() };
    const response = await request.post('/api/tillstypes').send(newType);
    expect(response.status).toBe(201);

    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería obtener un tipo de tills por ID', async () => {
    const typeId = faker.number.int({ min: 1, max: 10 });
    const response = await request.get(`/api/tillstypes/${typeId}`);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería actualizar un tipo de tills por ID', async () => {
    // const typeId = 10; // Reemplaza con un ID válido
    const typeId = faker.number.int({ min: 1, max: 10 });
    const updatedType = { t_type_desc: faker.commerce.department() };
    const response = await request.put(`/api/tillstypes/${typeId}`).send(updatedType);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });

  it('debería eliminar un tipo de tills por ID', async () => {
    // change typeId for a random number between 1 and 10
    const typeId = faker.number.int({ min: 1, max: 10 });

    // const typeId = 10; // Reemplaza con un ID válido
    const response = await request.delete(`/api/tillstypes/${typeId}`);
    expect(response.status).toBe(200);
    // Agrega más expectativas para validar los datos devueltos si es necesario
  });
});
