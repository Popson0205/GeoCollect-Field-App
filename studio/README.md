# Studio Portal Management UI — Addition Guide

Add these files to your existing `studio/src/app/` directory:

## New pages to add

```
studio/src/app/
└── portal/
    ├── page.tsx                 → Redirect to /portal/api-keys
    ├── api-keys/
    │   └── page.tsx             → API key management table + create modal
    ├── webhooks/
    │   └── page.tsx             → Webhook list + create/edit form + delivery log
    └── scheduled-exports/
        └── page.tsx             → Scheduled export list + create form
```

## Navigation addition

In your Studio sidebar/nav component, add a "Portal" nav item pointing to `/portal/api-keys`.

## API calls

All Studio portal pages use the same `api` client pattern already in Studio.
Import from `@/lib/api` — the portal routes are already on the same Fastify server at port 3001.
