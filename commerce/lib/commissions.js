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

export async function setProductCommission(shopId, productId, commission) {
  return await prisma.productCommission.upsert({
    where: {
      shopId_productId: {
        shopId,
        productId,
      },
    },
    update: {
      commission,
      updatedAt: new Date(),
    },
    create: {
      shopId,
      productId,
      commission,
    },
  });
}

export async function setCollectionCommission(shopId, collectionId, commission) {
  return await prisma.collectionCommission.upsert({
    where: {
      shopId_collectionId: {
        shopId,
        collectionId,
      },
    },
    update: {
      commission,
      updatedAt: new Date(),
    },
    create: {
      shopId,
      collectionId,
      commission,
    },
  });
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