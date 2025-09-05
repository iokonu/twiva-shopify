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

    // Check if we have a valid access token
    const shopRecord = await prisma.shop.findUnique({
      where: { id: shop }
    });

    if (!shopRecord || !shopRecord.accessToken || shopRecord.accessToken === 'temp_token') {
      return res.status(401).json({ 
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}` 
      });
    }

    // Get all commission data
    const [productCommissions, collectionCommissions] = await Promise.all([
      prisma.productCommission.findMany({
        where: { shopId: shop },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.collectionCommission.findMany({
        where: { shopId: shop },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Create GraphQL client to fetch additional data
    const client = new shopify.clients.Graphql({
      session: {
        shop: shopRecord.domain,
        accessToken: shopRecord.accessToken,
      },
    });

    let totalPotentialEarnings = 0;
    let totalCommissions = productCommissions.length + collectionCommissions.length;
    let allCommissionRates = [];
    let productsWithCommissions = 0;
    let totalProducts = 0;

    // Get all products to calculate total count and products without commissions
    const allProductsQuery = `
      query getAllProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
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

    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    // Fetch all products with pagination
    try {
      while (hasNextPage) {
        const productResponse = await client.query({
          data: {
            query: allProductsQuery,
            variables: { first: 250, after: cursor }
          }
        });

        const data = productResponse.body.data;
        allProducts = allProducts.concat(data.products.nodes);
        hasNextPage = data.products.pageInfo.hasNextPage;
        cursor = data.products.pageInfo.endCursor;
      }

      totalProducts = allProducts.length;

      // Calculate potential earnings from product commissions
      if (productCommissions.length > 0) {
        productCommissions.forEach(commission => {
          const product = allProducts.find(p => p.id === commission.productId);
          if (product && product.priceRangeV2) {
            const price = parseFloat(product.priceRangeV2.minVariantPrice.amount);
            const commissionAmount = (price * commission.commission) / 100;
            totalPotentialEarnings += commissionAmount;
          }
          allCommissionRates.push(commission.commission);
        });
        
        productsWithCommissions = productCommissions.length;
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
    }

    // Add collection commission rates to average calculation
    collectionCommissions.forEach(commission => {
      allCommissionRates.push(commission.commission);
    });

    // Calculate average commission
    const averageCommission = allCommissionRates.length > 0 
      ? allCommissionRates.reduce((sum, rate) => sum + rate, 0) / allCommissionRates.length
      : 0;

    // Find highest commission
    let highestCommission = null;
    if (allCommissionRates.length > 0) {
      const maxRate = Math.max(...allCommissionRates);
      const productWithMax = productCommissions.find(c => c.commission === maxRate);
      const collectionWithMax = collectionCommissions.find(c => c.commission === maxRate);
      
      highestCommission = {
        commission: maxRate,
        type: productWithMax ? 'Product' : 'Category'
      };
    }

    const productsWithoutCommissions = totalProducts - productsWithCommissions;

    const stats = {
      totalCommissions,
      productCommissions: productCommissions.length,
      productsWithoutCommissions,
      collectionCommissions: collectionCommissions.length,
      totalPotentialEarnings,
      averageCommission,
      highestCommission,
      summary: {
        hasCommissions: totalCommissions > 0,
        lastUpdated: new Date().toISOString()
      }
    };

    return res.json(stats);
  } catch (error) {
    console.error('Overview API error:', error);
    return res.status(500).json({ error: 'Failed to fetch overview data' });
  }
}