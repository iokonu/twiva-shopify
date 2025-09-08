import shopify from '../../lib/shopify';
import { supabase } from '../../lib/supabase';
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

    // Try to get existing shop first
    let { data: shopRecord } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shop)
      .single();

    // If no shop exists, create one
    if (!shopRecord) {
      const { data: newShop, error } = await supabase
        .from('shops')
        .insert({
          id: shop,
          domain: shop,
          accessToken: 'temp_token',
        })
        .select()
        .single();
      
      if (error) throw error;
      shopRecord = newShop;
    }

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
    
    // Collections don't have separate commission records - they're just bulk update tools
    const enrichedCollections = collections.map(collection => {
      return {
        ...collection,
        productsCount: collection.productsCount?.count || 0,
        commission: null, // Collections don't have persistent commissions
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