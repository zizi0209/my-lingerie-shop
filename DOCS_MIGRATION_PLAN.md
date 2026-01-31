 # Documentation Migration Plan
 
 ## Goal
 Migrate all valuable content from `/docs` folder into `/documentation` (Docusaurus site), then delete `/docs`.
 
 ## Current Situation
 
 - `/documentation` - Docusaurus site (deployed on Vercel)
 - `/docs` - Legacy markdown files (105+ files, not organized)
 
 ## What Already Exists in `/documentation/docs/`:
 
 1. **API Reference** (already migrated):
    - `api-reference/introduction.md` - Auth, rate limiting, pagination
    - `api-reference/products.md` - Complete Products CRUD
    - `api-reference/orders.md` - Orders & checkout
    - `api-reference/size-system.md` - Size System API
    - `api-reference/dashboard.md` - Analytics API
 
 2. **Developer Guide**:
    - `developer-guide/architecture/overview.md` - System architecture
    - `developer-guide/features/size-system.md` - Size system features
    - `developer-guide/deployment/vercel.md` - Vercel deployment
 
 3. **User Guide**:
    - `user-guide/getting-started/introduction.md`
    - `user-guide/getting-started/screenshots.md`
    - `user-guide/size-system/overview.md`
 
 ## Files to Migrate from `/docs`:
 
 ### High Priority - Useful Developer Content
 
 1. **Quick Reference** → Add to Developer Guide
    - `/docs/QUICK_REFERENCE.md` → `documentation/docs/developer-guide/quick-reference.md`
 
 2. **Feature Documentation** → Enhance existing size-system doc
    - `/docs/FEATURE_HOW_IT_WORKS.md` → Merge into `developer-guide/features/size-system.md`
    - `/docs/ENTERPRISE_SIZE_SYSTEM.md` → Extract unique content
    - `/docs/LINGERIE_SIZE_SYSTEM_V2.md` → Extract unique content
 
 3. **Frontend Integration** → New guide
    - `/docs/FRONTEND_INTEGRATION.md` → `documentation/docs/developer-guide/frontend-integration.md`
 
 4. **Setup Guides** → New setup section
    - `/docs/setup/CLOUDINARY_GUIDE.md` → `documentation/docs/developer-guide/setup/cloudinary.md`
    - `/docs/setup/RESEND_SETUP_GUIDE.md` → `documentation/docs/developer-guide/setup/email.md`
    - `/docs/setup/LEXICAL_INTEGRATION.md` → `documentation/docs/developer-guide/setup/rich-editor.md`
 
 5. **API Guides** → Merge with existing API docs
    - `/docs/api/DASHBOARD_API_GUIDE.md` → Already migrated to `api-reference/dashboard.md`
    - `/docs/api/MEDIA_API_GUIDE.md` → Add to `api-reference/` as new file
    - `/docs/api/PRODUCT_POST_LINKING_GUIDE.md` → Merge into products.md
 
 ### Medium Priority - Historical/Archive
 
 1. **Implementation Logs** → Skip (historical only)
    - `/docs/archive/PHASE1_IMPLEMENTATION.md` through `PHASE7_IMPLEMENTATION.md`
    - `/docs/IMPLEMENTATION_COMPLETE.md`
    - `/docs/MIGRATION_COMPLETED.md`
 
 2. **Bug Fixes** → Skip (historical)
    - `/docs/fixes/SESSION_EXPIRED_FIX.md`
    - `/docs/FIXED_404_SIZE_SYSTEM_ROUTES.md`
    - `/docs/ISSUE_FIXED_NO_PRODUCTS_DISPLAY.md`
 
 3. **Testing Guides** → Keep in docs for now (referenced by developers)
    - `/docs/testing/` - Keep as reference
 
 ### Low Priority - Skip
 
 - `/docs/TODO.md` - Outdated task list
 - `/docs/AGENTS.md` - AI coding guidelines (keep separate)
 - `/docs/PROJECT_ORGANIZATION_SUMMARY.md` - Covered in architecture
 
 ## Migration Strategy
 
 ### Phase 1: Migrate Core Documentation
 
 1. Create Quick Reference guide
 2. Enhance Size System documentation with examples from FEATURE_HOW_IT_WORKS
 3. Add Frontend Integration guide
 4. Add Media API documentation
 
 ### Phase 2: Add Setup Guides
 
 1. Create setup section in developer-guide
 2. Migrate Cloudinary setup
 3. Migrate Email (Resend) setup
 4. Migrate Rich Editor (Lexical) setup
 
 ### Phase 3: Update Sidebar
 
 Update `documentation/sidebars.js` to include new sections.
 
 ### Phase 4: Delete /docs
 
 After verification, delete entire `/docs` folder.
 
 ## New Documentation Structure
 
 ```
 documentation/docs/
 ├── api-reference/
 │   ├── introduction.md
 │   ├── products.md
 │   ├── orders.md
 │   ├── size-system.md
 │   ├── dashboard.md
 │   └── media.md                    # NEW
 │
 ├── developer-guide/
 │   ├── intro.md
 │   ├── quick-reference.md          # NEW
 │   ├── frontend-integration.md     # NEW
 │   ├── architecture/
 │   │   └── overview.md
 │   ├── features/
 │   │   └── size-system.md          # ENHANCED
 │   ├── deployment/
 │   │   └── vercel.md
 │   └── setup/                      # NEW SECTION
 │       ├── cloudinary.md
 │       ├── email.md
 │       └── rich-editor.md
 │
 └── user-guide/
     └── ...
 ```
 
 ## Files to Keep (Not Migrate)
 
 These files stay in root or are referenced:
 - `README.md` - Project main README
 - `DOCUMENTATION_COMPLETE.md` - Summary of documentation work
 
 ## Success Criteria
 
 - [ ] All valuable content migrated to Docusaurus
 - [ ] No broken links in documentation site
 - [ ] Documentation builds successfully
 - [ ] /docs folder deleted
 - [ ] Git history preserved
 
 ## Commands
 
 ```bash
 # After migration complete
 git add documentation/
 git commit -m "docs: migrate content from /docs to Docusaurus"
 
 git rm -rf docs/
 git commit -m "docs: remove legacy docs folder"
 
 git push
 ```
