SECURITY

Security policy

This project is provided as is, without warranty of any kind. There are no guarantees of security, correctness, or fitness for any purpose.

Supported versions

This is a small open source project. Security fixes may be provided on a best effort basis. There is no guaranteed timeline for responses or patches.

Reporting a security issue

If you believe you found a security vulnerability, please do not disclose it publicly at first.

Report it using GitHub Issues in this repository.
Use a title that starts with Security and provide as much detail as you can to reproduce the issue.
If the report contains sensitive information, keep details minimal and ask for a private channel in the issue.

Do not include secrets

Do not include passwords, API keys, tokens, private URLs, or personal data in issues, pull requests, logs, screenshots, or test data.
If you accidentally committed a secret, assume it is compromised and rotate it immediately.

Coordinated disclosure

Please allow time for maintainers to review and respond before sharing details publicly.
If a fix is released, you may share details after the patch is available.

Automated security

CI runs a layered scan stack. Findings surface as GitHub alerts or failing checks; no manual schedule to track.

- Dependabot (.github/dependabot.yml): weekly grouped npm bumps (dev-toolchain, npm-security) and monthly grouped GitHub Actions bumps. Actions stay SHA-pinned; Dependabot rewrites the SHA and version comment.
- CodeQL (codeql.yml): static analysis of JavaScript/TypeScript and Actions on every push and PR, plus a weekly run.
- Dependency Review (dependency-review.yml): blocks any PR that introduces a vulnerable or disallowed dependency.
- Nightly scan (security-nightly.yml): OSV scanner plus npm audit (prod deps, high and above) nightly at 02:17 UTC and on PRs; opens or updates a PR when findings appear.
- Hardened runners: every workflow pins actions by SHA and runs step-security/harden-runner.

Thanks

Thank you for helping keep the project safer for everyone.
