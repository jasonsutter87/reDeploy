# reDeploy

One-click deployment trigger for multiple repositories.

## What it does

reDeploy lets you trigger empty commits across all your connected repositories with a single click. This causes CI/CD pipelines (Netlify, Vercel, GitHub Actions, etc.) to rebuild without changing any code.

## Use Cases

- **Headless CMS updates** - Content changed, rebuild all consuming sites
- **Shared dependency updates** - New package version, rebuild downstream projects
- **Cache busting** - Force fresh builds across your infrastructure
- **Scheduled rebuilds** - Keep static sites fresh

## Tech Stack

- Hugo + TailwindCSS (frontend)
- Node.js serverless functions (backend)
- GitHub OAuth + Google OAuth + Email/Password (auth)

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
npm run test:watch
```

See [ROADMAP.md](./ROADMAP.md) for the full development plan.
