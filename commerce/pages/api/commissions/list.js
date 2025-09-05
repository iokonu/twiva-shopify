import { prisma } from '../../../lib/prisma';
import shopify from '../../../lib/shopify';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    const shopRecord = await prisma.shop.findUnique({
      where: { id: shop }
    });

    if (!shopRecord || !shopRecord.accessToken || shopRecord.accessToken === 'temp_token') {
      return res.status(401).json({ 
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}` 
      });
    }

    const productCommissions = await prisma.productCommission.findMany({
      where: { shopId: shop },
      orderBy: { createdAt: 'desc' }
    });

    const collectionCommissions = await prisma.collectionCommission.findMany({
      where: { shopId: shop },
      orderBy: { createdAt: 'desc' }
    });

    const client = new shopify.clients.Graphql({
      session: {
        shop: shopRecord.domain,
        accessToken: shopRecord.accessToken,
      },
    });

    const productIds = productCommissions.map(c => c.productId);
    const collectionIds = collectionCommissions.map(c => c.collectionId);

    let products = [];
    let collections = [];

    if (productIds.length > 0) {
      const productQuery = `
        query getProductsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      `;

      const productResponse = await client.query({
        data: {
          query: productQuery,
          variables: { ids: productIds }
        }
      });

      products = productResponse.body.data.nodes.filter(node => node);
    }

    if (collectionIds.length > 0) {
      const collectionQuery = `
        query getCollectionsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Collection {
              id
              title
              productsCount
            }
          }
        }
      `;

      const collectionResponse = await client.query({
        data: {
          query: collectionQuery,
          variables: { ids: collectionIds }
        }
      });

      collections = collectionResponse.body.data.nodes.filter(node => node);
    }

    const enrichedCommissions = [
      ...productCommissions.map(commission => {
        const product = products.find(p => p.id === commission.productId);
        return {
          id: commission.id,
          type: 'product',
          commission: commission.commission,
          productId: commission.productId,
          productTitle: product?.title || 'Unknown Product',
          productPrice: product?.priceRangeV2?.minVariantPrice?.amount,
          currencyCode: product?.priceRangeV2?.minVariantPrice?.currencyCode || 'USD',
          createdAt: commission.createdAt,
          updatedAt: commission.updatedAt
        };
      }),
      ...collectionCommissions.map(commission => {
        const collection = collections.find(c => c.id === commission.collectionId);
        return {
          id: commission.id,
          type: 'collection',
          commission: commission.commission,
          collectionId: commission.collectionId,
          collectionTitle: collection?.title || 'Unknown Collection',
          productsCount: collection?.productsCount || 0,
          createdAt: commission.createdAt,
          updatedAt: commission.updatedAt
        };
      })
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      commissions: enrichedCommissions,
      summary: {
        totalCommissions: enrichedCommissions.length,
        productCommissions: productCommissions.length,
        collectionCommissions: collectionCommissions.length
      }
    });
  } catch (error) {
    console.error('Commissions list API error:', error);
    return res.status(500).json({ error: 'Failed to fetch commissions' });
  }
}