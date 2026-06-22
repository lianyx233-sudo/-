import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const AI_API_URL =
  'https://aihubmix.com/v1/models/doubao/doubao-seedream-4-0-250828/predictions';
const DEFAULT_IMAGE_SIZE = '2K';

type GenerateMode = 'main' | 'ortho';

function normalizeApiKey(apiKey: string) {
  return apiKey.trim().replace(/^<(.+)>$/, '$1');
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function collectImageUrls(value: any, key = '', urls: string[] = []) {
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

async function requestJson(url: string, apiKey: string, init: RequestInit = {}) {
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

function predictionError(prediction: any) {
  const error = prediction?.error || prediction?.errors;
  if (!error) {
    return '';
  }

  return typeof error === 'string' ? error : JSON.stringify(error);
}

async function resolvePrediction(prediction: any, apiKey: string) {
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

async function callImageApi(prompt: string, _aspectRatio: string, referenceImage?: string) {
  const apiKey = process.env.AIHUBMIX_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AIHUBMIX_API_KEY');
  }

  const input: Record<string, any> = {
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

async function generateImages(prompt: string, mode: GenerateMode, referenceImage?: string) {
  if (mode === 'main') {
    const url = await callImageApi(`A professional industrial design render: ${prompt}`, '4:3');
    return [url];
  }

  const prompts = [
    `Front view, solid white background, flat lighting, professional industrial design: ${prompt}`,
    `Side view, solid white background, flat lighting, professional industrial design: ${prompt}`,
    `Back view, solid white background, flat lighting, professional industrial design: ${prompt}`,
  ];

  const urls: string[] = [];
  for (const orthoPrompt of prompts) {
    urls.push(await callImageApi(orthoPrompt, '1:1', referenceImage));
  }

  return urls;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt, mode = 'main', referenceImage } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (mode !== 'main' && mode !== 'ortho') {
        return res.status(400).json({ error: 'Invalid mode' });
      }

      const imageUrls = await generateImages(prompt, mode, referenceImage);
      res.json({ imageUrls });
    } catch (error: any) {
      console.error('Error generating image:', error);
      res.status(500).json({ error: error.message || 'Failed to generate image' });
    }
  });

  app.post('/api/generate-ip', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const imageUrl = await callImageApi(prompt, '1:1');
      res.json({ imageUrls: [imageUrl] });
    } catch (error: any) {
      console.error('Error generating IP image:', error);
      res.status(500).json({ error: error.message || 'Failed to generate IP image' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
