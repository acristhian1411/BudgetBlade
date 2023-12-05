import { Prisma } from '@prisma/client';

const softDelete = async (model, where) => {
  const updateData = {
    deletedAt: new Date(),
  };

  return await model.updateMany({
    where,
    data: updateData,
  });
};

export default softDelete;
