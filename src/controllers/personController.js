import {prisma } from '../utilities/db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';
import path from 'path';

const getAllPersons = async(req,res)=>{
    try {
        const { page = 1, pageSize = 10, sortBy = 'person_id', sortOrder = 'asc' } = req.query;   
        var consult = {
            include:{
                persontype: {
                    select:{
                        p_type_desc:true
                    }
                }
            },
            where: {
                deletedAt:null,
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
    var photo = req.body.photo
    console.log('photo',photo)
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
        },
        include:{
            persontype: {
                select:{
                    p_type_desc:true
                }
            }
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
    const file = req.file;
    console.log('path',path)
    console.log('file',req)
    var to_update = {
        person_fname:req.body.person_fname,
        person_lname:req.body.person_lname,
        birthDate: date,
        person_idnumber: req.body.person_idnumber,
        p_type_id: req.body.p_type_id,
        person_photo: req.body.person_photo
    }
    if (file) {
        // req.body.photo = file.filename; // Guardar el nombre del archivo en req.body.photo
        console.log('aca hace algo')
        to_update.person_photo= file.filename
    }
        const type = await prisma.persons.update({
            where:{
                person_id:parseInt(req.params.id)
            },
            data: to_update
        })
    res.status(200).json({message:'Registro actualizado correctamente.',data:type})
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
                OR:[{
                    person_fname:{
                        contains: req.query.search,
                        mode: 'insensitive'
                        }
                    },
                    {
                    person_lname:{
                        contains: req.query.search,
                        mode: 'insensitive'
                        }
                    },
                    {
                    person_idnumber:{
                        contains: req.query.search,
                        mode: 'insensitive'
                        }
                    }
                ],
                deletedAt:null
            },
            include:{
                persontype: {
                    select:{
                        p_type_desc:true
                    }
                }
            }
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