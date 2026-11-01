import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Button,
  Heading,
  Inline,
  Link,
  Lozenge,
  Select,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const DEFAULT_ORDER_ID = 'RF-10428';

const STATUS_APPEARANCE = {
  reconciled: 'success',
  pending_settlement: 'inprogress',
  evidence_review: 'moved',
  investigate: 'removed',
};

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount ?? 0));

const StatusLozenge = ({ status, label }) => (
  <Lozenge appearance={STATUS_APPEARANCE[status] ?? 'default'}>{label}</Lozenge>
);

const OrderDetail = ({ orderId, issueKey, onInvestigationChange }) => {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [investigation, setInvestigation] = useState(null);
  const [alreadyExisted, setAlreadyExisted] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    let active = true;

    invoke('getOrderAssurance', { orderId, issueKey })
      .then((result) => {
        if (!active) return;
        setOrder(result);
        if (result?.investigation) {
          setInvestigation(result.investigation);
          setAlreadyExisted(true);
        }
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Unable to load this order.');
      });

    return () => {
      active = false;
    };
  }, [orderId, issueKey]);

  const createInvestigation = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await invoke('createInvestigation', { orderId, issueKey });
      if (result?.ok) {
        setInvestigation(result);
        setAlreadyExisted(Boolean(result.existing));
        if (onInvestigationChange) onInvestigationChange();
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
      <Stack space="space.100">
        <Text>We could not load order {orderId}.</Text>
        <Text>{error}</Text>
      </Stack>
    );
  }

  if (!order) {
    return <Text>Loading order {orderId}…</Text>;
  }

  const adjustments = order.adjustments ?? [];

  return (
    <Stack space="space.200">
      <Stack space="space.050">
        <Heading size="medium">
          {order.orderId} · {order.orderType}
        </Heading>
        <StatusLozenge status={order.status} label={order.statusLabel} />
      </Stack>

      <Stack space="space.050">
        <Inline spread="space-between">
          <Text>Checkout estimate</Text>
          <Text>{formatMoney(order.checkoutEstimate, order.currency)}</Text>
        </Inline>
        {adjustments.map((adjustment) => (
          <Inline key={adjustment.id} spread="space-between">
            <Text>
              {adjustment.label}
              {adjustment.verified ? '' : ' (no evidence yet)'}
            </Text>
            <Text>{formatMoney(adjustment.amount, order.currency)}</Text>
          </Inline>
        ))}
        <Inline spread="space-between">
          <Text>Expected final total</Text>
          <Text>{formatMoney(order.expectedFinalTotal, order.currency)}</Text>
        </Inline>
      </Stack>

      <Stack space="space.050">
        <Heading size="small">Payment verification</Heading>
        <Inline spread="space-between">
          <Text>Recorded captured charge</Text>
          <Text>{formatMoney(order.capturedCharge, order.currency)}</Text>
        </Inline>
        {order.authorizationHold > 0 ? (
          <Inline spread="space-between">
            <Text>Authorization hold (not a charge)</Text>
            <Text>{formatMoney(order.authorizationHold, order.currency)}</Text>
          </Inline>
        ) : null}
        <Inline spread="space-between">
          <Text>Variance</Text>
          <Text>{formatMoney(order.unexplainedVariance, order.currency)}</Text>
        </Inline>
        <Text>{order.explanation}</Text>
        <Text>Settlement status: {order.settlementStatus}</Text>
      </Stack>

      <Text>
        {order.dataMode}. This is not a confirmed customer overcharge.
        Authorization holds, captured charges, and settlement must be
        evaluated separately.
      </Text>

      {order.reviewRequired ? (
        <Stack space="space.100">
          <Heading size="small">Investigation</Heading>
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

const IssuePanel = ({ issueKey }) => {
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_ORDER_ID);

  useEffect(() => {
    let active = true;
    invoke('listOrders')
      .then((result) => {
        if (active) setOrders(result?.orders ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const options = orders.map((order) => ({
    label: `${order.orderId} · ${order.statusLabel}`,
    value: order.orderId,
  }));

  return (
    <Stack space="space.200">
      <Stack space="space.050">
        <Heading size="large">RetailFlow</Heading>
        <Text>Grocery order, fulfillment and payment assurance</Text>
        <Text>Jira issue {issueKey}</Text>
      </Stack>

      {options.length > 0 ? (
        <Select
          options={options}
          defaultValue={options.find((option) => option.value === DEFAULT_ORDER_ID)}
          onChange={(option) => {
            if (option?.value) setSelectedId(option.value);
          }}
        />
      ) : null}

      <OrderDetail key={selectedId} orderId={selectedId} issueKey={issueKey} />
    </Stack>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(DEFAULT_ORDER_ID);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    invoke('listOrders')
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Unable to load orders.');
      });
    return () => {
      active = false;
    };
  }, [refreshCount]);

  if (error) {
    return (
      <Stack space="space.100">
        <Heading size="large">RetailFlow</Heading>
        <Text>We could not load the order list.</Text>
        <Text>{error}</Text>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Stack space="space.100">
        <Heading size="large">RetailFlow</Heading>
        <Text>Loading orders…</Text>
      </Stack>
    );
  }

  const orders = data.orders ?? [];
  const needsReview = orders.filter((order) => order.reviewRequired).length;
  const reconciled = orders.filter((order) => order.status === 'reconciled').length;

  return (
    <Stack space="space.300">
      <Stack space="space.050">
        <Heading size="large">RetailFlow</Heading>
        <Text>Grocery order, fulfillment and payment assurance</Text>
        <Text>{data.dataMode}</Text>
      </Stack>

      <Stack space="space.050">
        <Text>
          {orders.length} orders · {reconciled} reconciled · {needsReview} need review
        </Text>
      </Stack>

      <Stack space="space.150">
        {orders.map((order) => (
          <Inline key={order.orderId} spread="space-between" alignBlock="center">
            <Stack space="space.050">
              <Text>
                {order.orderId} · {order.orderType}
              </Text>
              <StatusLozenge status={order.status} label={order.statusLabel} />
            </Stack>
            <Stack space="space.050">
              <Text>Variance {formatMoney(order.variance)}</Text>
              {order.investigationKey ? (
                <Link href={order.investigationUrl} openNewTab>
                  {order.investigationKey}
                </Link>
              ) : null}
            </Stack>
            <Button onClick={() => setSelectedId(order.orderId)}>View</Button>
          </Inline>
        ))}
      </Stack>

      <OrderDetail
        key={selectedId}
        orderId={selectedId}
        issueKey={null}
        onInvestigationChange={() => setRefreshCount((count) => count + 1)}
      />
    </Stack>
  );
};

const App = () => {
  const context = useProductContext();

  if (!context) {
    return <Text>Loading…</Text>;
  }

  const issueKey = context?.extension?.issue?.key ?? null;

  return issueKey ? <IssuePanel issueKey={issueKey} /> : <Dashboard />;
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
