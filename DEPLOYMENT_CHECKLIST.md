# 📋 Deployment Checklist

Use this checklist to ensure you complete all deployment steps correctly.

## 🗄️ Database Setup
- [ ] Create Supabase project
- [ ] Copy DATABASE_URL (connection pooling)
- [ ] Copy DIRECT_URL (direct connection)
- [ ] Test connection locally (optional)

## 🚀 Vercel Deployment
- [ ] Push code to GitHub
- [ ] Import repository in Vercel
- [ ] Configure environment variables:
  - [ ] `DATABASE_URL`
  - [ ] `DIRECT_URL` 
  - [ ] `SHOPIFY_API_KEY`
  - [ ] `SHOPIFY_API_SECRET`
  - [ ] `SHOPIFY_SCOPES`
  - [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY`
  - [ ] `SHOPIFY_APP_URL` (update after first deployment)
- [ ] Deploy project
- [ ] Update `SHOPIFY_APP_URL` with production URL
- [ ] Redeploy

## 🗄️ Database Migration
- [ ] Run `prisma migrate deploy` in production
- [ ] Verify tables created in Supabase dashboard

## 🔧 Shopify Partner Dashboard
- [ ] Update App URL to production URL
- [ ] Update Allowed redirection URLs
- [ ] Configure GDPR webhook URLs:
  - [ ] Customer data request endpoint
  - [ ] Customer data erasure endpoint  
  - [ ] Shop data erasure endpoint
- [ ] Save configuration

## 🧪 Testing
- [ ] Install app in development store
- [ ] Test authentication flow
- [ ] Test commission settings
- [ ] Test all tabs (Overview, Products, Collections, Categories, Commissions)
- [ ] Test GDPR webhooks (optional)

## 📊 Final Verification
- [ ] App loads without errors
- [ ] Database operations work
- [ ] All features functional
- [ ] GDPR compliance endpoints respond
- [ ] Ready for production use!

---

**Next Steps After Deployment:**
1. Submit app for Shopify App Store review (if going public)
2. Monitor logs and performance
3. Set up analytics/monitoring
4. Plan feature updates