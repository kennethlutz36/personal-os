# Personal OS

Static Personal OS frontend backed by Supabase.

## GitHub Pages

Automatic deployment is configured through GitHub Actions from the `main` branch.

## Security

- Contains only the Supabase publishable browser key.
- No database password or service-role key is stored here.
- Live data requires Supabase authentication and is protected by row-level security.
- Three Rivers and Primeva data are consumed through read-only integration layers.
