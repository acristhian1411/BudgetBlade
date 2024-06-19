import {prisma } from '../utilities/db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';


const getAllTills = async(req,res)=>{
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        const types = {
            where: { deletedAt: null },
            select:{
                id:true,
                TILL_NAME:true,
                TILL_ACCOUNT_NUMBER:true,
                t_type_id:true,
                person_id:true,
                person:{
                    select:{
                        person_idnumber:true,
                        person_fname:true,
                        person_lname:true
                    }
                },
                tilltype:{
                    select:{
                        t_type_desc:true
                    }
                },
                TillDetails:{
                    select:{
                        till_det_amount:true
                    }
                }
            }
        }
        const paginatedData = await paginateAndSortResults(req,types,prisma.tills,  Number(page), Number(pageSize), req.query.sortBy, req.query.sortOrder);
        // const paginatedData = paginateAndSortResults(req,tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'No se pudieron obtener registros.' });
    }
}
const createTills = async (req, res) => {
    try {
        const type = await prisma.tills.create({
            data: {
                TILL_NAME: req.body.TILL_NAME,
                TILL_ACCOUNT_NUMBER: req.body.TILL_ACCOUNT_NUMBER,
                person_id: req.body.person_id,
                t_type_id: req.body.t_type_id
            }
        });
        res.json(type);
    } catch (error) {
        console.error("Error al crear el registro de tills:", error);
        res.status(500).json({ error: error });
    }
}


const showTills = async (req,res)=>{
    const type = await prisma.tills.findFirst({
        where:{
            id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}

const updateTills = async (req,res)=>{
    const type = await prisma.tills.update({
        where:{
            id:parseInt(req.params.id)
        },
        data: req.body
        
    })
    res.json(type)
}

const deleteTills = async (req,res)=>{
    try {
        const typeId = parseInt(req.params.id);
        await softDelete(prisma.tills, { id: typeId });
        res.json({ message: 'Registro eliminado correctamente.' });
      } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
      }
}

const searchTills = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        const tills = {
        where: {
            TILL_NAME:{
            contains: req.query.TILL_NAME,
            mode: 'insensitive'
            },
            deletedAt:null
        },
        include:{person:{
            select:{
                person_idnumber:true,
                person_fname:true,
                person_lname:true
            }
        }}
        }
        const paginatedData = await paginateAndSortResults(req,tills,prisma.tills, Number(page), Number(pageSize),sortBy, sortOrder);
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ error: 'No se pudieron obtener los tipos de tills.' });
    }
  };


export {
    getAllTills,
    createTills,
    updateTills,
    deleteTills,
    showTills,
    searchTills
  };