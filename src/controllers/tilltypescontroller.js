
import {prisma } from '../db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';
/**
 * Obtiene todos los tipos de cajas.
 * @param {Object} req - Objeto de solicitud (request).
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna una lista paginada y ordenada de tipos de cajas.
 */
const getAllTillsTypes = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        const tillsTypes = await prisma.tillsTypes.findMany({
            where: { deletedAt: null }, 
          });
        const paginatedData = paginateAndSortResults(tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ error: 'No se pudieron obtener registros.' });
    }
  };


/**
 * Crea un nuevo tipo de caja.
 * @param {Object} req - Objeto de solicitud (request) con la descripción del tipo de caja.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el tipo de caja creado.
 */
const createTillsType = async (req,res)=>{
    const type = await prisma.tillsTypes.create({
        data:{
            t_type_desc:req.body.t_type_desc
        }
    })
    res.json(type)
}

/**
 * Muestra un tipo de caja específico.
 * @param {Object} req - Objeto de solicitud (request) con el ID del tipo de caja a mostrar.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el tipo de caja solicitado.
 */
const showTillsType = async (req,res)=>{
    const type = await prisma.tillsTypes.findFirst({
        where:{
            id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}


/**
 * Actualiza un tipo de caja existente.
 * @param {Object} req - Objeto de solicitud (request) con el ID del tipo de caja y la nueva descripción.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el tipo de caja actualizado.
 */
const updateTillsType = async (req,res)=>{
    const type = await prisma.tillsTypes.update({
        where:{
            id:parseInt(req.params.id)
        },
        data:{
            t_type_desc:req.body.t_type_desc
        }
    })
    res.json(type)
}

/**
 * Elimina un tipo de caja existente.
 * @param {Object} req - Objeto de solicitud (request) con el ID del tipo de caja a eliminar.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el tipo de caja eliminado.
 */
const deleteTillsType = async (req,res)=>{
    try {
        const typeId = parseInt(req.params.id);
        await softDelete(prisma.tillsTypes, { id: typeId });
        res.json({ message: 'Registro eliminado correctamente.' });
      } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
      }
}

/**
 * Busca tipos de cajas que coincidan con una descripción específica.
 * @param {Object} req - Objeto de solicitud (request) con la descripción a buscar.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna una lista paginada y ordenada de tipos de cajas que coinciden con la descripción.
 */
const searchTillsTypes = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        const tillsTypes = await prisma.tillsTypes.findMany({
        where: {
            t_type_desc:{
            contains: req.query.t_type_desc
            },
            deletedAt:null
        }
        });
        const paginatedData = paginateAndSortResults(tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ error: 'No se pudieron obtener los tipos de tills.' });
    }
  };

export {
    getAllTillsTypes,
    createTillsType,
    updateTillsType,
    deleteTillsType,
    showTillsType,
    searchTillsTypes,
  };