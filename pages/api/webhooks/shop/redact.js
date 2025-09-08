import { prisma } from '../../../../lib/prisma';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook authenticity
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    if (hash !== hmac) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract shop data from webhook payload
    const { shop_id, shop_domain } = req.body;
    
    console.log(`[GDPR] Shop data erasure request received for shop: ${shop_domain}`);
    console.log(`[GDPR] Shop ID: ${shop_id}`);
    
    let deletedRecords = {
      shop: 0,
      productCommissions: 0,
      total: 0
    };

    try {
      // Find shop in our database
      const shop = await prisma.shop.findUnique({
        where: { domain: shop_domain }
      });

      if (!shop) {
        console.log(`[GDPR] Shop ${shop_domain} not found in database - already removed`);
        return res.status(200).json({ 
          message: 'Shop not found - no data to redact',
          shop_domain: shop_domain,
          shop_id: shop_id,
          timestamp: new Date().toISOString()
        });
      }

      // Delete all shop-related data in correct order (due to foreign key constraints)
      
      // 1. Delete all product commissions for this shop
      const deletedCommissions = await prisma.productCommission.deleteMany({
        where: { shopId: shop.id }
      });
      deletedRecords.productCommissions = deletedCommissions.count;

      // 2. Delete the shop record itself
      await prisma.shop.delete({
        where: { id: shop.id }
      });
      deletedRecords.shop = 1;

      deletedRecords.total = deletedRecords.shop + deletedRecords.productCommissions;

      console.log(`[GDPR] Shop data erasure completed for ${shop_domain}`);
      console.log(`[GDPR] Deleted records: ${JSON.stringify(deletedRecords)}`);
      
    } catch (dbError) {
      console.error(`[GDPR] Database error during shop erasure for ${shop_domain}:`, dbError);
      
      // If shop doesn't exist, that's fine - data is already gone
      if (dbError.code === 'P2025' || dbError.message?.includes('Record to delete does not exist')) {
        console.log(`[GDPR] Shop ${shop_domain} already removed from database`);
      } else {
        throw dbError; // Re-throw if it's a different error
      }
    }
    
    // Log the erasure request for compliance audit trail
    try {
      console.log(`[GDPR AUDIT] Shop data erasure - Shop: ${shop_domain} (${shop_id}), Records deleted: ${JSON.stringify(deletedRecords)}, Timestamp: ${new Date().toISOString()}`);
    } catch (logError) {
      console.error('Error logging GDPR shop erasure request:', logError);
    }

    // Return confirmation of erasure
    res.status(200).json({ 
      message: 'Shop data erasure completed successfully',
      shop_domain: shop_domain,
      shop_id: shop_id,
      records_deleted: deletedRecords,
      timestamp: new Date().toISOString(),
      note: 'All shop data including commission settings have been permanently removed from our systems'
    });
    
  } catch (error) {
    console.error('Shop data erasure webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error during shop data erasure',
      shop_domain: req.body?.shop_domain,
      shop_id: req.body?.shop_id,
      timestamp: new Date().toISOString()
    });
  }
}

// Disable body parser to get raw body for webhook verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}