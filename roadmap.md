# Roadmap

- [x] Clone smart-subscription-hub repo into the project
- [x] Fix corrupted vite.config.ts (dashboard text pasted into the file)
- [x] Signup saves the email and signs in immediately (no confirmation email)
  - [x] Server-side account creation with email pre-confirmed (needs SUPABASE_SERVICE_ROLE_KEY)
  - [x] Auto-confirm + retry for older accounts stuck on "Email not confirmed"
  - [x] Arabic error messages (weak/leaked password, wrong credentials, email already used)
- [ ] Owner action: turn off "Confirm email" in the auth settings, or add SUPABASE_SERVICE_ROLE_KEY to the Cloudflare Worker variables
