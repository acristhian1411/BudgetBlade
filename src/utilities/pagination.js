const paginateAndSortResults = (data, page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc') => {
    const sortedData = [...data].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      } else {
        return a[sortBy] < b[sortBy] ? 1 : -1;
      }
    });
  
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
  
    const paginatedData = {
      results: sortedData.slice(start, end),
      currentPage: page,
      totalPages: Math.ceil(sortedData.length / pageSize),
      totalResults: sortedData.length,
    };
  
    return paginatedData;
  };
  
  export default paginateAndSortResults;
  