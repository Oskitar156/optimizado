import jwt from 'jsonwebtoken'

export function autenticar(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function requerirAdmin(req, res, next) {
  if (req.user?.rol !== 'ADMINISTRADOR')
    return res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' })
  next()
}
