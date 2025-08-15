export default (req, res, next) => {
  req.user = { 
    _id: req.headers['x-user-id'] || '64d5f7a1c4b6a821b3a1e2f3'
  };
  next();
};