import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';

const resolver = new Resolver();

// Synthetic fixture only. No real retailer, customer, or payment account data
// is accessed by this first demonstration.
const DEMO_ORDER = {
  orderId: 'RF-10428',
  orderType: 'Grocery delivery',
  currency: 'USD',
  dataMode: 'Synthetic demonstration data',
  checkoutEstimate: 140.0,
  adjustments: [
    {
      id: 'adjustment-net',
      label: 'Verified fulfillment adjustments (net)',
      amount: -1.5,
      note: 'Illustrative net adjustment; item-level evidence is not connected yet.',
    },
  ],
  expectedFinalTotal: 138.5,
  capturedCharge: 147.0,
  settlementStatus: 'Not yet verified',
};

const investigationStorageKey = (orderId) => `investigation-${orderId}`;

const readInvestigation = async (orderId) => {
  try {
    const record = await kvs.get(investigationStorageKey(orderId));
    return record ?? null;
  } catch (storageError) {
    console.error('Could not read stored investigation', storageError);
    return null;
  }
};

const calculateAssurance = () => {
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

  return { arithmeticVerified, variance };
};

const money = (amount) => `$${Number(amount).toFixed(2)}`;

const paragraph = (text) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

resolver.define('getOrderAssurance', async ({ payload }) => {
  const { arithmeticVerified, variance } = calculateAssurance();
  const investigation = await readInvestigation(DEMO_ORDER.orderId);

  return {
    ...DEMO_ORDER,
    jiraIssueKey: payload?.issueKey ?? null,
    arithmeticVerified,
    unexplainedVariance: variance,
    reviewRequired: !arithmeticVerified || variance !== 0,
    investigation,
    explanation:
      variance === 0
        ? 'The captured charge matches the calculated expected final total.'
        : 'The captured charge differs from the calculated expected final total. Review the underlying fulfillment and payment evidence before drawing a conclusion.',
  };
});

resolver.define('createInvestigation', async ({ payload }) => {
  const { arithmeticVerified, variance } = calculateAssurance();

  if (arithmeticVerified && variance === 0) {
    return { ok: false, message: 'No discrepancy to investigate.' };
  }

  // If an investigation already exists for this order, return it instead of
  // creating a duplicate Jira issue.
  const existing = await readInvestigation(DEMO_ORDER.orderId);
  if (existing) {
    return { ok: true, existing: true, ...existing };
  }

  const sourceKey = payload?.issueKey ?? null;
  const projectKey = sourceKey ? sourceKey.split('-')[0] : 'ROA';

  const body = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: 'Task' },
      summary: `Investigate payment variance on order ${DEMO_ORDER.orderId} (${money(variance)})`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          paragraph(
            `RetailFlow flagged order ${DEMO_ORDER.orderId} for evidence review. This is synthetic demonstration data.`,
          ),
          paragraph(`Checkout estimate: ${money(DEMO_ORDER.checkoutEstimate)}`),
          paragraph(
            `Verified fulfillment adjustments (net): ${money(DEMO_ORDER.adjustments[0].amount)}`,
          ),
          paragraph(`Expected final total: ${money(DEMO_ORDER.expectedFinalTotal)}`),
          paragraph(`Recorded captured charge: ${money(DEMO_ORDER.capturedCharge)}`),
          paragraph(`Unexplained variance: ${money(variance)}`),
          paragraph(`Settlement status: ${DEMO_ORDER.settlementStatus}`),
          paragraph(
            'A difference is not by itself an overcharge or a loss. Review the fulfillment and payment evidence, and separate authorization holds, captured charges, and settlement, before drawing a conclusion.',
          ),
        ],
      },
    },
  };

  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

  if (!response.ok) {
    const detail = await response.text();
    return {
      ok: false,
      message: `Jira rejected the request (${response.status}).`,
      detail: detail.slice(0, 500),
    };
  }

  const created = await response.json();

  // Ask Jira for the real site address. The "self" link in the create
  // response points at the API gateway, which gives a 404 when opened.
  let origin = '';
  try {
    const info = await api
      .asApp()
      .requestJira(route`/rest/api/3/serverInfo`);
    if (info.ok) {
      const serverInfo = await info.json();
      origin = new URL(serverInfo.baseUrl).origin;
    }
  } catch (infoError) {
    origin = '';
  }

  let linked = false;
  if (sourceKey) {
    try {
      const linkResponse = await api
        .asUser()
        .requestJira(route`/rest/api/3/issueLink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: { name: 'Relates' },
            inwardIssue: { key: created.key },
            outwardIssue: { key: sourceKey },
          }),
        });
      linked = linkResponse.ok;
    } catch (linkError) {
      linked = false;
    }
  }

  const record = {
    key: created.key,
    url: `${origin}/browse/${created.key}`,
    linked,
    linkedFrom: sourceKey,
    createdAt: new Date().toISOString(),
  };

  // Remember this investigation so the button cannot create a duplicate.
  let remembered = true;
  try {
    await kvs.set(investigationStorageKey(DEMO_ORDER.orderId), record);
  } catch (storageError) {
    console.error('Could not store investigation record', storageError);
    remembered = false;
  }

  return { ok: true, existing: false, remembered, ...record };
});

export const handler = resolver.getDefinitions();
