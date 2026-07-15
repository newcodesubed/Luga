/**
 * Express middleware to enforce a required custom scope.
 * Expects req.user to have a `scopes` array.
 * 
 * @param {string} requiredScope - The scope required for this endpoint (e.g. 'clothing:write')
 */
const requireScope = (requiredScope) => (req, res, next) => {
  const userScopes = req.user?.scopes || [];
  
  if (!userScopes.includes(requiredScope)) {
    return res.status(403).json({
      status: 'fail',
      message: `Forbidden: Access requires '${requiredScope}' scope.`,
    });
  }
  
  next();
};

module.exports = requireScope;
