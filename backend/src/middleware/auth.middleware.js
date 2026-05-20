// backend/src/middleware/auth.middleware.js

export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};