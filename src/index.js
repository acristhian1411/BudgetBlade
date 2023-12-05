import express from "express";
import tilltypesroutes from './routes/tilltypesroutes.js'
import persontypesroutes from './routes/persontypesroutes.js'
import tillsroutes from './routes/tillsroutes.js'
const app = express()
const port = process.env.PORT 
app.use(express.json())
app.use('/api',tilltypesroutes)
app.use('/api',persontypesroutes)
app.use('/api',tillsroutes)
app.listen(port,()=>{
    console.log('server on port', port)
})

export default app