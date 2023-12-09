import {prisma } from '../db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';


const getAllPersons = async(req,res)=>{
    try {
        const { page = 1, pageSize = 10, sortBy = 'person_id', sortOrder = 'asc' } = req.query;    
        var consult = {
            where: {
                deletedAt:null,
            },
            include:{
                persontype:{
                    select:{
                        p_type_desc:true
                    }
                }
            }
        }    
        const paginatedData = await paginateAndSortResults(consult,prisma.persons,  Number(page), Number(pageSize), sortBy, sortOrder);
        // const paginatedData = paginateAndSortResults(tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        console.log('error',error)
        res.status(500).json({ error: 'No se pudieron obtener registros.' });
    }
}
const createPersons = async (req,res)=>{
    const date = new Date(req.body.birthDate)
    const type = await prisma.persons.create({
        data:{
            person_fname:req.body.person_fname,
            person_lname:req.body.person_lname,
            birthDate: date,
            person_idnumber: req.body.person_idnumber,
            p_type_id: parseInt(req.body.p_type_id)
        }
    })
    res.json(type)
}

const showPersons = async (req,res)=>{
    const type = await prisma.persons.findFirst({
        where:{
            person_id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}

const personTypesList = async(req,res)=>{
    try {
        const { page = 1, pageSize = 10, sortBy = 'person_id', sortOrder = 'asc' } = req.query;    
        var consult = {
            where: {
                p_type_id:parseInt(req.params.id),
                deletedAt:null,
            },
            include:{
                persontype:{
                    select:{
                        p_type_desc:true
                    }
                }
            }
        }    
        const paginatedData = await paginateAndSortResults(consult,prisma.persons,  Number(page), Number(pageSize), sortBy, sortOrder);
        // const paginatedData = paginateAndSortResults(tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        console.log('error',error)
        res.status(500).json({ error: 'No se pudieron obtener registros.' });
    }
}
const updatePersons = async (req,res)=>{
    const date = new Date(req.body.birthDate)
    req.body.birthDate = date
    req.body.p_type_id = parseInt(req.body.p_type_id)
    const type = await prisma.persons.update({
        where:{
            person_id:parseInt(req.params.id)
        },
        data: req.body
        
    })
    res.json(type)
}

const deletePersons = async (req,res)=>{
    try {
        const typeId = parseInt(req.params.id);
        await softDelete(prisma.persons, { person_id: typeId });
        res.json({ message: 'Registro eliminado correctamente.' });
      } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
      }
}

const searchPersons = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'person_id', sortOrder = 'asc' } = req.query;        
        const persons = {
        where: {
            person_fname:{
            contains: req.query.person_fname
            },
            deletedAt:null
        },
        }
        const paginatedData = await paginateAndSortResults(persons, prisma.persons, Number(page), Number(pageSize),sortBy, sortOrder);
        res.json(paginatedData);
    } catch (error) {
        console.log('para mostrar error',error)
        res.status(500).json({ error: 'No se pudieron obtener los tipos de tills.' });
    }
  };


export {
    getAllPersons,
    createPersons,
    updatePersons,
    deletePersons,
    showPersons,
    searchPersons,
    personTypesList
  };