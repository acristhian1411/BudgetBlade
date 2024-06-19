import { prisma } from '../utilities/db.js';
import paginateAndSortResults from '../utilities/pagination.js';
import softDelete from '../utilities/softDelete.js';

const getAllDetailsTransfers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;
    
    const consult = {
      where: {
        deletedAt: null,
      },
    };

    const detailsTransfers = await prisma.detailsTransfer.findMany({
      where: { deletedAt: null },
    });

    const paginatedData = await paginateAndSortResults(
      req,
      consult,
      prisma.detailsTransfer,
      Number(page),
      Number(pageSize),
      req.query.sortBy,
      req.query.sortOrder
    );

    res.json(paginatedData);
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'No se pudieron obtener los detalles de transferencia.' });
  }
};

const createDetailsTransfer = async (req, res) => {
  try {
    const newDetailsTransfer = await prisma.detailsTransfer.create({
      data: {
        origin_till_id: req.body.origin_till_id,
        destiny_till_id: req.body.destiny_till_id,
        det_transfer_amount: req.body.det_transfer_amount,
        det_transfer_obs: req.body.det_transfer_obs,
        det_transfer_date: req.body.det_transfer_date,
      },
    });

    res.json(newDetailsTransfer);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear el detalle de transferencia.' });
  }
};

const showDetailsTransfer = async (req, res) => {
  try {
    const detailsTransfer = await prisma.detailsTransfer.findFirst({
      where: {
        id: parseInt(req.params.id),
        deletedAt: null,
      },
    });

    res.json(detailsTransfer);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo encontrar el detalle de transferencia solicitado.' });
  }
};

const updateDetailsTransfer = async (req, res) => {
  try {
    const updatedDetailsTransfer = await prisma.detailsTransfer.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: req.body,
    });

    res.json(updatedDetailsTransfer);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el detalle de transferencia.' });
  }
};

const deleteDetailsTransfer = async (req, res) => {
  try {
    const detailsTransferId = parseInt(req.params.id);
    await softDelete(prisma.detailsTransfer, { id: detailsTransferId });
    res.json({ message: 'Detalle de transferencia eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el detalle de transferencia.' });
  }
};

const searchDetailsTransfers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;

    const detailsTransfers = {
      where: {
        det_transfer_obs: {
          contains: req.query.det_transfer_obs,
        },
        deletedAt: null,
      },
    };

    const paginatedData = await paginateAndSortResults(
      req,
      detailsTransfers,
      prisma.detailsTransfer,
      Number(page),
      Number(pageSize),
      sortBy,
      sortOrder
    );

    res.json(paginatedData);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los detalles de transferencia.' });
  }
};

export {
  getAllDetailsTransfers,
  createDetailsTransfer,
  updateDetailsTransfer,
  deleteDetailsTransfer,
  showDetailsTransfer,
  searchDetailsTransfers,
};
