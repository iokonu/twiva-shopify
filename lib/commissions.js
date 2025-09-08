import { supabase } from './supabase';

export async function getProductCommission(shopId, productId) {
  const { data: productCommission, error } = await supabase
    .from('product_commissions')
    .select('*')
    .eq('shopId', shopId)
    .eq('productId', productId)
    .single();

  if (!error && productCommission) {
    return {
      commission: productCommission.commissionValue,
      commissionType: productCommission.commissionType,
      source: 'product',
      id: productCommission.id,
    };
  }

  return null;
}

export async function setProductCommission(shopId, productId, commissionData, productDetails = null) {
  // If product details aren't provided, we need to fetch them from Shopify
  let productTitle = 'Unknown Product';
  let productHandle = '';
  let productLink = '';
  
  if (!productDetails) {
    const { data: shopRecord } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopRecord?.accessToken && shopRecord.accessToken !== 'temp_token') {
      try {
        const { default: shopify } = await import('./shopify.js');
        const client = new shopify.clients.Graphql({
          session: {
            shop: shopRecord.domain,
            accessToken: shopRecord.accessToken,
          },
        });

        const productQuery = `
          query getProduct($id: ID!) {
            product(id: $id) {
              id
              title
              handle
            }
          }
        `;

        const response = await client.query({
          data: {
            query: productQuery,
            variables: { id: productId }
          }
        });

        const product = response.body.data.product;
        if (product) {
          productTitle = product.title;
          productHandle = product.handle;
          productLink = `https://${shopRecord.domain}/products/${product.handle}`;
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
      }
    }
  } else {
    productTitle = productDetails.title;
    productHandle = productDetails.handle;
    productLink = productDetails.link;
  }

  // Handle both old format (number) and new format (object)
  const commission = typeof commissionData === 'number' ? commissionData : commissionData.commission;
  const commissionType = typeof commissionData === 'object' ? commissionData.commissionType : 'percentage';
  const currency = typeof commissionData === 'object' ? commissionData.currency : null;

  // Try to update existing record first
  const { data: existingCommission } = await supabase
    .from('product_commissions')
    .select('id')
    .eq('shopId', shopId)
    .eq('productId', productId)
    .single();

  if (existingCommission) {
    const { data, error } = await supabase
      .from('product_commissions')
      .update({
        commissionValue: commission,
        commissionType,
        productTitle,
        productHandle,
        productLink,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existingCommission.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('product_commissions')
      .insert({
        shopId,
        productId,
        commissionValue: commission,
        commissionType,
        productTitle,
        productHandle,
        productLink,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export async function setCollectionCommission(shopId, collectionId, commissionData) {
  // For collections, we just bulk apply to all products in that collection
  await applyCollectionCommissionToProducts(shopId, collectionId, commissionData);
  
  const { data: shopRecord } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();

  let collectionTitle = 'Unknown Collection';
  let productsCount = 0;
  
  if (shopRecord?.accessToken && shopRecord.accessToken !== 'temp_token') {
    try {
      const { default: shopify } = await import('./shopify.js');
      const client = new shopify.clients.Graphql({
        session: {
          shop: shopRecord.domain,
          accessToken: shopRecord.accessToken,
        },
      });

      const collectionQuery = `
        query getCollection($id: ID!) {
          collection(id: $id) {
            id
            title
            handle
            products(first: 100) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      `;

      const response = await client.query({
        data: {
          query: collectionQuery,
          variables: { id: collectionId }
        }
      });

      const collection = response.body.data.collection;
      if (collection) {
        collectionTitle = collection.title;
        productsCount = collection.products.edges.length;
      }
    } catch (error) {
      console.error('Error fetching collection details:', error);
    }
  }

  const commission = typeof commissionData === 'number' ? commissionData : commissionData.commission;
  const commissionType = typeof commissionData === 'object' ? commissionData.commissionType : 'percentage';
  const commissionDisplay = commissionType === 'percentage' ? `${commission}%` : `KES ${commission}`;
  
  return { 
    message: `Applied ${commissionDisplay} commission to ${productsCount} products in collection "${collectionTitle}"`,
    updatedProducts: productsCount 
  };
}

export async function setCategoryCommission(shopId, categoryName, commissionData) {
  // For categories, we just bulk apply to all products with that category
  // No separate category commission table needed
  
  const { data: shopRecord } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();

  if (!shopRecord?.accessToken) {
    throw new Error('Shop access token not found');
  }

  // Import shopify dynamically to avoid circular imports
  const { default: shopify } = await import('./shopify.js');

  const client = new shopify.clients.Graphql({
    session: {
      shop: shopRecord.domain,
      accessToken: shopRecord.accessToken,
    },
  });

  // Fetch all products to find ones with this category
  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  const { PRODUCTS_QUERY } = await import('./graphql.js');

  while (hasNextPage && allProducts.length < 500) {
    const response = await client.query({
      data: {
        query: PRODUCTS_QUERY,
        variables: {
          first: 50,
          after: cursor,
          query: null,
        },
      },
    });

    const products = response.body.data.products.edges.map(edge => edge.node);
    allProducts = [...allProducts, ...products];
    
    const pageInfo = response.body.data.products.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  // Filter products by category (using productType as category)
  const categoryProducts = allProducts.filter(product => 
    (product.productType || 'Uncategorized') === categoryName
  );

  // Bulk update product commissions with product details
  if (categoryProducts.length > 0) {
    await Promise.all(categoryProducts.map(product => {
      const productDetails = {
        title: product.title,
        handle: product.handle,
        link: `https://${shopRecord.domain}/products/${product.handle}`
      };
      return setProductCommission(shopId, product.id, commissionData, productDetails);
    }));
  }

  const commission = typeof commissionData === 'number' ? commissionData : commissionData.commission;
  const commissionType = typeof commissionData === 'object' ? commissionData.commissionType : 'percentage';
  const commissionDisplay = commissionType === 'percentage' ? `${commission}%` : `KES ${commission}`;
  
  return { 
    message: `Applied ${commissionDisplay} commission to ${categoryProducts.length} products in category "${categoryName}"`,
    updatedProducts: categoryProducts.length 
  };
}

async function applyCollectionCommissionToProducts(shopId, collectionId, commissionData) {
  // We need to fetch products from Shopify API and then update their commissions
  // This is a bit complex as we need the shop's access token and Shopify client
  const { data: shopRecord } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();

  if (!shopRecord?.accessToken) {
    throw new Error('Shop access token not found');
  }

  // Import shopify dynamically to avoid circular imports
  const { default: shopify } = await import('./shopify.js');

  const client = new shopify.clients.Graphql({
    session: {
      shop: shopRecord.domain,
      accessToken: shopRecord.accessToken,
    },
  });

  // Fetch all products in this collection with details
  const query = `
    query getCollectionProducts($id: ID!, $first: Int!) {
      collection(id: $id) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    }
  `;

  try {
    const response = await client.query({
      data: {
        query,
        variables: { 
          id: collectionId, 
          first: 100 // Shopify's max per request
        }
      }
    });

    const products = response.body.data.collection?.products?.edges || [];
    
    // Bulk update product commissions with product details
    if (products.length > 0) {
      await Promise.all(products.map(edge => {
        const product = edge.node;
        const productDetails = {
          title: product.title,
          handle: product.handle,
          link: `https://${shopRecord.domain}/products/${product.handle}`
        };
        return setProductCommission(shopId, product.id, commissionData, productDetails);
      }));
    }

    return { updatedProducts: products.length };
  } catch (error) {
    console.error('Error applying collection commission to products:', error);
    throw new Error('Failed to apply commission to products in collection');
  }
}

export async function removeCommission(shopId, type, id) {
  if (type === 'product') {
    const { data, error } = await supabase
      .from('product_commissions')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  // Collections don't have separate records to delete since they're just bulk updates
}