import {prisma } from '../utilities/db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';


const getAllPersonTypes = async(req,res)=>{
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
    const types = {
        where: { deletedAt: null }
    }
        const paginatedData = await paginateAndSortResults(types,prisma.personTypes,  Number(page), Number(pageSize), req.query.sortBy, req.query.sortOrder);
    res.json(paginatedData);
} catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener registros.' });
}
}
const createPersonType = async (req,res)=>{
    
    const type = await prisma.personTypes.create({
        data:{
            p_type_desc:req.body.p_type_desc
        }
    })
    res.json(type)
}

const showPersonType = async (req,res)=>{
    const type = await prisma.personTypes.findFirst({
        where:{
            id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}

const updatePersonType = async (req,res)=>{
    const type = await prisma.personTypes.update({
        where:{
            id:parseInt(req.params.id)
        },
        data:{
            p_type_desc:req.body.p_type_desc
        }
    })
    res.json(type)
}

const deletePersonType = async (req,res)=>{
    try {
        const typeId = parseInt(req.params.id);
        await softDelete(prisma.personTypes, { id: typeId });
        res.json({ message: 'Registro eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el registro' });
    }
}

const searchPersonTypes = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        const tillsTypes = {
        where: {
            p_type_desc:{
            contains: req.query.p_type_desc
            },
            deletedAt:null
        }
        }
        const paginatedData = await paginateAndSortResults(tillsTypes,prisma.personTypes, Number(page), Number(pageSize),sortBy, sortOrder);
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ error: 'No se pudieron obtener los tipos de tills.' });
    }
  };

export {
    getAllPersonTypes,
    createPersonType,
    updatePersonType,
    deletePersonType,
    showPersonType,
    searchPersonTypes
  };