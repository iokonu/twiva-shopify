export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const privacyPolicy = {
    app_name: "Commission Manager",
    last_updated: "2024-09-05",
    version: "1.0",
    
    data_collection: {
      description: "This app collects and processes the following data types to provide commission management services:",
      
      shop_data: {
        collected: [
          "Shop domain",
          "Shop access tokens (encrypted)",
          "Shop installation timestamp"
        ],
        purpose: "Authentication and API access to manage your store's product commissions",
        retention: "Data is retained while the app is installed on your store"
      },
      
      product_data: {
        collected: [
          "Product IDs",
          "Product titles",
          "Product handles",
          "Product prices",
          "Product types (categories)",
          "Commission rates and types set by store owner"
        ],
        purpose: "To calculate and manage commission rates for products and categories",
        retention: "Commission data is retained while the app is installed and for up to 30 days after uninstallation for backup purposes"
      },
      
      customer_data: {
        collected: "None - This app does not collect, store, or process customer personal information",
        note: "The app accesses product pricing data through Shopify's API but does not store customer orders, personal details, or payment information"
      }
    },
    
    data_sharing: {
      third_parties: "None - Data is not shared with third parties",
      shopify: "The app communicates with Shopify's API only to read product information and manage commission settings within your store"
    },
    
    data_security: {
      encryption: "All access tokens are encrypted at rest",
      transmission: "All data transmission uses HTTPS encryption",
      access_control: "Data access is restricted to authorized application functions only"
    },
    
    gdpr_compliance: {
      customer_data_requests: {
        endpoint: "/api/webhooks/customers/data_request",
        description: "Handles customer data access requests - returns empty data as no customer PII is stored"
      },
      customer_data_erasure: {
        endpoint: "/api/webhooks/customers/redact",
        description: "Handles customer data deletion requests - confirms no customer data to delete"
      },
      shop_data_erasure: {
        endpoint: "/api/webhooks/shop/redact",
        description: "Handles complete shop data deletion upon app uninstallation or GDPR request"
      }
    },
    
    user_rights: {
      access: "Store owners can view all their commission data within the app interface",
      correction: "Commission settings can be updated or corrected at any time through the app",
      deletion: "All data is automatically deleted when the app is uninstalled, or upon request via GDPR webhooks",
      portability: "Commission data can be exported via the app interface or API"
    },
    
    contact: {
      data_protection_officer: "For privacy inquiries, contact: privacy@yourcompany.com",
      support: "For technical support: support@yourcompany.com"
    },
    
    updates: {
      notification: "Users will be notified of privacy policy changes through the app interface",
      effective_date: "Changes take effect 30 days after notification"
    }
  };

  // Return as JSON for API consumption
  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json(privacyPolicy);
  }

  // Return as HTML for human-readable format
  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Commission Manager - Privacy Policy</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        .section { margin-bottom: 25px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
        .important { background-color: #e8f6f3; padding: 15px; border-left: 4px solid #27ae60; margin: 15px 0; }
        .endpoint { font-family: monospace; background-color: #f8f9fa; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>Commission Manager - Privacy Policy</h1>
      <p><strong>Last Updated:</strong> ${privacyPolicy.last_updated}</p>
      <p><strong>Version:</strong> ${privacyPolicy.version}</p>
      
      <div class="important">
        <strong>Important:</strong> This app does not collect, store, or process customer personal information. 
        We only manage commission settings for your store's products.
      </div>

      <div class="section">
        <h2>Data We Collect</h2>
        
        <h3>Shop Information</h3>
        <ul>
          <li>Shop domain and access tokens (encrypted)</li>
          <li>Shop installation timestamp</li>
        </ul>
        
        <h3>Product Information</h3>
        <ul>
          <li>Product IDs, titles, and handles</li>
          <li>Product prices and categories</li>
          <li>Commission rates set by you</li>
        </ul>
        
        <h3>Customer Information</h3>
        <p><strong>None collected.</strong> This app does not store any customer personal data.</p>
      </div>

      <div class="section">
        <h2>How We Use Your Data</h2>
        <p>We use the collected data solely to:</p>
        <ul>
          <li>Authenticate with your Shopify store</li>
          <li>Display and manage commission rates</li>
          <li>Calculate commission amounts for your products</li>
        </ul>
      </div>

      <div class="section">
        <h2>GDPR Compliance</h2>
        <p>We maintain the following endpoints for data privacy compliance:</p>
        <ul>
          <li><strong>Customer data request:</strong> <span class="endpoint">/api/webhooks/customers/data_request</span></li>
          <li><strong>Customer data erasure:</strong> <span class="endpoint">/api/webhooks/customers/redact</span></li>
          <li><strong>Shop data erasure:</strong> <span class="endpoint">/api/webhooks/shop/redact</span></li>
        </ul>
      </div>

      <div class="section">
        <h2>Your Rights</h2>
        <ul>
          <li><strong>Access:</strong> View all your data within the app</li>
          <li><strong>Correction:</strong> Update commission settings anytime</li>
          <li><strong>Deletion:</strong> Automatic deletion when app is uninstalled</li>
        </ul>
      </div>

      <div class="section">
        <h2>Contact Us</h2>
        <p>For privacy inquiries: <a href="mailto:privacy@yourcompany.com">privacy@yourcompany.com</a></p>
        <p>For support: <a href="mailto:support@yourcompany.com">support@yourcompany.com</a></p>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(htmlResponse);
}