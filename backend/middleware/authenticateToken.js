const jwt = require('jsonwebtoken');
const context = require('../utils/context');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: "Access token missing" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    
    // Attach the verified user payload to the request object
    req.user = user; 
    
    // Run all downstream operations (including DB calls) inside user/tenant scope context
    context.run({ userId: user.id, scopes: user.scopes || [] }, () => {
      next();
    });
  });
}

module.exports = authenticateToken;
