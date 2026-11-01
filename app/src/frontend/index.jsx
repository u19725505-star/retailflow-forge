import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Button,
  Heading,
  Inline,
  Link,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount ?? 0));

const App = () => {
  const context = useProductContext();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [investigation, setInvestigation] = useState(null);
  const [alreadyExisted, setAlreadyExisted] = useState(false);
  const [createError, setCreateError] = useState(null);

  const issueKey = context?.extension?.issue?.key ?? null;

  useEffect(() => {
    let active = true;

    invoke('getOrderAssurance', { issueKey })
      .then((result) => {
        if (!active) return;
        setOrder(result);
        if (result?.investigation) {
          setInvestigation(result.investigation);
          setAlreadyExisted(true);
        }
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Unable to load order assurance.');
      });

    return () => {
      active = false;
    };
  }, [issueKey]);

  const createInvestigation = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await invoke('createInvestigation', { issueKey });
      if (result?.ok) {
        setInvestigation(result);
        setAlreadyExisted(Boolean(result.existing));
      } else {
        const detail = result?.detail ? ` ${result.detail}` : '';
        setCreateError(`${result?.message ?? 'Could not create the issue.'}${detail}`);
      }
    } catch (reason) {
      setCreateError(reason?.message ?? 'Could not create the issue.');
    } finally {
      setCreating(false);
    }
  };

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

  const adjustments = order.adjustments ?? [];

  return (
    <Stack space="space.200">
      <Stack space="space.050">
        <Heading size="large">RetailFlow</Heading>
        <Text>Grocery order, fulfillment and payment assurance</Text>
        <Text>
          {order.dataMode}
          {issueKey ? ` · Jira issue ${issueKey}` : ''}
        </Text>
      </Stack>

      <Stack space="space.050">
        <Heading size="medium">
          {order.orderId} · {order.orderType}
        </Heading>
        <Inline spread="space-between">
          <Text>Checkout estimate</Text>
          <Text>{formatMoney(order.checkoutEstimate, order.currency)}</Text>
        </Inline>
        {adjustments.map((adjustment) => (
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

      <Stack space="space.050">
        <Heading size="medium">Verification controls</Heading>
        <Text>
          Arithmetic check: {order.arithmeticVerified ? 'Passed' : 'Needs review'}
        </Text>
        <Text>
          Case status:{' '}
          {order.reviewRequired
            ? 'Evidence review required'
            : 'No discrepancy detected'}
        </Text>
        <Text>
          This is a synthetic example, not a confirmed customer overcharge.
          Authorization holds, captured charges, and settlement must be
          evaluated separately.
        </Text>
      </Stack>

      {order.reviewRequired ? (
        <Stack space="space.100">
          <Heading size="medium">Investigation</Heading>
          {investigation ? (
            <Stack space="space.050">
              <Text>
                {alreadyExisted
                  ? 'An investigation already exists for this order:'
                  : 'Investigation issue created:'}
              </Text>
              <Link href={investigation.url} openNewTab>
                {investigation.key}
              </Link>
              <Text>
                {investigation.linked
                  ? `Linked to ${investigation.linkedFrom ?? 'the source issue'}.`
                  : 'Not linked to a source issue.'}
              </Text>
            </Stack>
          ) : (
            <Button
              appearance="primary"
              isDisabled={creating}
              onClick={createInvestigation}
            >
              {creating ? 'Creating issue…' : 'Create investigation issue'}
            </Button>
          )}
          {createError ? <Text>{createError}</Text> : null}
        </Stack>
      ) : null}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
