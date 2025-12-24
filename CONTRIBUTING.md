CONTRIBUTING

Thank you for contributing to App Survival Android Release Night.

Project goals

This project is a simulation game that models Android production trade offs. Contributions should prioritize clarity, teachability, and deterministic behavior over complexity.

Ground rules

1. Be respectful and professional.
2. Keep changes scoped. Small, reviewable pull requests are preferred.
3. Avoid adding heavy dependencies unless there is a strong reason.
4. Do not add or commit secrets. Do not include private keys, tokens, credentials, or personal data.

Development setup

1. Install Node.js 20 or newer.
2. Install dependencies:
npm install
3. Start the dev server:
npm run dev
4. Build:
npm run build
5. Preview build:
npm run preview

How to contribute

Issues

Use GitHub Issues for bug reports, feature requests, and balancing feedback.
Include reproduction steps and expected versus actual behavior.
If reporting a security concern, follow SECURITY.md.

Pull requests

Before submitting

1. Keep simulation engine changes in src or sim modules whenever possible.
2. Keep UI and rendering changes separate from simulation logic where feasible.
3. Ensure the app runs locally and the build succeeds.

PR checklist

1. Clear title and description of what changed and why.
2. Notes about gameplay impact and any balance changes.
3. If adding a new node or incident, include:
a. Node definition or incident definition
b. Rationale for effects and costs
c. Any new UI text kept short and neutral

Code style

TypeScript

Use clear names and small functions.
Prefer explicit types for exported functions and shared structures.
Avoid premature abstraction.

Simulation behavior

Prefer deterministic behavior when possible.
If randomness is used, keep it centralized so it can be seeded later.

Licensing

By contributing, you agree that your contributions are licensed under the Apache License 2.0, the same as this repository.

No guarantee of support

This is an open source project maintained on a best effort basis. Issues and pull requests may not receive immediate responses.

Thank you

Thanks for helping improve the project.
