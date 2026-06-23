export default function handler(req, res) {
  const { email } = req.body || {};

  return res.status(200).json({
    success: true,
    message: 'Correo recibido',
    email: email || null
  });
}
