
import {prisma } from '../utilities/db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';
/**
 * Obtiene todos los tipos de cajas.
 * @param {Object} req - Objeto de solicitud (request).
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna una lista paginada y ordenada de tipos de cajas.
 */
const getAllAccountPlans = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        
        var consult = {
            where: {
                deletedAt:null,
            }
        }
        const tillsTypes = await prisma.accountPlan.findMany({
            where: { deletedAt: null }, 
        });
        const paginatedData = await paginateAndSortResults(consult, prisma.accountPlan, Number(page), Number(pageSize), req.query.sortBy, req.query.sortOrder);
        res.status(200).json(paginatedData);;
    } catch (error) {
        console.log('para mostrar error',error)
        res.status(500).json({ error: 'No se pudieron obtener registros.' });
    }
  };


/**
 * Crea un nuevo plan de cuenta.
 * @param {Object} req - Objeto de solicitud (request) con la descripción del plan de cuenta.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el plan de cuenta creado.
 */
const createAccountPlans = async (req,res)=>{
    const type = await prisma.accountPlan.create({
        data:{
            account_desc:req.body.account_desc,
            account_code:req.body.account_code,
            account_pid:req.body.account_pid
        }
    })
    res.status(201).json({message:'Registro creado correctamente',data:type})
}

/**
 * Muestra un plan de cuenta específico.
 * @param {Object} req - Objeto de solicitud (request) con el ID del plan de cuenta a mostrar.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el plan de cuenta solicitado.
 */
const showAccountPlans = async (req,res)=>{
    const type = await prisma.accountPlan.findFirst({
        where:{
            id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.status(200).json(type)
}


/**
 * Actualiza un plan de cuenta existente.
 * @param {Object} req - Objeto de solicitud (request) con el ID del plan de cuenta y la nueva descripción.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el plan de cuenta actualizado.
 */
const updateAccountPlans = async (req,res)=>{
    const type = await prisma.accountPlan.update({
        where:{
            id:parseInt(req.params.id)
        },
        data: req.body
    })
    res.status(200).json({message:'Registro actualizado correctamente.',data:type})
}

/**
 * Elimina un plan de cuenta existente.
 * @param {Object} req - Objeto de solicitud (request) con el ID del plan de cuenta a eliminar.
 * @param {Object} res - Objeto de respuesta (response).
 * @returns {Promise<void>} - Retorna el plan de cuenta eliminado.
 */
const deleteAccountPlans = async (req,res)=>{
    try {
        const typeId = parseInt(req.params.id);
        await softDelete(prisma.accountPlan, { id: typeId });
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
const searchAccountPlans = async (req, res) => {
    try {
        const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;        

        const tillsTypes = {
        where: {
            account_desc:{
            contains: req.query.account_desc,
            mode: 'insensitive'
            },
            deletedAt:null
        }
        }
        const paginatedData = await paginateAndSortResults(tillsTypes,prisma.accountPlan, Number(page), Number(pageSize),sortBy, sortOrder);

        // const paginatedData = paginateAndSortResults(tillsTypes, Number(page), Number(pageSize), sortBy, sortOrder);        
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ error: 'No se pudieron obtener los tipos de tills.' });
    }
  };

export {
    getAllAccountPlans,
    createAccountPlans,
    updateAccountPlans,
    deleteAccountPlans,
    showAccountPlans,
    searchAccountPlans,
  };