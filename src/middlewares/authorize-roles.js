function authorizeRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ success: false, error: 'No autorizado para esta acción' });
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
