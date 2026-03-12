const queryParser = (req, res, next) => {
  // 1. Filtering
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields", "q"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // Advanced filtering (e.g. price[gte]=500)
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(
    /\b(gte|gt|lte|lt|ne|in|nin)\b/g,
    (match) => `$${match}`,
  );

  req.mongoQuery = JSON.parse(queryStr);
  req.mongoOptions = {};

  // 2. Sorting (e.g. sort=-price,createdAt)
  if (req.query.sort) {
    req.mongoOptions.sort = req.query.sort.split(",").join(" ");
  } else {
    req.mongoOptions.sort = "-createdAt"; // Default sort by newest
  }

  // 3. Field Limiting (e.g. fields=name,price,-_id)
  if (req.query.fields) {
    req.mongoOptions.select = req.query.fields.split(",").join(" ");
  } else {
    req.mongoOptions.select = "-__v"; // Exclude __v by default
  }

  // 4. Pagination (e.g. page=2&limit=10)
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  req.mongoOptions.skip = skip;
  req.mongoOptions.limit = limit;
  req.mongoOptions.page = page;

  next();
};

module.exports = queryParser;
