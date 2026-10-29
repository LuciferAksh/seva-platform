# Free deployment

- `supabase.sql`: new private schema, indexes, atomic revision-checked writes and private media bucket.
- Repository-root `render.yaml`: connected FastAPI API on Render Free.
- `render-demo.yaml`: optional browser-only demo on a Render Static Site.
- `frontend/wrangler.toml`: Cloudflare Pages frontend configuration.

Use `docs/free-stack-deployment.md` for setup and validation. The demo does not need a database or API. Do not delete old Google resources or migrate real records until a connected staging deployment has passed acceptance.
