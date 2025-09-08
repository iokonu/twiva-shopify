# 🚀 Commission Manager - Vercel + Supabase Deployment Guide

This guide will walk you through deploying your Shopify Commission Manager app to production using Vercel and Supabase.

## 📋 Prerequisites

- GitHub account (for Vercel deployment)
- Supabase account (free tier)
- Vercel account (free tier)  
- Shopify Partner account with your app configured

## 🗄️ Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Choose your organization
4. Fill in project details:
   - **Name**: `commission-manager` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free
4. Click **"Create new project"**
5. Wait for project to be created (~2 minutes)

### 1.2 Get Database Connection Strings
1. In your Supabase project, go to **Settings** → **Database**
2. Scroll down to **"Connection string"**
3. Copy both connection strings:
   - **Connection pooling** (for `DATABASE_URL`)
   - **Direct connection** (for `DIRECT_URL`)

Example format:
```
DATABASE_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.compute.amazonaws.com:5432/postgres"
```

⚠️ **Important**: Replace `[YOUR-PASSWORD]` with your actual database password!

### 1.3 Test Local Connection (Optional)
Update your `.env.local` temporarily to test the connection:
```bash
# Backup your current DATABASE_URL
cp .env.local .env.local.backup

# Update with Supabase URLs (replace with your actual URLs)
DATABASE_URL="your_supabase_pooling_url_here"
DIRECT_URL="your_supabase_direct_url_here"

# Test the connection
npx prisma db push

# Restore local config
mv .env.local.backup .env.local
```

## 🚀 Step 2: Deploy to Vercel

### 2.1 Push Code to GitHub
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Push to GitHub (create repo first on github.com)
git remote add origin https://github.com/YOUR_USERNAME/commission-manager.git
git branch -M main
git push -u origin main
```

### 2.2 Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your repository
4. Configure project:
   - **Project Name**: `commission-manager` (or preferred name)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (keep default)
5. **Don't deploy yet!** Click **"Environment Variables"** first

### 2.3 Configure Environment Variables
Add these environment variables in Vercel:

```bash
# Database URLs (from Supabase)
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.compute.amazonaws.com:5432/postgres

# Shopify App Credentials (from your Partner Dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_products,write_products,read_collections
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key_here

# This will be filled after first deployment
SHOPIFY_APP_URL=https://your-app-name.vercel.app
```

6. Click **"Deploy"**
7. Wait for deployment to complete (~2-3 minutes)

### 2.4 Get Production URL
After deployment:
1. Copy your production URL (e.g., `https://commission-manager-abc123.vercel.app`)
2. Go back to **Settings** → **Environment Variables**
3. Update `SHOPIFY_APP_URL` with your production URL
4. **Redeploy** by going to **Deployments** tab and clicking **"Redeploy"**

## 🗄️ Step 3: Set Up Production Database

### 3.1 Run Database Migrations
Once deployed, your app needs database tables. You have two options:

**Option A: Via Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Run migrations in production
vercel env pull .env.production
DATABASE_URL="your_supabase_url" npx prisma migrate deploy
```

**Option B: Via Local Prisma Studio**
```bash
# Temporarily use production DB URL
DATABASE_URL="your_supabase_pooling_url" npx prisma db push
```

### 3.2 Verify Database Setup
1. Go to your Supabase project dashboard
2. Click **"Table Editor"**
3. You should see two tables:
   - `shops`
   - `product_commissions`

## 🔧 Step 4: Update Shopify Partner Dashboard

### 4.1 Update App URLs
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Navigate to **Apps** → Your commission app
3. Go to **App setup**
4. Update URLs:
   ```
   App URL: https://your-app-name.vercel.app
   Allowed redirection URL(s): 
   - https://your-app-name.vercel.app
   - https://your-app-name.vercel.app/api/auth/callback
   ```

### 4.2 Configure GDPR Webhook URLs
In the **Compliance webhooks** section:
```
Customer data request endpoint:
https://your-app-name.vercel.app/api/webhooks/customers/data_request

Customer data erasure endpoint:
https://your-app-name.vercel.app/api/webhooks/customers/redact

Shop data erasure endpoint:
https://your-app-name.vercel.app/api/webhooks/shop/redact
```

### 4.3 Save Configuration
Click **"Save"** in the Shopify Partner Dashboard.

## 🧪 Step 5: Test Your Production App

### 5.1 Install in Development Store
1. In Shopify Partners, go to **Test your app**
2. Select a development store
3. Click **"Install app"**
4. The app should redirect to your production URL

### 5.2 Test Key Features
- ✅ Authentication flow works
- ✅ Products load correctly
- ✅ Commission settings save properly
- ✅ Categories and collections work
- ✅ Overview statistics display correctly

### 5.3 Test GDPR Webhooks (Optional)
```bash
# Test customer data request
curl -X POST https://your-app-name.vercel.app/api/webhooks/customers/data_request \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: test" \
  -d '{"shop_domain": "test.myshopify.com", "customer": {"id": 123}}'

# Should return customer data (empty for this app)
```

## 🔒 Step 6: Security & Environment Setup

### 6.1 Add Webhook Secret (Optional but Recommended)
1. In Vercel dashboard, add environment variable:
   ```
   SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
   ```
2. Generate a secure secret:
   ```bash
   openssl rand -hex 32
   ```

### 6.2 Configure Prisma Connection Pooling
Your `vercel.json` already has proper timeout settings. No changes needed!

## 📊 Step 7: Monitor and Maintain

### 7.1 Monitor Logs
- **Vercel Logs**: Go to your project → Functions → View logs
- **Supabase Logs**: Project dashboard → Logs

### 7.2 Database Management
- Use Supabase dashboard for database monitoring
- Connection pooling is automatic
- Free tier includes 500MB storage

### 7.3 Scaling Considerations
**When you need to upgrade:**
- Vercel: $20/month for Pro (better performance, analytics)
- Supabase: $25/month for Pro (8GB storage, better support)

## 🎉 Deployment Complete!

Your Commission Manager app is now live in production:
- ✅ **Frontend/API**: Deployed on Vercel
- ✅ **Database**: Hosted on Supabase  
- ✅ **GDPR Compliant**: All webhooks configured
- ✅ **Shopify Ready**: App URLs configured in Partner Dashboard

## 🔧 Troubleshooting

### Common Issues:

**Database Connection Errors:**
```bash
# Test connection with Prisma
DATABASE_URL="your_url" npx prisma db push
```

**Environment Variables Not Loading:**
- Ensure all variables are set in Vercel dashboard
- Redeploy after adding new variables
- Check variable names match exactly

**Shopify Authentication Issues:**
- Verify `SHOPIFY_APP_URL` matches your Vercel deployment URL
- Check redirect URLs in Partner Dashboard
- Ensure API key/secret are correct

**GDPR Webhook Failures:**
- Test endpoints manually with curl
- Check Vercel function logs for errors
- Verify HMAC verification is working

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase database connectivity  
3. Verify all environment variables are set
4. Test locally first with production database URLs

Your app is now production-ready! 🎉