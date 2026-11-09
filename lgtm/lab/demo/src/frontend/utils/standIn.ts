// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

// The lab copy of the demo has no currency or shipping service. The
// frontend answers those questions in process and marks the active span, so
// a trace shows that no remote call was made.
import { context, trace } from '@opentelemetry/api';
import { Money } from '../protos/demo';

// The only currency the trimmed shop knows. Catalog prices are already in it.
export const SHOP_CURRENCY = 'USD';

// Fixed shipping price; checkout charges the same amount (src/checkout/main.go).
export const SHIPPING_COST: Readonly<Money> = Object.freeze({
  currencyCode: SHOP_CURRENCY,
  units: 8,
  nanos: 990000000,
});

export const markStandIn = (replaces: 'currency' | 'shipping') => {
  trace.getSpan(context.active())?.setAttributes({
    'demo.stand_in': true,
    'demo.stand_in.replaces': replaces,
  });
};
