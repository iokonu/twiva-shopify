# GDPR Compliance Webhooks Setup Guide

This document explains how to configure the mandatory GDPR compliance webhooks required for Shopify public apps.

## 🔧 Implementation Complete

The following webhook endpoints have been implemented and are ready to use:

### 1. Customer Data Request Endpoint
- **URL**: `https://your-app-domain.ngrok.io/api/webhooks/customers/data_request`
- **Purpose**: Handles customer requests to access their personal data (GDPR Article 15)
- **Response**: Returns any customer data stored by the app (currently none for this commission app)

### 2. Customer Data Erasure Endpoint
- **URL**: `https://your-app-domain.ngrok.io/api/webhooks/customers/redact`
- **Purpose**: Handles customer requests to delete their personal data (GDPR Article 17)
- **Response**: Confirms deletion of customer data (currently none stored)

### 3. Shop Data Erasure Endpoint  
- **URL**: `https://your-app-domain.ngrok.io/api/webhooks/shop/redact`
- **Purpose**: Handles complete shop data deletion when store uninstalls app
- **Response**: Deletes all shop data including commission settings

## 📝 Shopify Partner Dashboard Configuration

To configure these webhooks in your Shopify Partner Dashboard:

### Step 1: Access Your App Settings
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Navigate to **Apps** → Your Commission Manager app
3. Click **App setup** tab

### Step 2: Configure Compliance Webhooks
In the "Compliance webhooks" section, add the following URLs:

```
Customer data request endpoint:
https://your-ngrok-url.ngrok-free.app/api/webhooks/customers/data_request

Customer data erasure endpoint:  
https://your-ngrok-url.ngrok-free.app/api/webhooks/customers/redact

Shop data erasure endpoint:
https://your-ngrok-url.ngrok-free.app/api/webhooks/shop/redact
```

### Step 3: Update URLs for Production
When deploying to production, replace the ngrok URLs with your production domain:

```
https://your-production-domain.com/api/webhooks/customers/data_request
https://your-production-domain.com/api/webhooks/customers/redact
https://your-production-domain.com/api/webhooks/shop/redact
```

## 🔒 Security Features

### Webhook Verification
All endpoints include:
- **HMAC verification** using Shopify webhook secrets
- **Request method validation** (POST only)
- **Error handling** with proper HTTP status codes
- **Audit logging** for compliance tracking

### Data Handling
- **Customer data**: App stores NO customer personal information
- **Shop data**: Only commission settings and shop authentication data
- **Automatic cleanup**: All data deleted when app is uninstalled

## 📊 Privacy Policy Endpoint

An additional privacy policy endpoint is available at:
- **URL**: `https://your-app-domain.com/api/privacy-policy`
- **Format**: Returns HTML for browsers, JSON for API requests
- **Purpose**: Documents data collection and processing practices

## 🧪 Testing the Webhooks

### Local Testing with ngrok
1. Ensure your development server is running on port 3000
2. Your current ngrok URL: `https://6c5fe874b833.ngrok-free.app`
3. Test endpoints:
   ```
   https://6c5fe874b833.ngrok-free.app/api/webhooks/customers/data_request
   https://6c5fe874b833.ngrok-free.app/api/webhooks/customers/redact
   https://6c5fe874b833.ngrok-free.app/api/webhooks/shop/redact
   ```

### Testing Customer Data Request
```bash
curl -X POST https://6c5fe874b833.ngrok-free.app/api/webhooks/customers/data_request \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: test-hmac" \
  -d '{
    "shop_domain": "test-shop.myshopify.com",
    "customer": {
      "id": 123456,
      "email": "customer@example.com"
    }
  }'
```

### Testing Shop Data Erasure
```bash
curl -X POST https://6c5fe874b833.ngrok-free.app/api/webhooks/shop/redact \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: test-hmac" \
  -d '{
    "shop_domain": "test-shop.myshopify.com",
    "shop_id": 12345
  }'
```

## 📋 Compliance Checklist

- ✅ **Customer data request endpoint** implemented
- ✅ **Customer data erasure endpoint** implemented  
- ✅ **Shop data erasure endpoint** implemented
- ✅ **Webhook verification** with HMAC signatures
- ✅ **Privacy policy** endpoint available
- ✅ **Audit logging** for all GDPR requests
- ✅ **No customer PII stored** by the application
- ✅ **Automatic data cleanup** on app uninstallation

## 🚀 Next Steps

1. **Update Partner Dashboard**: Add the webhook URLs to your app configuration
2. **Test webhooks**: Verify endpoints work with your ngrok setup
3. **Deploy to production**: Replace ngrok URLs with production domain
4. **Submit for review**: Your app now meets GDPR compliance requirements

## 📞 Support

If you need help with webhook configuration:
- Check server logs for detailed error messages
- Verify HMAC signatures are correctly calculated
- Ensure webhook URLs are accessible from Shopify's servers
- Contact Shopify Partner Support if webhook verification fails

---

**Important**: These endpoints are mandatory for public Shopify apps and must be configured before your app can be approved for the Shopify App Store.