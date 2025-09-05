import shopify from '../../lib/shopify';
import { prisma } from '../../lib/prisma';
import { COLLECTIONS_QUERY } from '../../lib/graphql';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    const shopRecord = await prisma.shop.upsert({
      where: { id: shop },
      update: {},
      create: {
        id: shop,
        domain: shop,
        accessToken: 'temp_token',
      },
    });

    if (!shopRecord.accessToken || shopRecord.accessToken === 'temp_token') {
      return res.status(401).json({ 
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}` 
      });
    }

    const client = new shopify.clients.Graphql({
      session: {
        shop: shopRecord.domain,
        accessToken: shopRecord.accessToken,
      },
    });

    const response = await client.query({
      data: {
        query: COLLECTIONS_QUERY,
        variables: {
          first: 50,
          after: req.query.after || null,
          query: req.query.search || null,
        },
      },
    });

    const collections = response.body.data.collections.edges.map(edge => edge.node);
    
    const collectionCommissions = await prisma.collectionCommission.findMany({
      where: { shopId: shop },
    });

    const enrichedCollections = collections.map(collection => {
      const commission = collectionCommissions.find(c => c.collectionId === collection.id);
      return {
        ...collection,
        commission: commission ? {
          commission: commission.commission,
          id: commission.id,
        } : null,
      };
    });

    return res.json({
      collections: enrichedCollections,
      pageInfo: response.body.data.collections.pageInfo,
    });
  } catch (error) {
    console.error('Collections API error:', error);
    return res.status(500).json({ error: 'Failed to fetch collections' });
  }
}