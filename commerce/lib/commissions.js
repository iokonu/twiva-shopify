import { prisma } from './prisma';

export async function getProductCommission(shopId, productId, collectionIds = []) {
  const productCommission = await prisma.productCommission.findUnique({
    where: {
      shopId_productId: {
        shopId,
        productId,
      },
    },
  });

  if (productCommission) {
    return {
      commission: productCommission.commission,
      source: 'product',
      id: productCommission.id,
    };
  }

  if (collectionIds.length > 0) {
    const collectionCommission = await prisma.collectionCommission.findFirst({
      where: {
        shopId,
        collectionId: {
          in: collectionIds,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (collectionCommission) {
      return {
        commission: collectionCommission.commission,
        source: 'collection',
        id: collectionCommission.id,
        collectionId: collectionCommission.collectionId,
      };
    }
  }

  return null;
}

export async function setProductCommission(shopId, productId, commission, productDetails = null) {
  // If product details aren't provided, we need to fetch them from Shopify
  let productTitle = 'Unknown Product';
  let productHandle = '';
  let productLink = '';
  
  if (!productDetails) {
    const shopRecord = await prisma.shop.findUnique({
      where: { id: shopId }
    });

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

  return await prisma.productCommission.upsert({
    where: {
      shopId_productId: {
        shopId,
        productId,
      },
    },
    update: {
      commission,
      productTitle,
      productHandle,
      productLink,
      updatedAt: new Date(),
    },
    create: {
      shopId,
      productId,
      commission,
      productTitle,
      productHandle,
      productLink,
    },
  });
}

export async function setCollectionCommission(shopId, collectionId, commission, applyToProducts = false, collectionDetails = null) {
  // Get collection details if not provided
  let collectionTitle = 'Unknown Collection';
  let collectionHandle = '';
  
  if (!collectionDetails) {
    const shopRecord = await prisma.shop.findUnique({
      where: { id: shopId }
    });

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
          collectionHandle = collection.handle || '';
        }
      } catch (error) {
        console.error('Error fetching collection details:', error);
      }
    }
  } else {
    collectionTitle = collectionDetails.title;
    collectionHandle = collectionDetails.handle || '';
  }

  // First, set the collection commission
  const collectionCommissionResult = await prisma.collectionCommission.upsert({
    where: {
      shopId_collectionId: {
        shopId,
        collectionId,
      },
    },
    update: {
      commission,
      collectionTitle,
      collectionHandle,
      updatedAt: new Date(),
    },
    create: {
      shopId,
      collectionId,
      commission,
      collectionTitle,
      collectionHandle,
    },
  });

  // If applyToProducts is true, also apply to all products in the collection
  if (applyToProducts) {
    await applyCollectionCommissionToProducts(shopId, collectionId, commission);
  }

  return collectionCommissionResult;
}

export async function setCategoryCommission(shopId, categoryName, commission) {
  // For categories, we just bulk apply to all products with that category
  // No separate category commission table needed
  
  const shopRecord = await prisma.shop.findUnique({
    where: { id: shopId }
  });

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
      return setProductCommission(shopId, product.id, commission, productDetails);
    }));
  }

  return { 
    message: `Applied ${commission}% commission to ${categoryProducts.length} products in category "${categoryName}"`,
    updatedProducts: categoryProducts.length 
  };
}

async function applyCollectionCommissionToProducts(shopId, collectionId, commission) {
  // We need to fetch products from Shopify API and then update their commissions
  // This is a bit complex as we need the shop's access token and Shopify client
  const shopRecord = await prisma.shop.findUnique({
    where: { id: shopId }
  });

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
        return setProductCommission(shopId, product.id, commission, productDetails);
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
    return await prisma.productCommission.delete({
      where: { id },
    });
  } else if (type === 'collection') {
    return await prisma.collectionCommission.delete({
      where: { id },
    });
  }
}