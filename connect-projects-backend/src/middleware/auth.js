import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session is invalid or expired. Please sign in again.' });
  }
}
export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    next();
  };
}
