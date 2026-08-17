# Lumen Hollow

A dusk-wood 2D platformer. Run, jump, and double-jump through mossy ruins. Light the lanterns. Reach the flag.

Play with **arrow keys** and **Space**. A / D / W are optional.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Global high scores (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. **Project Settings → API**: copy **Project URL** and the **anon public** key.
4. Put them in `.env` (local) and in Vercel **Environment Variables**:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Redeploy. The board says **Global** when the cloud is connected; otherwise it stays on this device.

The anon key is meant to be public. Row Level Security on the `scores` table allows read + insert only.

## Deploy on Vercel

1. Import [arcane-tl/lumenHollow](https://github.com/arcane-tl/lumenHollow).
2. Add the two env vars above.
3. Deploy. Share the Vercel URL.

## Controls

| Key | Action |
| --- | --- |
| ← → | Move |
| Space | Jump / double-jump |
| Esc | Pause |
| M | Mute |
