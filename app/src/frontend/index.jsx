import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Divider,
  Heading,
  Inline,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

const App = () => {
  const context = useProductContext();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const issueKey = context?.extension?.issue?.key ?? null;

  useEffect(() => {
    let active = true;

    invoke('getOrderAssurance', { issueKey })
      .then((result) => {
        if (active) setOrder(result);
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Unable to load order assurance.');
      });

    return () => {
      active = false;
    };
  }, [issueKey]);

  if (error) {
    return (
      <Stack space="space.150">
        <Heading size="medium">RetailFlow</Heading>
        <Text>We could not load the order assurance record.</Text>
        <Text>{error}</Text>
      </Stack>
    );
  }

  if (!order) {
    return (
      <Stack space="space.150">
        <Heading size="medium">RetailFlow</Heading>
        <Text>Loading order assurance…</Text>
      </Stack>
    );
  }

  return (
    <Stack space="space.200">
      <Stack space="space.050">
        <Heading size="large">RetailFlow</Heading>
        <Text>Grocery order, fulfillment and payment assurance</Text>
        <Text>{order.dataMode}{issueKey ? ` · Jira issue ${issueKey}` : ''}</Text>
      </Stack>

      <Divider />

      <Stack space="space.050">
        <Heading size="medium">{order.orderId} · {order.orderType}</Heading>
        <Inline spread="space-between">
          <Text>Checkout estimate</Text>
          <Text>{formatMoney(order.checkoutEstimate, order.currency)}</Text>
        </Inline>
        {order.adjustments.map((adjustment) => (
          <Inline key={adjustment.id} spread="space-between">
            <Text>{adjustment.label}</Text>
            <Text>{formatMoney(adjustment.amount, order.currency)}</Text>
          </Inline>
        ))}
        <Inline spread="space-between">
          <Text>Expected final total</Text>
          <Text>{formatMoney(order.expectedFinalTotal, order.currency)}</Text>
        </Inline>
      </Stack>

      <Divider />

      <Stack space="space.050">
        <Heading size="medium">Payment verification</Heading>
        <Inline spread="space-between">
          <Text>Recorded captured charge</Text>
          <Text>{formatMoney(order.capturedCharge, order.currency)}</Text>
        </Inline>
        <Inline spread="space-between">
          <Text>Unexplained variance</Text>
          <Text>{formatMoney(order.unexplainedVariance, order.currency)}</Text>
        </Inline>
        <Text>{order.explanation}</Text>
        <Text>Settlement status: {order.settlementStatus}</Text>
      </Stack>

      <Divider />

      <Stack space="space.050">
        <Heading size="medium">Verification controls</Heading>
        <Text>
          Arithmetic check: {order.arithmeticVerified ? 'Passed' : 'Needs review'}
        </Text>
        <Text>
          Case status: {order.reviewRequired ? 'Evidence review required' : 'No discrepancy detected'}
        </Text>
        <Text>
          This is a synthetic example, not a confirmed customer overcharge.
          Authorization holds, captured charges, and settlement must be evaluated separately.
        </Text>
      </Stack>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
