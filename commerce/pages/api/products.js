import shopify from '../../lib/shopify';
import { prisma } from '../../lib/prisma';
import { PRODUCTS_QUERY } from '../../lib/graphql';
import { getProductCommission } from '../../lib/commissions';

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
        query: PRODUCTS_QUERY,
        variables: {
          first: 50,
          after: req.query.after || null,
          query: req.query.search || null,
        },
      },
    });

    const products = response.body.data.products.edges.map(edge => edge.node);
    
    // Save products to database and enrich with commission data
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // Create public product link for customers/affiliates
        const productLink = `https://${shopRecord.domain}/products/${product.handle}`;
        
        // Save/update product in database
        await prisma.product.upsert({
          where: {
            shopId_id: {
              shopId: shop,
              id: product.id
            }
          },
          update: {
            title: product.title,
            handle: product.handle,
            link: productLink,
            updatedAt: new Date()
          },
          create: {
            id: product.id,
            shopId: shop,
            title: product.title,
            handle: product.handle,
            link: productLink
          }
        });

        const collectionIds = product.collections.edges.map(edge => edge.node.id);
        const commissionData = await getProductCommission(shop, product.id, collectionIds);
        
        return {
          ...product,
          link: productLink,
          commission: commissionData,
        };
      })
    );

    return res.json({
      products: enrichedProducts,
      pageInfo: response.body.data.products.pageInfo,
    });
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
