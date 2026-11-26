# CareerLens AI — Production Deployment

## Pre-deployment Checklist

- [ ] Backend production build successful
- [ ] Frontend production build successful
- [ ] Automated tests passed
- [ ] Dependency security audits passed
- [ ] Docker images built successfully
- [ ] Container networking verified
- [ ] Persistent volumes verified
- [ ] Liveness and readiness endpoints operational

## Cloud Infrastructure

- [ ] Cloud hosting provider selected
- [ ] Cloud server provisioned
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Firewall configured
- [ ] Domain or public hostname configured
- [ ] HTTPS configured

## Production Security

- [ ] NODE_ENV set to production
- [ ] DEPLOYMENT_MODE set to cloud
- [ ] Strong JWT secret configured
- [ ] Redis authentication enabled
- [ ] MongoDB network access restricted
- [ ] AI API keys securely configured
- [ ] CORS restricted to production origins
- [ ] Trusted reverse proxy configured
- [ ] Backend and Redis ports not publicly exposed

## Production Verification

- [ ] Frontend publicly accessible
- [ ] Authentication operational
- [ ] Resume upload operational
- [ ] AI resume analysis operational
- [ ] Semantic search operational
- [ ] RAG conversations operational
- [ ] Job matching operational
- [ ] Career roadmap generation operational
- [ ] Agentic AI operational
- [ ] Interview preparation operational
- [ ] Background job processing operational

## GitHub Migration — After Deployment

- [ ] Obtain approval for remote file replacement
- [ ] Back up existing repository branch
- [ ] Remove outdated project files
- [ ] Push upgraded CareerLens AI
- [ ] Verify secrets are excluded
- [ ] Update README and live application URL
- [ ] Activate GitHub Actions CI
- [ ] Configure continuous delivery
- [ ] Verify automated deployment and rollback