# Security Policy

## Project Overview

CareerLens AI is a full-stack AI-powered career intelligence and resume optimization platform.

The project implements application-level and repository-level security controls to protect authentication, user information, administrative functionality and sensitive configuration.

---

## Supported Versions

Security maintenance targets the current main branch and latest deployed application version.

| Version | Security Support |
|---|---|
| Current main branch | Supported |
| Latest deployed version | Supported |
| Historical commits | Not actively maintained |

---

## Reporting a Vulnerability

If you identify a potential security vulnerability, please report it responsibly.

Use the repository's private vulnerability reporting feature when available:

[Report a Security Vulnerability](https://github.com/Anshu2607/AI-Resume-Analyzer/security/advisories)

If private vulnerability reporting is unavailable, contact the repository maintainer through a private communication channel before sharing technical details.

Do not publicly disclose security vulnerabilities before they have been reviewed and a reasonable opportunity for remediation has been provided.

### Information to Include

A vulnerability report should contain:

- A concise description of the vulnerability.
- The affected application component.
- Steps required to reproduce the issue using test data.
- Potential security impact.
- Relevant non-sensitive screenshots or logs.
- Suggested mitigation, if available.

### Information Not to Include

Never include:

- Real passwords.
- API keys.
- JWT authentication tokens.
- MongoDB credentials.
- Redis passwords.
- MFA encryption keys.
- Private resumes.
- Personally identifiable information.
- Production user records.

---

## Responsible Security Testing

Security researchers should:

- Use authorized accounts and test data.
- Avoid accessing other users' information.
- Avoid modifying production records.
- Avoid disruptive requests or denial-of-service testing.
- Avoid publishing exploit details prematurely.
- Report vulnerabilities through private channels.

---

## Application Security

CareerLens AI implements the following security controls:

- Password hashing.
- JWT-based authentication.
- Role-based access control.
- Administrator multi-factor authentication.
- Encrypted MFA secret storage.
- Protected administrative routes.
- Account suspension controls.
- Session invalidation.
- Token revocation.
- Distributed rate limiting.
- Input validation.
- CORS configuration.
- Security headers.
- AI usage quotas.
- Administrative audit logging.
- Production environment validation.

These controls reduce security risks but do not guarantee the complete absence of vulnerabilities.

---

## Repository Security

The repository uses security practices including:

- Git-ignored private environment files.
- Sanitized environment templates.
- GitHub Secret Scanning.
- Dependabot vulnerability alerts.
- Automated GitHub Actions workflows.
- Reviewed dependency updates.
- Credential rotation when required.
- Git history remediation when necessary.

Push protection, CodeQL and additional security scanning should be enabled where available.

---

## Credential Management

All sensitive credentials must be stored privately.

### Local Development

Use private environment files excluded from Git.

### Production Deployment

Use backend hosting environment variables for production credentials.

Never place sensitive backend credentials in public frontend environment variables.

### Public Repository

Environment templates must contain placeholders rather than actual credential values.

### Credential Exposure Response

If a credential is accidentally exposed:

1. Revoke or rotate it immediately.
2. Update affected application environments.
3. Review repository history.
4. Remove exposed values from tracked files.
5. Rewrite affected history when appropriate.
6. Review security alerts and access logs.
7. Verify application functionality using replacement credentials.

Removing a credential from Git does not invalidate the credential itself.

Git history rewriting does not guarantee removal from existing clones, forks or cached commits.

MFA encryption key rotation requires careful migration or secure administrator re-enrollment.

---

## Dependency Security

Dependencies should be regularly reviewed for known vulnerabilities.

Security updates should be evaluated and tested before deployment.

GitHub Dependabot alerts, CI checks and code scanning findings should be reviewed where available.

---

## Deployment Security

CareerLens AI currently uses:

- Vercel frontend hosting.
- Render backend hosting.
- Render Key Value.
- MongoDB Atlas.
- External AI providers.

The public deployment uses free-tier infrastructure.

Service availability, resource limitations, ephemeral file storage and Redis state loss can affect reliability and security-sensitive operations.

Additional production hardening is recommended before using the application for sensitive, commercial or business-critical workloads.

See [README.md](README.md) for documented limitations and proposed improvements.

---

## Security Maintenance

Security maintenance includes reviewing:

- Secret scanning alerts.
- Push protection settings.
- Dependency vulnerabilities.
- Authentication controls.
- Administrator access restrictions.
- Security-related application logs.
- Automated testing results.
- Available code scanning findings.
- Cloud environment configuration.

Security findings should be investigated before being dismissed or marked as resolved.

---

## Disclaimer

CareerLens AI is an educational and portfolio project.

The implemented security controls are intended to reduce common application security risks but are not equivalent to an independent penetration test, compliance certification or enterprise security guarantee.