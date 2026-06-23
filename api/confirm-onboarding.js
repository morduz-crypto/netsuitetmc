export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Endpoint activo'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  const { email, source, confirmedAt } = req.body || {};

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'El correo es obligatorio'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Correo recibido correctamente',
    data: {
      email,
      source,
      confirmedAt,
      receivedAt: new Date().toISOString()
    }
  });
}
