// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { NextApiRequest, NextApiResponse } from 'next';
import InstrumentationMiddleware from '../../utils/telemetry/InstrumentationMiddleware';
import { Empty, Money } from '../../protos/demo';
import { markStandIn, SHIPPING_COST } from '../../utils/standIn';

type TResponse = Money | Empty;

const handler = async ({ method }: NextApiRequest, res: NextApiResponse<TResponse>) => {
  switch (method) {
    case 'GET': {
      markStandIn('shipping');

      return res.status(200).json(SHIPPING_COST);
    }

    default: {
      return res.status(405);
    }
  }
};

export default InstrumentationMiddleware(handler);
