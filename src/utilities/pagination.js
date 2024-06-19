const paginateAndSortResults = async (req,consult,model, page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc') => {
  const skip = (page - 1) * pageSize;

  const paginatedData = await model.findMany({
    ...consult,
    orderBy: {
      [sortBy]: sortOrder,
    },
    take: pageSize,
    skip,
  });
  var cons
  cons = {
    where:{
      ...consult.where
    }
  }
  const totalCount = await model.count({
    ...cons,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  // Construir los enlaces a las páginas previa y siguiente
  const prevPageLink = hasPrevPage ? `${baseUrl}?page=${page - 1}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}` : null;
  const nextPageLink = hasNextPage ? `${baseUrl}?page=${page + 1}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}` : null;


  return {
    results: paginatedData,
    currentPage: page,
    totalPages,
    totalResults: totalCount,
    prevPageLink,
    nextPageLink,
  };
};

export default paginateAndSortResults;


