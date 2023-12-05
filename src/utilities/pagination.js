const paginateAndSortResults = async (model, page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc') => {
  const totalCount = await model.count();
  const skip = (page - 1) * pageSize;

  const paginatedData = await model.findMany({
    orderBy: {
      [sortBy]: sortOrder,
    },
    take: pageSize,
    skip,
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
