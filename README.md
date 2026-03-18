# Clarity Auto (Netlify + OpenAI + Resend)

This build removes Formspree and posts your form directly to a Netlify Function.

## Add these environment variables in Netlify
- OPENAI_API_KEY
- OPENAI_MODEL (optional)
- RESEND_API_KEY
- RESEND_FROM
- OWNER_EMAIL (optional)

## Files
- index.html
- netlify/functions/submit-case.js
- netlify.toml
- package.json

## Notes
- Deploy this as a real Netlify project (preferably from a Git repo).
- RESEND_FROM must use a verified sending domain.
