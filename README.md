# Seamless AI Tileset Lab

Browser-only (https://danielsobrado.github.io/Seamless-AI-Tileset-Lab/) tileset pipeline for uploading an atlas, running canvas-based cleanup/classification/repair/export nodes, and downloading generated artifacts.

## Run locally

```powershell
npm install
npm run dev
```

Open the served URL, select `Raw Atlas Input`, upload an image, then run connected nodes in graph order.

## Production build

```powershell
npm run build
npm run serve
```

The production build writes `dist/index.html` and `dist/app.js`. Runtime execution remains fully browser-based; Node is only used to compile JSX before serving.
