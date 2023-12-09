import {prisma } from '../utilities/db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';


const getAllTillsDetails = async(req,res)=>{
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        const types = {
            where: { deletedAt: null }
        }
        const paginatedData = await paginateAndSortResults(types,prisma.tillDetails,  Number(page), Number(pageSize), req.query.sortBy, req.query.sortOrder);
        // const paginatedData = paginateAndSortResults(tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ error: 'No se pudieron obtener registros.' });
    }
}
const createTillsDetails = async (req,res)=>{
    const till_det_date = new Date(req.body.till_det_date);
    const type = await prisma.tillDetails.create({
        data:{
            till_id:req.body.till_id,
            till_det_amount:req.body.till_det_amount,
            till_det_desc:req.body.till_det_desc,
            till_det_date:till_det_date,
            till_det_type:req.body.till_det_type,
            person_id: req.body.person_id,
        }
    })
    res.json(type)
}

const showTillsDetails = async (req,res)=>{
    const type = await prisma.tills.findFirst({
        where:{
            id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}

const updateTillsDetails = async (req,res)=>{
    req.body.till_det_date = new Date(req.body.till_det_date)
    const type = await prisma.tillDetails.update({
        where:{
            id:parseInt(req.params.id)
        },
        data: req.body
        
    })
    res.json(type)
}

const deleteTillsDetails = async (req,res)=>{
    try {
        const typeId = parseInt(req.params.id);
        await softDelete(prisma.tillDetails, { id: typeId });
        res.json({ message: 'Registro eliminado correctamente.' });
      } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
      }
}



export {
    getAllTillsDetails,
    createTillsDetails,
    updateTillsDetails,
    deleteTillsDetails,
    showTillsDetails,
  };