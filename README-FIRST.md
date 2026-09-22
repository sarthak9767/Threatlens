# Threat Lens Prototype

Threat Lens Prototype analyzes suspicious email evidence through a FastAPI
backend, React dashboard, and Chrome Manifest V3 extension.

## New multi-email innovation

The extension can analyze 5 to 25 Gmail inbox rows in one request. The batch
report includes an overall risk summary and a separate evidence,
counterfactual-dependency, URL, IP, and consistency result for every email.

The original single open-email analysis is still available.

## Project structure

- `Backend/` - FastAPI analysis API
- `Frontend/` - React and Vite dashboard
- `Extension/` - Chrome Manifest V3 extension

The ZIP intentionally excludes `venv`, `node_modules`, `.env`, build output,
and macOS metadata. Install dependencies locally using the steps below.

## Start the backend on macOS

Open Terminal in the project folder and run:

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend health URL: `http://127.0.0.1:8000/health`

## Start the frontend

Open a second Terminal window and run:

```bash
cd Frontend
npm install
npm run dev
```

Dashboard URL: `http://localhost:5173/`

## Load the Chrome extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the project's `Extension` folder.
5. Keep the FastAPI backend running while using the extension.

## Analyze 5 or more Gmail emails

1. Open the Gmail inbox or another Gmail list view.
2. Select 5 to 25 emails using their checkboxes.
3. Open the Threat Lens Prototype extension.
4. Confirm that the selected count is shown.
5. Click **Analyze Selected Emails**.
6. Review the consolidated summary and the separate card for every email.
7. Use **Export JSON** to download the complete batch report.

## Prototype limitation

Gmail list rows expose the sender, subject, date, and visible message snippet.
The batch feature analyzes that visible evidence. For full headers and full body
evidence, use the existing single open-email mode or submit `.eml` content in
the dashboard.

## Deploy the backend on Render

The repository includes `render.yaml` with the backend deployment settings.

1. Push the latest project changes to GitHub.
2. In Render, create a new Blueprint and connect this repository.
3. Deploy the `threatlens-api` web service.
4. Verify `https://<your-render-service>.onrender.com/health` returns
   `{"status":"healthy"}`.

If you create the Render web service manually instead, use:

- Root Directory: `Backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`

## Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set the Root Directory to `Frontend`.
3. Add `VITE_API_BASE_URL` with the Render backend URL and no trailing slash.
4. Deploy and test a manual analysis and an `.eml` upload.

The frontend includes `vercel.json`, so Vercel uses `npm run build` and
publishes the Vite `dist` directory.

## Connect the unpacked Chrome extension

After the Render backend is live:

1. Replace `DEFAULT_BACKEND` in `Extension/service-worker.js` with the Render
   backend URL.
2. Replace `DASHBOARD_URL` in `Extension/popup/popup.js` with the Vercel URL.
3. Reload the unpacked extension from `chrome://extensions`.
