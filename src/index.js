import express from "express";
import cors from "cors";
import {handler} from '../svelteUI/build/handler.js'
import swaggerJSDoc  from 'swagger-jsdoc'
import SwaggerUI from 'swagger-ui-express'
import listEndpoints from "express-list-endpoints";
// routes
import tilltypesroutes from './routes/tilltypesroutes.js'
import persontypesroutes from './routes/persontypesroutes.js'
import tillsroutes from './routes/tillsroutes.js'
import personroutes from './routes/personsroutes.js'
import tillsdetailsroutes from './routes/tillsdetailsroutes.js'
import accountplansroutes from './routes/accountplansroutes.js'
import detailstransferroutes from './routes/detailstransferroutes.js'
import authroutes from './routes/authroutes.js'
import userroutes from './routes/userroutes.js'
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BudgetBlade',
    version: '1.0.0',
    description: 'API documentation for expenses registration API',
    contact: {
      name: 'Pepe Perez',
      url: "https://pepe.perez.com",
      email: 'pepeperez@gmail.com',
    },
  },
  servers: [
    {
    url: `http://${process.env.APP_URL}`,
    description: 'Development server',
    }
  ],
}

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
}
const swaggerSpec = swaggerJSDoc(options);
const app = express()
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3005161814.
const port = process.argv[3] || process.env.PORT 
app.use(cors({
  origin:'*'
}))
app.use(express.json())
app.use('/api/auth',authroutes)
app.use('/api',userroutes)
app.use('/api',tilltypesroutes)
app.use('/api',persontypesroutes)
app.use('/api',tillsroutes)
app.use('/api',personroutes)
app.use('/api',tillsdetailsroutes)
app.use('/api',accountplansroutes)
app.use('/api',detailstransferroutes)
app.use('/docs', 
SwaggerUI.serve, 
SwaggerUI.setup(swaggerSpec)
)
app.get('/docs.json', (req, res)  => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})
app.get('/api', (req, res) => {
    const routes = listEndpoints(app);
    res.json(routes);
  });
  app.use(handler);
  app.listen(port,()=>{
    console.log('server on port', port)
})

export default app