import crypto from 'crypto';

function encode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuthHeader(method, url) {
  const accountId = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenId,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_version: '1.0'
  };

  const urlObj = new URL(url);

  const allParams = { ...oauthParams };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  const paramString = Object.keys(allParams)
    .sort()
    .map(key => `${encode(key)}=${encode(allParams[key])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encode(`${urlObj.origin}${urlObj.pathname}`),
    encode(paramString)
  ].join('&');

  const signingKey = `${encode(consumerSecret)}&${encode(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(baseString)
    .digest('base64');

  return 'OAuth ' + [
    `realm="${encode(accountId)}"`,
    `oauth_consumer_key="${encode(consumerKey)}"`,
    `oauth_token="${encode(tokenId)}"`,
    `oauth_nonce="${encode(oauthParams.oauth_nonce)}"`,
    `oauth_timestamp="${encode(oauthParams.oauth_timestamp)}"`,
    `oauth_signature_method="HMAC-SHA256"`,
    `oauth_version="1.0"`,
    `oauth_signature="${encode(signature)}"`
  ].join(', ');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://morduz-crypto.github.io');
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

  try {
    const { email, source } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo es obligatorio'
      });
    }

    const restletUrl = process.env.NETSUITE_RESTLET_URL;

    const nsResponse = await fetch(restletUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildOAuthHeader('POST', restletUrl)
      },
      body: JSON.stringify({
        email,
        source: source || 'Confirmación onboarding GitHub'
      })
    });

    const text = await nsResponse.text();

    let nsData;
    try {
      nsData = JSON.parse(text);
    } catch (_) {
      nsData = { raw: text };
    }

    if (!nsResponse.ok || nsData.success === false) {
      return res.status(500).json({
        success: false,
        message: 'NetSuite rechazó la solicitud',
        netsuite: nsData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Onboarding registrado en NetSuite',
      netsuite: nsData
    });

  } catch (error) {
    console.error('Error confirmando onboarding:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno'
    });
  }
}
