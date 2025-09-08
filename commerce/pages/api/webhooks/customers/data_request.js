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
    const { shop_id, shop_domain, orders_requested, customer } = req.body;
    
    console.log(`[GDPR] Customer data request received for shop: ${shop_domain}`);
    console.log(`[GDPR] Customer ID: ${customer?.id}, Email: ${customer?.email}`);
    
    // Find shop in our database
    const shop = await prisma.shop.findUnique({
      where: { domain: shop_domain }
    });

    if (!shop) {
      console.log(`[GDPR] Shop ${shop_domain} not found in database`);
      return res.status(200).json({ message: 'Shop not found - no data to return' });
    }

    // Collect all customer-related data from our app
    const customerData = {
      shop_domain: shop_domain,
      customer_id: customer?.id,
      customer_email: customer?.email,
      data_collected: {
        // Commission data related to customer orders/products
        product_commissions: [],
        metadata: {
          app_name: 'Commission Manager',
          data_collection_purpose: 'Commission tracking and calculation',
          retention_period: 'Data retained as long as shop subscription is active'
        }
      }
    };

    // If we stored any customer-specific data (which we currently don't), 
    // we would query it here and add to customerData.data_collected
    
    // For this commission app, we primarily store:
    // - Shop data (shop domain, access tokens)
    // - Product commission rates (no customer PII)
    // - We don't directly store customer personal data
    
    console.log(`[GDPR] Customer data request processed for ${shop_domain}`);
    
    // Log the request for compliance audit trail
    try {
      // You might want to create a GDPR request log table
      console.log(`[GDPR AUDIT] Customer data request - Shop: ${shop_domain}, Customer: ${customer?.id}, Timestamp: ${new Date().toISOString()}`);
    } catch (logError) {
      console.error('Error logging GDPR request:', logError);
    }

    // Return customer data (empty in our case since we don't store customer PII)
    res.status(200).json(customerData);
    
  } catch (error) {
    console.error('Customer data request webhook error:', error);
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