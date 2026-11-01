# Architecture decision 001 — Forge foundation

**Status:** Accepted  
**Date:** 2026-11-01

## Decision

Build RetailFlow as a native Atlassian Forge app, starting with a Jira issue panel using UI Kit.

## Why

- The issue panel places order assurance beside the Jira investigation workflow.
- UI Kit is the quickest supported starting point for a first Forge module.
- GitHub Actions provides the Forge CLI environment required by the iPad-only workflow.
- The initial demonstration can use synthetic data without external service credentials or paid infrastructure.

## First module

`jira:issuePanel` with a Forge resolver and a small, deterministic synthetic order fixture.

## First verification example

- Checkout estimate: USD 140.00
- Net illustrative fulfillment adjustment: USD -1.50
- Expected final total: USD 138.50
- Recorded captured charge: USD 147.00
- Unexplained variance: USD 8.50
- Settlement: not yet verified

The app must describe the variance as requiring evidence review. It must not call it a confirmed overcharge.

## Deferred

- Real retailer integrations (requires authorization and supported APIs).
- Real payment processor integration.
- Persistent order storage.
- Rovo agent and agent actions.
- Customer-facing explanations.
- Marketplace distribution.

## Security

No API tokens, customer personal data, or payment credentials belong in the repository. Scopes should be added only when a module actually needs them.
