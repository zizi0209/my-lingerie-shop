 # Documentation Deployment Guide
 
 Hướng dẫn deploy Documentation site lên Vercel.
 
 ## 📋 Prerequisites
 
 - GitHub account
 - Vercel account (free tier OK)
 - Documentation code đã push lên GitHub
 
 ## 🚀 Deploy Steps
 
 ### 1. Push to GitHub
 
 ```bash
 git add documentation/
 git commit -m "docs: add Docusaurus documentation site"
 git push origin master
 ```
 
 ### 2. Import to Vercel
 
 1. Vào https://vercel.com
 2. Click **Add New Project**
 3. Import repository `my-lingerie-shop`
 4. Vercel sẽ auto-detect là monorepo
 
 ### 3. Configure Project
 
 **Root Directory:**
 ```
 documentation
 ```
 
 **Framework Preset:**
 ```
 Docusaurus
 ```
 
 **Build Settings:**
 - Build Command: `npm run build`
 - Output Directory: `build`
 - Install Command: `npm install`
 
 ### 4. Environment Variables
 
 Không cần env vars cho documentation.
 
 ### 5. Deploy
 
 Click **Deploy** và đợi ~2-3 phút.
 
 ## 🔗 Custom Domain (Optional)
 
 ### Vercel Subdomain
 
 Mặc định: `https://my-lingerie-shop-docs.vercel.app`
 
 ### Custom Domain
 
 1. Vào Project Settings → Domains
 2. Add domain: `docs.yourdomain.com`
 3. Update DNS records theo hướng dẫn Vercel
 4. Vercel tự động cấp SSL certificate
 
 ## 📝 Update Documentation
 
 ### Auto Deploy
 
 Mỗi khi push code lên GitHub:
 
 ```bash
 git add documentation/
 git commit -m "docs: update content"
 git push
 ```
 
 Vercel sẽ tự động rebuild và deploy.
 
 ### Preview Deployments
 
 Mỗi Pull Request sẽ có preview URL riêng để review trước khi merge.
 
 ## 🔍 Verify Deployment
 
 1. Check deployment status: https://vercel.com/dashboard
 2. Mở docs site: `https://your-docs-url.vercel.app`
 3. Test navigation giữa các sections:
    - User Guide
    - Developer Guide
    - API Reference
 4. Test language switcher (VI/EN)
 5. Test search functionality
 
 ## 🛠️ Troubleshooting
 
 ### Build Failed
 
 ```bash
 # Test build locally
 cd documentation
 npm run build
 
 # Fix errors, then push again
 ```
 
 ### Missing Pages
 
 Check `sidebars.ts` - tất cả pages trong sidebar phải tồn tại.
 
 ### Broken Links
 
 Docusaurus sẽ warn về broken links khi build. Fix theo error messages.
 
 ## 📊 Analytics (Optional)
 
 ### Google Analytics
 
 Update `docusaurus.config.ts`:
 
 ```typescript
 presets: [
   [
     'classic',
     {
       gtag: {
         trackingID: 'G-XXXXXXXXXX',
       },
     },
   ],
 ],
 ```
 
 ### Vercel Analytics
 
 Enable trong Vercel dashboard → Analytics tab.
 
 ## 🔗 Integration with Dashboard
 
 Sau khi deploy, thêm link docs vào dashboard:
 
 **Frontend Navigation:**
 
 ```tsx
 // frontend/src/components/Navbar.tsx
 <Link href="https://docs.yourdomain.com">
   Documentation
 </Link>
 ```
 
 ## ✅ Checklist
 
 - [ ] Documentation build thành công locally
 - [ ] Code đã push lên GitHub
 - [ ] Project đã import vào Vercel
 - [ ] Root directory = `documentation`
 - [ ] Deploy thành công
 - [ ] Test mở docs site
 - [ ] Test navigation
 - [ ] Test language switcher
 - [ ] (Optional) Custom domain configured
 - [ ] Link docs từ main dashboard
 
 ## 🎉 Done!
 
 Documentation site của bạn đã live tại: `https://your-docs-url.vercel.app`
 
 ---
 
 **Next Steps:**
 - Di chuyển nội dung từ `/docs` folder cũ vào Docusaurus
 - Thêm screenshots và diagrams
 - Viết chi tiết API endpoints
 - Thêm code examples
