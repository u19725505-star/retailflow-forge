import Resolver from '@forge/resolver';

const resolver = new Resolver();

// Synthetic fixture only. No real retailer, customer, or payment account data
// is accessed by this first demonstration.
const DEMO_ORDER = {
  orderId: 'RF-10428',
  orderType: 'Grocery delivery',
  currency: 'USD',
  dataMode: 'Synthetic demonstration data',
  checkoutEstimate: 140.00,
  adjustments: [
    {
      id: 'adjustment-net',
      label: 'Verified fulfillment adjustments (net)',
      amount: -1.50,
      note: 'Illustrative net adjustment; item-level evidence is not connected yet.',
    },
  ],
  expectedFinalTotal: 138.50,
  capturedCharge: 147.00,
  settlementStatus: 'Not yet verified',
};

resolver.define('getOrderAssurance', async ({ payload }) => {
  const expectedFromAdjustments = Number(
    (
      DEMO_ORDER.checkoutEstimate +
      DEMO_ORDER.adjustments.reduce((total, adjustment) => total + adjustment.amount, 0)
    ).toFixed(2),
  );

  const arithmeticVerified =
    expectedFromAdjustments === DEMO_ORDER.expectedFinalTotal;

  const variance = Number(
    (DEMO_ORDER.capturedCharge - DEMO_ORDER.expectedFinalTotal).toFixed(2),
  );

  return {
    ...DEMO_ORDER,
    jiraIssueKey: payload?.issueKey ?? null,
    arithmeticVerified,
    unexplainedVariance: variance,
    reviewRequired: !arithmeticVerified || variance !== 0,
    explanation:
      variance === 0
        ? 'The captured charge matches the calculated expected final total.'
        : 'The captured charge differs from the calculated expected final total. Review the underlying fulfillment and payment evidence before drawing a conclusion.',
  };
});

export const handler = resolver.getDefinitions();
