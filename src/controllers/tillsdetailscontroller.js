import {prisma } from '../utilities/db.js'
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';

/**
 * Obtiene todos los detalles de caja que no estén eliminados.
 *
 * @param {object} req - El objeto de solicitud.
 * @param {object} res - El objeto de respuesta.
 * @return {Promise<void>} - La función no devuelve nada.
 */
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
/**
 * Crea un nuevo registro de detalles de caja en la base de datos.
 *
 * @param {Object} req - El objeto de solicitud.
 * @param {Object} res - El objeto de respuesta.
 * @return {Promise<Object>} El registro de detalles de caja creado.
 */
const createTillsDetails = async (req,res)=>{
    const till_det_date = new Date(req.body.till_det_date);
    const type = await prisma.tillDetails.create({
        data:{
            till_id:req.body.till_id,
            account_p_id:req.body.account_p_id,
            till_det_amount:req.body.till_det_amount,
            till_det_desc:req.body.till_det_desc,
            till_det_date:till_det_date,
            till_det_type:req.body.till_det_type,
            person_id: req.body.person_id,
        }
    })
    res.json(type)
}
/**
 * Crea múltiples detalles de caja.
 *
 * @param {Object} req - El objeto de solicitud.
 * @param {Object} res - El objeto de respuesta.
 * @return {Promise} La promesa que contiene los detalles de caja creados.
 */
const createManyTillsDetails = async (req,res)=>{
    const till_det_date = new Date(req.body.till_det_date);
    const type = await prisma.tillDetails.createMany({
        data:req.body,
        skipDuplicates: true
    })
    res.json(type)
}
/**
+ * Recupera los datos de un detalle específico.
+ *
+ * @param {Object} req - El objeto de solicitud.
+ * @param {Object} res - El objeto de respuesta.
+ * @return {Promise} Una promesa que se resuelve a los detalles del cajón.
+ */
const showTillsDetails = async (req,res)=>{
    const type = await prisma.tills.findFirst({
        where:{
            id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}
/**
+ * Recupera los detalles pertenecientes a una caja específica.
+ *
+ * @param {Object} req - El objeto de solicitud.
+ * @param {Object} res - El objeto de respuesta.
+ * @return {Promise} Una promesa que se resuelve a los detalles del cajón.
+ */
const showTillsDetailsPerTills = async (req,res)=>{
    const type = await prisma.tills.findFirst({
        where:{
            till_id:parseInt(req.params.id),
            deletedAt:null
        }
    })
    res.json(type)
}
/**
 * Actualiza los detalles de la caja.
 *
 * @param {Object} req - El objeto de solicitud.
 * @param {Object} res - El objeto de respuesta.
 * @return {Promise<Object>} El tipo actualizado.
 */
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
/**
+ * Elimina los detalles del cajón con el ID especificado.
+ *
+ * @param {number} req.params.id - El ID de los detalles del cajón a eliminar.
+ * @param {Object} res - El objeto de respuesta.
+ * @return {Promise} Una promesa que se resuelve cuando los detalles del cajón son eliminados.
+ */
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
    createManyTillsDetails,    
    updateTillsDetails,
    deleteTillsDetails,
    showTillsDetails,
    showTillsDetailsPerTills
  };