import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';

const resolver = new Resolver();

const DEFAULT_ORDER_ID = 'RF-10428';

// Synthetic fixtures only. No real retailer, customer, or payment account
// data is accessed. All amounts are in cents to avoid rounding errors.
const ORDERS = [
  {
    orderId: 'RF-10421',
    orderType: 'Grocery delivery',
    checkoutEstimate: 8640,
    adjustments: [
      { id: 'a1', label: 'Weighed produce, heavier than estimate', amount: 115, verified: true },
      { id: 'a2', label: 'Substitution at lower price', amount: -80, verified: true },
    ],
    capturedCharge: 8675,
    authorizationHold: 0,
    settlementStatus: 'Settled',
  },
  {
    orderId: 'RF-10428',
    orderType: 'Grocery delivery',
    checkoutEstimate: 14000,
    adjustments: [
      { id: 'adjustment-net', label: 'Verified fulfillment adjustments (net)', amount: -150, verified: true },
    ],
    capturedCharge: 14700,
    authorizationHold: 0,
    settlementStatus: 'Not yet verified',
  },
  {
    orderId: 'RF-10433',
    orderType: 'Curbside pickup',
    checkoutEstimate: 6200,
    adjustments: [
      { id: 'a1', label: 'Out-of-stock item removed', amount: -749, verified: true },
    ],
    capturedCharge: 0,
    authorizationHold: 6200,
    settlementStatus: 'Pending',
  },
  {
    orderId: 'RF-10437',
    orderType: 'Grocery delivery',
    checkoutEstimate: 4520,
    adjustments: [
      { id: 'a1', label: 'Substitution at higher price', amount: 230, verified: false },
    ],
    capturedCharge: 4750,
    authorizationHold: 0,
    settlementStatus: 'Settled',
  },
  {
    orderId: 'RF-10441',
    orderType: 'Grocery delivery',
    checkoutEstimate: 7315,
    adjustments: [
      { id: 'a1', label: 'Discount code applied', amount: -300, verified: true },
    ],
    capturedCharge: 14030,
    authorizationHold: 0,
    settlementStatus: 'Settled',
  },
  {
    orderId: 'RF-10446',
    orderType: 'Curbside pickup',
    checkoutEstimate: 2890,
    adjustments: [],
    capturedCharge: 2890,
    authorizationHold: 0,
    settlementStatus: 'Settled',
  },
];

const STATUS_LABELS = {
  reconciled: 'Reconciled',
  pending_settlement: 'Pending settlement',
  evidence_review: 'Evidence review required',
  investigate: 'Investigation recommended',
};

const toDollars = (cents) => Number((cents / 100).toFixed(2));

const money = (cents) => {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
};

const paragraph = (text) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const findOrder = (orderId) =>
  ORDERS.find((order) => order.orderId === (orderId || DEFAULT_ORDER_ID)) ?? null;

// Reconciliation engine: classifies an order from its recorded amounts.
const assess = (order) => {
  const expected =
    order.checkoutEstimate +
    order.adjustments.reduce((total, adjustment) => total + adjustment.amount, 0);
  const variance = order.capturedCharge - expected;
  const evidenceVerified = order.adjustments.every((adjustment) => adjustment.verified);

  let status;
  let explanation;

  if (
    order.capturedCharge === 0 &&
    order.authorizationHold > 0 &&
    order.settlementStatus === 'Pending'
  ) {
    status = 'pending_settlement';
    explanation =
      'No charge has been captured yet. The amount held is an authorization hold, which is not a charge. Check again after settlement.';
  } else if (variance === 0 && evidenceVerified) {
    status = 'reconciled';
    explanation =
      'The captured charge matches the expected final total, and every adjustment has supporting evidence.';
  } else if (variance === 0) {
    status = 'evidence_review';
    explanation =
      'The captured charge matches the expected final total, but at least one adjustment has no supporting evidence yet. Attach the evidence before closing the case.';
  } else if (expected > 0 && order.capturedCharge === expected * 2) {
    status = 'investigate';
    explanation =
      'The captured charge is exactly twice the expected final total, which can indicate a duplicate capture. Verify against payment records before drawing a conclusion.';
  } else {
    status = 'investigate';
    explanation =
      'The captured charge differs from the calculated expected final total. Review the underlying fulfillment and payment evidence before drawing a conclusion.';
  }

  return {
    expected,
    variance,
    // A variance is only meaningful once something has been captured.
    varianceApplicable: status !== 'pending_settlement',
    evidenceVerified,
    status,
    statusLabel: STATUS_LABELS[status],
    reviewRequired: status === 'investigate' || status === 'evidence_review',
    explanation,
  };
};

// Builds the Jira issue title for an investigation.
const investigationTitle = (status, orderId, variance) => {
  if (status === 'evidence_review') {
    return `Review missing evidence on order ${orderId}`;
  }
  if (variance === 0) {
    return `Investigate order ${orderId}`;
  }
  return `Investigate payment variance on order ${orderId} (${money(variance)})`;
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

resolver.define('listOrders', async () => {
  const rows = await Promise.all(
    ORDERS.map(async (order) => {
      const result = assess(order);
      const investigation = await readInvestigation(order.orderId);
      return {
        orderId: order.orderId,
        orderType: order.orderType,
        status: result.status,
        statusLabel: result.statusLabel,
        reviewRequired: result.reviewRequired,
        expectedFinalTotal: toDollars(result.expected),
        capturedCharge: toDollars(order.capturedCharge),
        variance: toDollars(result.variance),
        varianceApplicable: result.varianceApplicable,
        investigationKey: investigation?.key ?? null,
        investigationUrl: investigation?.url ?? null,
      };
    }),
  );
  return { dataMode: 'Synthetic demonstration data', orders: rows };
});

// Finds the order an investigation issue belongs to, so the panel can open
// on the right order when it is shown inside that issue.
resolver.define('getOrderForIssue', async ({ payload }) => {
  const issueKey = payload?.issueKey ?? null;
  if (issueKey) {
    const records = await Promise.all(
      ORDERS.map(async (order) => ({
        orderId: order.orderId,
        record: await readInvestigation(order.orderId),
      })),
    );
    const match = records.find((entry) => entry.record?.key === issueKey);
    if (match) {
      return { orderId: match.orderId, matched: true };
    }
  }
  return { orderId: DEFAULT_ORDER_ID, matched: false };
});

resolver.define('getOrderAssurance', async ({ payload }) => {
  const order = findOrder(payload?.orderId);
  if (!order) {
    throw new Error(`Unknown order ${payload?.orderId}`);
  }

  const result = assess(order);
  const investigation = await readInvestigation(order.orderId);

  return {
    orderId: order.orderId,
    orderType: order.orderType,
    currency: 'USD',
    dataMode: 'Synthetic demonstration data',
    jiraIssueKey: payload?.issueKey ?? null,
    checkoutEstimate: toDollars(order.checkoutEstimate),
    adjustments: order.adjustments.map((adjustment) => ({
      id: adjustment.id,
      label: adjustment.label,
      amount: toDollars(adjustment.amount),
      verified: adjustment.verified,
    })),
    expectedFinalTotal: toDollars(result.expected),
    capturedCharge: toDollars(order.capturedCharge),
    authorizationHold: toDollars(order.authorizationHold),
    settlementStatus: order.settlementStatus,
    unexplainedVariance: toDollars(result.variance),
    varianceApplicable: result.varianceApplicable,
    arithmeticVerified: true,
    evidenceVerified: result.evidenceVerified,
    status: result.status,
    statusLabel: result.statusLabel,
    reviewRequired: result.reviewRequired,
    explanation: result.explanation,
    investigation,
  };
});

resolver.define('createInvestigation', async ({ payload }) => {
  const order = findOrder(payload?.orderId);
  if (!order) {
    return { ok: false, message: `Unknown order ${payload?.orderId}.` };
  }

  const result = assess(order);
  if (!result.reviewRequired) {
    return { ok: false, message: 'No discrepancy to investigate.' };
  }

  // If an investigation already exists for this order, return it instead of
  // creating a duplicate Jira issue.
  const existing = await readInvestigation(order.orderId);
  if (existing) {
    return { ok: true, existing: true, ...existing };
  }

  const sourceKey = payload?.issueKey ?? null;
  const projectKey = sourceKey ? sourceKey.split('-')[0] : 'ROA';

  const adjustmentParagraphs = order.adjustments.map((adjustment) =>
    paragraph(
      `Adjustment: ${adjustment.label}: ${money(adjustment.amount)} (${adjustment.verified ? 'evidence attached' : 'no evidence yet'})`,
    ),
  );

  const body = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: 'Task' },
      summary: investigationTitle(result.status, order.orderId, result.variance),
      description: {
        type: 'doc',
        version: 1,
        content: [
          paragraph(
            `RetailFlow flagged order ${order.orderId} (${order.orderType}) for review. This is synthetic demonstration data.`,
          ),
          paragraph(`Status: ${result.statusLabel}`),
          paragraph(`Checkout estimate: ${money(order.checkoutEstimate)}`),
          ...adjustmentParagraphs,
          paragraph(`Expected final total: ${money(result.expected)}`),
          paragraph(`Recorded captured charge: ${money(order.capturedCharge)}`),
          paragraph(`Variance: ${money(result.variance)}`),
          paragraph(`Settlement status: ${order.settlementStatus}`),
          paragraph(result.explanation),
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
    orderId: order.orderId,
    createdAt: new Date().toISOString(),
  };

  // Remember this investigation so the button cannot create a duplicate.
  let remembered = true;
  try {
    await kvs.set(investigationStorageKey(order.orderId), record);
  } catch (storageError) {
    console.error('Could not store investigation record', storageError);
    remembered = false;
  }

  return { ok: true, existing: false, remembered, ...record };
});

export const handler = resolver.getDefinitions();
