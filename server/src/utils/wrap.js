// Forward async errors to Express (Express 4 doesn't do this itself).
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
