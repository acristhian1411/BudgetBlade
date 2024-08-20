import supertest from 'supertest';
import app from '../src/aux_index'; // Reemplaza 'tu_app' con el nombre de tu aplicación Express
import jsonwebtoken from 'jsonwebtoken'
import {faker} from '@faker-js/faker'
import {prisma} from '../src/utilities/db.js'
import { after } from 'node:test';
const request = supertest(app);


describe("GET /api/tillstypes", () => {

  let token;

  beforeAll(() => {
    // Generar un token válido para las pruebas
    token = jsonwebtoken.sign({ userId: 1 }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  });


  afterAll(() => {
    // Eliminar todos los registros creados en la base de datos
    prisma.tillsTypes.deleteMany({});
  });

  it('debe devolver 401 cuando no hay token', async () => {
    return request
      .get("/api/tillstypes")
      .expect('Content-Type', /json/)
      .expect(401)
      .then((res) => {
        expect(res.statusCode).toBe(401);
      })
  });

  it("Debe retornar todos los tipos de cajas", async () => {
      return request
          .get("/api/tillstypes")
          .set('authorization', `token: ${token}`)
          .expect('Content-Type', /json/)
          .expect(200)
          .then((res) => {
              expect(res.statusCode).toBe(200);
              expect(res.body.results.length).toBeGreaterThan(0);
          })
  });

  it('debería crear un nuevo tipo de tills', async () => {
    let fakeType = faker.commerce.department();
    return request.post('/api/tillstypes')
    .send({ t_type_desc: fakeType })
    .set('authorization', `token: ${token}`)
    .expect('Content-Type', /json/)
    .expect(201)
    .then((res) => {
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Registro creado correctamente');
      expect(res.body.data.t_type_desc).toBe(fakeType);
    })
  });
  
  it('debería obtener un tipo de tills por ID', async () => {
    return request.get(`/api/tillstypes/${438}`)
    .set('authorization', `token: ${token}`)
    .expect('Content-Type', /json/)
    .expect(200)
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.t_type_desc).toBe('Movies');
    })
  });

  it('debería actualizar un tipo de tills por ID', async () => {
    let fakeType = faker.commerce.department();
    return request.put(`/api/tillstypes/${440}`)
    .send({ t_type_desc: fakeType })
    .set('authorization', `token: ${token}`)
    .expect('Content-Type', /json/)
    .expect(200)
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Registro actualizado correctamente.');
      expect(res.body.data.t_type_desc).toBe(fakeType);
    })
  });

  it('debería eliminar un tipo de tills por ID', async () => {    
    return request.delete(`/api/tillstypes/${443}`)
    .set('authorization', `token: ${token}`)
    .expect('Content-Type', /json/)
    .expect(200)
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Registro eliminado correctamente.');
    })
  });

});

