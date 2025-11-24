# Multi-Tenant SaaS Conversion Feasibility Analysis

## Executive Summary

**Feasibility: HIGH** ✅  
**Estimated Effort: 4-6 months**  
**Complexity: Medium-High**

Your current platform is well-positioned for multi-tenant conversion. The existing Supabase architecture, RLS policies, and role-based system provide a solid foundation. The main work involves adding tenant isolation, custom branding, and enhanced RBAC.

---

## Current Architecture Assessment

### ✅ **Strengths**
1. **Supabase Backend**: PostgreSQL with built-in RLS support
2. **Existing RBAC**: Role system (`user_roles`, `role_permissions`) already in place
3. **Data Model**: Clean separation with `organizer_id` foreign keys
4. **RLS Policies**: Already implemented for security
5. **TypeScript Frontend**: Type-safe, maintainable codebase

### ⚠️ **Gaps to Address**
1. **No Tenant Concept**: All organizers share the same database namespace
2. **No Data Isolation**: RLS policies don't enforce tenant boundaries
3. **No Custom Branding**: Single UI theme for all users
4. **Limited RBAC**: Current system is user-level, not tenant-level
5. **No Billing/Subscription**: No payment or plan management

---

## Required Architectural Changes

### 1. **Database Schema Changes**

#### A. Create Tenant/Organization Table
```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- For subdomain/URL routing
  subdomain TEXT UNIQUE, -- e.g., "acme" for acme.yourplatform.com
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  favicon_url TEXT,
  custom_css TEXT, -- For advanced customization
  
  -- Subscription
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  subscription_id TEXT, -- Stripe/other payment provider ID
  billing_email TEXT,
  
  -- Limits (based on plan)
  max_tournaments INTEGER DEFAULT 5,
  max_team_members INTEGER DEFAULT 10,
  max_storage_mb INTEGER DEFAULT 100,
  
  -- Settings
  settings JSONB DEFAULT '{}', -- Flexible settings storage
  features JSONB DEFAULT '{}', -- Feature flags per tenant
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);
```

#### B. Add Tenant Context to Existing Tables
```sql
-- Add tenant_id to all relevant tables
ALTER TABLE public.tournaments 
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.teams 
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.venues 
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create junction table for tenant members/admins
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
```

#### C. Update RLS Policies for Tenant Isolation
```sql
-- Example: Tenant-isolated tournaments
CREATE POLICY "tenant_isolation_tournaments"
  ON public.tournaments
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.tenant_members 
      WHERE user_id = auth.uid() 
        AND is_active = true
    )
    OR
    -- Allow super admins
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND is_admin = true
    )
  );
```

### 2. **Frontend Architecture Changes**

#### A. Tenant Context Provider
```typescript
// src/contexts/TenantContext.tsx
interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (tenantId: string) => Promise<void>;
  isTenantAdmin: boolean;
  canManageSettings: boolean;
  // ... other permissions
}
```

#### B. Dynamic Branding System
```typescript
// src/hooks/useTenantBranding.ts
export const useTenantBranding = () => {
  const { currentTenant } = useTenant();
  
  useEffect(() => {
    if (currentTenant) {
      // Inject custom CSS
      const styleId = 'tenant-custom-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = currentTenant.custom_css || '';
      
      // Update CSS variables
      document.documentElement.style.setProperty(
        '--primary-color', 
        currentTenant.primary_color
      );
      // ... other theme variables
    }
  }, [currentTenant]);
};
```

#### C. Subdomain Routing
```typescript
// src/utils/tenantRouting.ts
export const getTenantFromSubdomain = (): string | null => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Check if subdomain exists (e.g., acme.yourplatform.com)
  if (parts.length >= 3) {
    return parts[0]; // Return subdomain
  }
  return null; // Main domain
};

// In App.tsx or router
const subdomain = getTenantFromSubdomain();
if (subdomain) {
  // Load tenant-specific data
  // Apply tenant branding
  // Filter routes/features
}
```

### 3. **Enhanced RBAC System**

#### A. Tenant-Level Permissions
```sql
CREATE TABLE public.tenant_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'admin', 'member', 'viewer'
  resource TEXT NOT NULL, -- 'tournaments', 'teams', 'settings'
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
  UNIQUE(tenant_id, role, resource, action)
);

-- Default permissions per role
INSERT INTO public.tenant_permissions (tenant_id, role, resource, action) VALUES
-- Owner: Full access
(NULL, 'owner', 'tournaments', 'manage'),
(NULL, 'owner', 'teams', 'manage'),
(NULL, 'owner', 'settings', 'manage'),
-- Admin: Most access except billing
(NULL, 'admin', 'tournaments', 'manage'),
(NULL, 'admin', 'teams', 'manage'),
-- Member: Limited access
(NULL, 'member', 'tournaments', 'read'),
(NULL, 'member', 'teams', 'read');
```

#### B. Permission Checking Functions
```typescript
// src/hooks/useTenantPermissions.ts
export const useTenantPermissions = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  
  const hasPermission = useCallback((
    resource: string, 
    action: string
  ): boolean => {
    if (!currentTenant || !user) return false;
    
    // Check user's role in tenant
    const userRole = getTenantRole(user.id, currentTenant.id);
    
    // Query permissions table
    return checkPermission(currentTenant.id, userRole, resource, action);
  }, [currentTenant, user]);
  
  return { hasPermission };
};
```

### 4. **Onboarding Flow**

#### A. Tenant Creation Wizard
```typescript
// src/pages/onboarding/CreateTenant.tsx
const CreateTenantWizard = () => {
  const steps = [
    'Basic Info',      // Name, slug
    'Branding',        // Logo, colors
    'Plan Selection',  // Choose subscription
    'Team Setup',      // Invite members
    'Welcome'          // Onboarding complete
  ];
  
  // Multi-step form with validation
  // Create tenant via API
  // Set up initial settings
  // Redirect to tenant dashboard
};
```

#### B. Migration Script for Existing Organizers
```sql
-- Convert existing organizers to tenants
DO $$
DECLARE
  org_record RECORD;
  new_tenant_id UUID;
BEGIN
  FOR org_record IN 
    SELECT DISTINCT organizer_id, name 
    FROM tournaments 
    WHERE organizer_id IS NOT NULL
  LOOP
    -- Create tenant
    INSERT INTO public.tenants (name, slug, created_by)
    VALUES (
      org_record.name || ' Organization',
      lower(regexp_replace(org_record.name, '[^a-zA-Z0-9]', '-', 'g')),
      org_record.organizer_id
    )
    RETURNING id INTO new_tenant_id;
    
    -- Add organizer as owner
    INSERT INTO public.tenant_members (tenant_id, user_id, role, joined_at)
    VALUES (new_tenant_id, org_record.organizer_id, 'owner', NOW());
    
    -- Migrate tournaments
    UPDATE public.tournaments 
    SET tenant_id = new_tenant_id 
    WHERE organizer_id = org_record.organizer_id;
  END LOOP;
END $$;
```

### 5. **Billing & Subscription Integration**

#### A. Stripe Integration
```typescript
// src/services/billing.ts
export const createSubscription = async (
  tenantId: string, 
  planId: string
) => {
  // Create Stripe customer
  // Create subscription
  // Update tenant record
  // Set plan limits
};

export const handleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'customer.subscription.updated':
      // Update tenant subscription status
      break;
    case 'invoice.payment_failed':
      // Suspend tenant access
      break;
  }
};
```

#### B. Plan Limits Enforcement
```typescript
// src/middleware/planLimits.ts
export const checkPlanLimit = async (
  tenantId: string, 
  resource: string
): Promise<boolean> => {
  const tenant = await getTenant(tenantId);
  const plan = getPlanLimits(tenant.plan_type);
  
  switch (resource) {
    case 'tournaments':
      const count = await getTournamentCount(tenantId);
      return count < plan.max_tournaments;
    // ... other resources
  }
};
```

---

## Implementation Phases

### **Phase 1: Foundation (Weeks 1-4)**
- [ ] Create `tenants` table and migration
- [ ] Add `tenant_id` to core tables
- [ ] Create `tenant_members` junction table
- [ ] Update RLS policies for tenant isolation
- [ ] Create TenantContext provider
- [ ] Basic tenant switching UI

### **Phase 2: Data Migration (Weeks 5-6)**
- [ ] Migration script for existing organizers
- [ ] Data validation and testing
- [ ] Rollback procedures
- [ ] Performance testing with tenant isolation

### **Phase 3: Branding System (Weeks 7-8)**
- [ ] Tenant branding fields in database
- [ ] Dynamic CSS injection system
- [ ] Logo/favicon upload and management
- [ ] Color theme customization
- [ ] Branding preview/editor UI

### **Phase 4: Enhanced RBAC (Weeks 9-10)**
- [ ] Tenant-level permissions table
- [ ] Permission checking functions
- [ ] Role management UI
- [ ] Permission matrix UI
- [ ] Audit logging for tenant actions

### **Phase 5: Onboarding (Weeks 11-12)**
- [ ] Tenant creation wizard
- [ ] Plan selection flow
- [ ] Team invitation system
- [ ] Welcome/onboarding dashboard
- [ ] Documentation and help center

### **Phase 6: Billing Integration (Weeks 13-16)**
- [ ] Stripe integration
- [ ] Subscription management
- [ ] Plan limits enforcement
- [ ] Usage tracking
- [ ] Billing dashboard
- [ ] Webhook handlers

### **Phase 7: Subdomain Routing (Weeks 17-18)**
- [ ] Subdomain detection
- [ ] Tenant routing logic
- [ ] DNS configuration guide
- [ ] Wildcard SSL setup
- [ ] Custom domain support (optional)

### **Phase 8: Testing & Optimization (Weeks 19-20)**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation

---

## Technical Considerations

### **Data Isolation Strategy**

**Option 1: Row-Level Security (Recommended)**
- ✅ Uses existing Supabase RLS
- ✅ Single database, easier management
- ✅ Good performance with proper indexes
- ⚠️ Requires careful RLS policy design

**Option 2: Schema Separation**
- ✅ Strongest isolation
- ✅ Easier to scale per tenant
- ❌ Complex migrations
- ❌ Harder to manage

**Recommendation**: Start with RLS, migrate to schema separation only if needed for enterprise clients.

### **Performance Optimization**

1. **Indexes**
```sql
CREATE INDEX idx_tournaments_tenant ON tournaments(tenant_id);
CREATE INDEX idx_tenant_members_composite ON tenant_members(tenant_id, user_id, is_active);
```

2. **Query Optimization**
- Always filter by `tenant_id` first
- Use composite indexes
- Cache tenant data in frontend

3. **Connection Pooling**
- Use Supabase connection pooling
- Consider PgBouncer for high traffic

### **Security Considerations**

1. **RLS Policy Testing**
- Test all CRUD operations
- Verify cross-tenant data leakage prevention
- Regular security audits

2. **API Security**
- Validate tenant context in all API calls
- Rate limiting per tenant
- Audit logging for sensitive operations

3. **Subdomain Security**
- Validate subdomain ownership
- Prevent subdomain hijacking
- CORS configuration

---

## Cost Implications

### **Infrastructure**
- **Database**: Supabase Pro ($25/month) → Scale plan ($599/month) for multi-tenant
- **Storage**: S3/Cloudflare R2 for tenant assets (~$0.023/GB)
- **CDN**: Cloudflare for custom domains (~$20/month)
- **Monitoring**: Sentry/DataDog (~$50-200/month)

### **Third-Party Services**
- **Stripe**: 2.9% + $0.30 per transaction
- **Email**: SendGrid/Mailgun (~$15-50/month)
- **Analytics**: PostHog/Mixpanel (~$0-100/month)

### **Estimated Monthly Costs**
- **Small Scale** (10-50 tenants): $100-300/month
- **Medium Scale** (50-500 tenants): $500-1,500/month
- **Large Scale** (500+ tenants): $2,000-5,000/month

---

## Migration Strategy

### **For Existing Organizers**

1. **Communication**
   - Email all organizers about migration
   - Provide timeline and benefits
   - Offer migration assistance

2. **Automated Migration**
   - Run migration script during maintenance window
   - Create tenant for each organizer
   - Migrate all related data
   - Preserve all relationships

3. **Validation**
   - Verify data integrity
   - Test functionality
   - Get organizer sign-off

4. **Rollout**
   - Gradual rollout (10% → 50% → 100%)
   - Monitor for issues
   - Quick rollback plan

---

## Success Metrics

### **Technical Metrics**
- ✅ Zero data leakage between tenants
- ✅ <200ms query response time
- ✅ 99.9% uptime
- ✅ <1% error rate

### **Business Metrics**
- 📈 Tenant onboarding completion rate
- 📈 Monthly recurring revenue (MRR)
- 📈 Tenant retention rate
- 📈 Feature adoption rate

---

## Risks & Mitigation

### **Risk 1: Data Leakage**
- **Mitigation**: Comprehensive RLS testing, security audits
- **Monitoring**: Regular penetration testing

### **Risk 2: Performance Degradation**
- **Mitigation**: Proper indexing, query optimization, caching
- **Monitoring**: Performance metrics per tenant

### **Risk 3: Complex Migrations**
- **Mitigation**: Phased rollout, extensive testing, rollback plans
- **Monitoring**: Migration success rates

### **Risk 4: Billing Issues**
- **Mitigation**: Robust webhook handling, manual override capabilities
- **Monitoring**: Failed payment alerts

---

## Recommendations

### **Immediate Actions**
1. ✅ **Start with RLS-based isolation** - Leverage existing Supabase infrastructure
2. ✅ **Build tenant context first** - Foundation for all other features
3. ✅ **Implement gradual rollout** - Test with beta tenants first
4. ✅ **Focus on data migration** - Ensure zero data loss

### **Future Enhancements**
- Custom domain support per tenant
- White-label mobile apps
- API access per tenant
- Advanced analytics per tenant
- Multi-region deployment

---

## Conclusion

Converting to multi-tenant SaaS is **highly feasible** with your current architecture. The main work involves:

1. **Database**: Adding tenant isolation (4-6 weeks)
2. **Frontend**: Tenant context and branding (4-6 weeks)
3. **RBAC**: Enhanced permissions (2-4 weeks)
4. **Billing**: Stripe integration (4-6 weeks)
5. **Testing**: Comprehensive QA (2-4 weeks)

**Total Timeline: 4-6 months** with a team of 2-3 developers.

The existing Supabase + React + TypeScript stack is ideal for this conversion, and you already have most of the foundational pieces in place.

