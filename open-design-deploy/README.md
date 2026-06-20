# Open Design Local Deployment

This folder contains a local Docker Compose deployment for Open Design using the published runtime image from `ghcr.io/nexu-io/od:latest`.

## Commands

```powershell
cd .\deploy
docker compose pull
docker compose up -d --no-build
```

Open:

```text
http://127.0.0.1:7456
```
