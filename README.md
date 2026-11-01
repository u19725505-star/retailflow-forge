# RetailFlow

**Grocery Order, Fulfillment & Payment Assurance**

> One order. One complete story. Every dollar explained.

RetailFlow is an Atlassian Forge application concept for grocery retailers. It is designed to help operations teams verify the journey from checkout through fulfillment, order adjustments, final payment, and settlement—and explain legitimate changes clearly.

The initial build will use synthetic grocery transactions and authorized Atlassian integrations. RetailFlow does not claim access to any retailer's private systems.

## The problem

A grocery order's final amount can legitimately differ from its checkout estimate. Weighted products, substitutions, unavailable items, discounts, taxes, and other adjustments can all affect the total. Without a clear record of those changes, staff may struggle to distinguish expected adjustments from genuine discrepancies, and customers may struggle to understand what they were charged.

RetailFlow aims to make each step traceable and each amount explainable.

## Planned capabilities

- **Order journey timeline** — Follow an order from checkout through fulfillment and payment.
- **Fulfillment adjustment tracking** — Record weighted items, substitutions, unavailable products, and discounts.
- **Payment reconciliation** — Compare the checkout estimate, final order amount, payment charge, and settlement evidence.
- **Exception intelligence** — Flag unexplained differences for review without treating every total change as an error.
- **Jira investigation workflow** — Create and track operational cases with supporting evidence.
- **Customer explanations** — Translate verified order adjustments into clear, customer-friendly language.
- **Rovo agent** — Planned evidence-grounded assistance for questions about order changes and unresolved exceptions.

## Important financial distinctions

RetailFlow is designed to distinguish:

- Checkout estimates from final order totals.
- Fulfillment adjustments from unexplained discrepancies.
- Payment authorization holds from captured charges.
- Captured charges from settled transactions.

An authorization hold is not, by itself, proof of a completed charge or settlement. A difference should be investigated against the available order and payment evidence before it is described as an error or loss.

## Planned Atlassian architecture

The intended implementation is a genuine Atlassian Forge app, with the exact modules and UI approach to be confirmed during development.

- **Forge app** — Application runtime and Atlassian platform integration.
- **Jira** — Operational investigation and resolution workflow.
- **Forge Storage** — Application data for the initial demonstration, subject to the final data model.
- **Rovo** — Planned agent experience grounded in verified RetailFlow records.
- **Synthetic demo data** — Reproducible grocery orders, fulfillment events, adjustments, and payment records.

## Development principles

1. Build and demonstrate a deployable Forge application—not just a standalone dashboard.
2. Use synthetic data for the initial demonstration and only authorized integrations.
3. Preserve evidence and explain how totals are calculated.
4. Do not label legitimate adjustments as overcharges or losses.
5. Keep customer-facing explanations separate from internal investigation notes.
6. Keep development costs at **$0**.
7. Keep the workflow compatible with an iPad-based development process.

## Competition direction

**Target category:** Apps for Specialized Industries

The first priority is a complete, reliable Forge application with a clear end-to-end demonstration. A qualifying Rovo agent and any additional competition bonus features will be pursued only after the core experience works and eligibility is confirmed.

## Project status

This repository is the source of truth for RetailFlow's application code and project documentation.

- [x] GitHub repository created.
- [ ] Forge app scaffold and manifest.
- [ ] Initial synthetic order data model.
- [ ] Order journey and reconciliation logic.
- [ ] Jira investigation workflow.
- [ ] Customer-facing explanation experience.
- [ ] Rovo agent implementation and validation.
- [ ] End-to-end deployment and demonstration.

## Development environment

The project is being developed against an Atlassian Cloud developer site. Keep credentials, API tokens, secrets, and real customer data out of this repository. Use protected repository secrets for any credentials required by automated workflows.

---

*RetailFlow — One order. One complete story. Every dollar explained.*
