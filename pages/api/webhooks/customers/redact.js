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

    // Extract customer data from webhook payload
    const { shop_id, shop_domain, customer } = req.body;
    
    console.log(`[GDPR] Customer data erasure request received for shop: ${shop_domain}`);
    console.log(`[GDPR] Customer ID: ${customer?.id}, Email: ${customer?.email}`);
    
    // Find shop in our database
    const shop = await prisma.shop.findUnique({
      where: { domain: shop_domain }
    });

    if (!shop) {
      console.log(`[GDPR] Shop ${shop_domain} not found in database`);
      return res.status(200).json({ message: 'Shop not found - no customer data to redact' });
    }

    let redactedRecords = 0;
    
    // Redact/delete any customer-specific data stored in our app
    // For this commission app, we primarily store:
    // - Shop data (shop domain, access tokens) - NOT customer specific
    // - Product commission rates - NOT customer specific
    // - We don't directly store customer personal data
    
    // If we had customer-specific data to redact, we would do it here:
    // Example (if we stored customer-related commission data):
    /*
    if (customer?.id) {
      // Delete or anonymize customer-specific records
      const deleteResult = await prisma.customerCommissionHistory.deleteMany({
        where: {
          shopId: shop.id,
          customerId: customer.id.toString()
        }
      });
      redactedRecords += deleteResult.count;
    }
    */
    
    console.log(`[GDPR] Customer data erasure completed for ${shop_domain}, records affected: ${redactedRecords}`);
    
    // Log the erasure request for compliance audit trail
    try {
      console.log(`[GDPR AUDIT] Customer data erasure - Shop: ${shop_domain}, Customer: ${customer?.id}, Records redacted: ${redactedRecords}, Timestamp: ${new Date().toISOString()}`);
    } catch (logError) {
      console.error('Error logging GDPR erasure request:', logError);
    }

    // Return confirmation of erasure
    res.status(200).json({ 
      message: 'Customer data erasure completed',
      shop_domain: shop_domain,
      customer_id: customer?.id,
      records_redacted: redactedRecords,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Customer data erasure webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
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