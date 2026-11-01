# RetailFlow Forge app

RetailFlow is a Jira-integrated grocery order, fulfillment, and payment assurance application.

## First milestone

The first Forge module is a Jira issue panel built with UI Kit. It displays one clearly labelled synthetic order fixture and demonstrates the distinction between:

- checkout estimate;
- fulfillment adjustments;
- calculated expected final total;
- recorded captured charge;
- unexplained variance; and
- settlement status.

The fixture is intentionally not connected to a real retailer, payment processor, or customer account.

## Development

The source is maintained in GitHub. Forge CLI commands run through GitHub Actions so development does not require a local terminal on the iPad.

After registration, the app can be validated with:

```bash
npm install
forge lint
```

Deployment and installation are separate steps and will only be added after the registered source passes validation.

## Important financial rules

- An authorization hold is not a captured charge.
- A captured charge is not proof of settlement.
- Expected fulfillment adjustments are not automatically errors.
- A variance is an investigation signal, not proof of an overcharge.
- Customer-facing explanations must be based on verified order data.

## Current limitations

This milestone is a synthetic UI demonstration. It does not yet persist orders, read Jira issue data, connect to a retailer, or reconcile real payment records.
