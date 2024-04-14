const paginateAndSortResults = async (consult,model, page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc') => {
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


  return {
    results: paginatedData,
    currentPage: page,
    totalPages,
    totalResults: totalCount,
  };
};

export default paginateAndSortResults;


