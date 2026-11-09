// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import ProductCatalogGateway from '../gateways/rpc/ProductCatalog.gateway';

// Catalog prices are in the shop's only currency, so they are returned as
// they are. The lab copy has no currency service to convert them.
const ProductCatalogService = () => ({
  async listProducts() {
    const { products: productList } = await ProductCatalogGateway.listProducts();

    return productList;
  },
  async getProduct(id: string) {
    return ProductCatalogGateway.getProduct(id);
  },
});

export default ProductCatalogService();
