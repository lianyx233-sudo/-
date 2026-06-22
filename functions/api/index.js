const http = require('node:http');

const AI_API_URL =
  'https://aihubmix.com/v1/models/doubao/doubao-seedream-4-0-250828/predictions';
const DEFAULT_IMAGE_SIZE = '2K';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function requestPath(event) {
  return (
    event.path ||
    event.rawPath ||
    event.requestContext?.path ||
    event.requestContext?.http?.path ||
    ''
  );
}

function normalizeApiKey(apiKey) {
  return apiKey.trim().replace(/^<(.+)>$/, '$1');
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function collectImageUrls(value, key = '', urls = []) {
  if (!value) {
    return urls;
  }

  if (typeof value === 'string') {
    const lowerKey = key.toLowerCase();
    const isLikelyImageField = /(output|image|images|url|urls|data|result)/.test(lowerKey);
    const isDataImage = value.startsWith('data:image/');
    const isImageUrl = /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value);
    const isUrlImageField =
      /^https?:\/\//i.test(value) && isLikelyImageField && !/\/(models|predictions)\//i.test(value);

    if (isDataImage || isImageUrl || isUrlImageField) {
      urls.push(value);
    }

    return urls;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, key, urls));
    return urls;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => {
      collectImageUrls(childValue, childKey, urls);
    });
  }

  return urls;
}

async function requestJson(url, apiKey, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return data;
}

function predictionError(prediction) {
  const error = prediction?.error || prediction?.errors;
  if (!error) {
    return '';
  }

  return typeof error === 'string' ? error : JSON.stringify(error);
}

async function resolvePrediction(prediction, apiKey) {
  let current = prediction;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const error = predictionError(current);
    if (error) {
      throw new Error(error);
    }

    const imageUrls = Array.from(new Set(collectImageUrls(current)));
    if (imageUrls.length > 0) {
      return imageUrls[0];
    }

    const status = String(current?.status || '').toLowerCase();
    const pollingUrl = current?.urls?.get || current?.links?.self;
    if (!pollingUrl || ['failed', 'canceled', 'cancelled', 'error'].includes(status)) {
      break;
    }

    await delay(2000);
    current = await requestJson(pollingUrl, apiKey);
  }

  throw new Error('No image URL found in AI response');
}

async function callImageApi(prompt, _aspectRatio, referenceImage) {
  const apiKey = process.env.AIHUBMIX_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AIHUBMIX_API_KEY');
  }

  const input = {
    prompt,
    size: process.env.AIHUBMIX_IMAGE_SIZE || DEFAULT_IMAGE_SIZE,
    sequential_image_generation: 'disabled',
    stream: false,
    response_format: 'url',
    watermark: true,
  };

  if (referenceImage) {
    input.image = referenceImage;
  }

  const normalizedApiKey = normalizeApiKey(apiKey);
  const prediction = await requestJson(AI_API_URL, normalizedApiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  return resolvePrediction(prediction, normalizedApiKey);
}

async function generateImages(prompt, mode, referenceImage) {
  if (mode === 'main') {
    const image = await callImageApi(
      `A professional industrial design render: ${prompt}`,
      '4:3',
    );
    return [image];
  }

  const prompts = [
    `Front view, solid white background, flat lighting, professional industrial design: ${prompt}`,
    `Side view, solid white background, flat lighting, professional industrial design: ${prompt}`,
    `Back view, solid white background, flat lighting, professional industrial design: ${prompt}`,
  ];

  const images = [];
  for (const orthoPrompt of prompts) {
    images.push(await callImageApi(orthoPrompt, '1:1', referenceImage));
  }
  return images;
}

async function handleRoute(path, body) {
  if (body.action === 'generate-ip' || path.endsWith('/generate-ip')) {
    if (!body.prompt) {
      return json(400, { error: 'Prompt is required' });
    }

    const image = await callImageApi(body.prompt, '1:1');
    return json(200, { imageUrls: [image] });
  }

  if (
    body.action === 'generate-image' ||
    path.endsWith('/generate-image') ||
    path.endsWith('/api')
  ) {
    const { prompt, mode = 'main', referenceImage } = body;
    if (!prompt) {
      return json(400, { error: 'Prompt is required' });
    }

    if (mode !== 'main' && mode !== 'ortho') {
      return json(400, { error: 'Invalid mode' });
    }

    const imageUrls = await generateImages(prompt, mode, referenceImage);
    return json(200, { imageUrls });
  }

  return json(404, { error: 'Not found' });
}

exports.main = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || 'POST';
  if (method === 'OPTIONS') {
    return json(204, {});
  }

  try {
    return await handleRoute(requestPath(event), parseBody(event));
  } catch (error) {
    console.error('api function error:', error);
    return json(500, { error: error.message || 'Internal error' });
  }
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 9000);
  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      const response = json(204, {});
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
      return;
    }

    try {
      const body = await readBody(req);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const response = await handleRoute(url.pathname, body);
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    } catch (error) {
      console.error('api web function error:', error);
      const response = json(500, { error: error.message || 'Internal error' });
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`api web function listening on ${port}`);
  });
}
