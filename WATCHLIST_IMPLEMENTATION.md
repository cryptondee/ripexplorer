# 🔐 Watchlist/Favorites System Implementation Roadmap

## Overview
Implementing a secure PIN-based watchlist system that allows users to save favorite cards with notifications for price changes and new listings. Uses hybrid authentication (username + PIN) for persistence without traditional accounts.

## 🎯 Goals
- Zero-friction user experience (no email/passwords)
- Bank-level security for data protection
- Persistent favorites across browser sessions
- Real-time notifications for price changes
- Modular, DRY architecture using existing patterns

---

## 📋 Implementation Phases

### ✅ Phase 0: Planning & Architecture
- [x] Design security architecture
- [x] Plan database schema
- [x] Define component integration strategy
- [x] Create implementation roadmap

---

### 🔒 Phase 1: Core Authentication (3 days)
**Security-first foundation with PIN-based auth**

#### Database Schema
```prisma
model SecureUserSession {
  id                 String   @id @default(cuid())
  browserFingerprint String   
  claimedUsername    String   
  pinHash            String   // bcrypt hash (12+ rounds)
  salt               String   // unique salt per user
  sessionToken       String?  // current valid JWT
  tokenExpiry        DateTime?
  failedAttempts     Int      @default(0)
  lastFailedAttempt  DateTime?
  lockedUntil        DateTime? // rate limiting lockout
  encryptionKey      String   // AES-256 key for user data
  createdAt          DateTime @default(now())
  lastSeen           DateTime @updatedAt
  
  @@unique([browserFingerprint, claimedUsername])
  @@index([sessionToken])
}
```

#### Tasks
- [ ] **1.1**: Create Prisma schema additions
- [ ] **1.2**: Create `securityService.ts` with PIN hashing/validation
- [ ] **1.3**: Implement rate limiting (5 attempts = 30min lockout)
- [ ] **1.4**: Create JWT session management
- [ ] **1.5**: Add AES-256 data encryption utilities
- [ ] **1.6**: Create `/api/auth/claim-profile` endpoint
- [ ] **1.7**: Create `/api/auth/validate-session` endpoint
- [ ] **1.8**: Add security middleware for all auth endpoints

#### Files to Create/Modify
- `prisma/schema.prisma` - Add SecureUserSession model
- `src/lib/server/services/securityService.ts` - Core security functions
- `src/routes/api/auth/claim-profile/+server.ts` - Profile claiming endpoint
- `src/routes/api/auth/validate-session/+server.ts` - Session validation
- `src/routes/api/auth/logout/+server.ts` - Secure logout

---

### 🎨 Phase 2: Secure Components (2 days) 
**User interface with security UX**

#### Components to Create
```typescript
// Profile claiming modal with PIN entry
ProfileClaimModal.svelte

// PIN entry component with security validation
PinEntry.svelte

// Authentication state management
AuthenticationPrompt.svelte

// Session status indicator
SessionStatus.svelte
```

#### Tasks
- [ ] **2.1**: Create `ProfileClaimModal.svelte` with PIN entry
- [ ] **2.2**: Add PIN strength validation and UX feedback
- [ ] **2.3**: Implement rate limiting UI (lockout countdown)
- [ ] **2.4**: Create browser fingerprint utility
- [ ] **2.5**: Add security messaging and user education
- [ ] **2.6**: Integrate claim modal with extract page
- [ ] **2.7**: Add "Continue as Guest" fallback option

#### Files to Create/Modify
- `src/lib/components/auth/ProfileClaimModal.svelte`
- `src/lib/components/auth/PinEntry.svelte`
- `src/lib/utils/browserFingerprint.ts`
- `src/routes/extract/+page.svelte` - Add claim modal integration

---

### 💾 Phase 3: Session Management (2 days)
**Persistent secure sessions with auto-refresh**

#### Session Store
```typescript
interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionToken: string | null;
  sessionExpiry: Date | null;
  isGuest: boolean;
  browserFingerprint: string;
}
```

#### Tasks
- [ ] **3.1**: Create `authStore.ts` with Svelte store
- [ ] **3.2**: Implement automatic session validation on app load
- [ ] **3.3**: Add session refresh before expiry
- [ ] **3.4**: Create secure logout functionality
- [ ] **3.5**: Add session persistence to localStorage (encrypted)
- [ ] **3.6**: Implement guest mode fallback
- [ ] **3.7**: Add authentication guards for protected routes

#### Files to Create/Modify
- `src/lib/stores/authStore.ts`
- `src/lib/utils/sessionManager.ts`
- `src/hooks.client.ts` - Initialize auth on app load
- `src/app.html` - Add session restoration script

---

### ⭐ Phase 4: Encrypted Watchlist (2 days)
**Secure favorites storage with real-time sync**

#### Database Schema
```prisma
model EncryptedWatchlist {
  id                String   @id @default(cuid())
  sessionId         String
  cardId            String
  encryptedCardData String   // AES encrypted card info
  targetPrice       Float?   // Plain text (not sensitive)
  notifyOnListing   Boolean  @default(true)
  notifyOnPriceDrop Boolean  @default(true)
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  session SecureUserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@unique([sessionId, cardId])
  @@index([sessionId])
}
```

#### Tasks
- [ ] **4.1**: Add watchlist schema to Prisma
- [ ] **4.2**: Create `secureWatchlistService.ts` with encryption
- [ ] **4.3**: Create `FavoriteButton.svelte` component
- [ ] **4.4**: Implement add/remove watchlist endpoints
- [ ] **4.5**: Create `WatchlistStore.ts` with encrypted sync
- [ ] **4.6**: Integrate favorite buttons into CardGrid/CardTable
- [ ] **4.7**: Create watchlist page with user's favorites

#### Files to Create/Modify
- `prisma/schema.prisma` - Add EncryptedWatchlist model
- `src/lib/server/services/secureWatchlistService.ts`
- `src/lib/components/FavoriteButton.svelte`
- `src/lib/stores/watchlistStore.ts`
- `src/routes/api/watchlist/+server.ts`
- `src/routes/watchlist/+page.svelte` - User watchlist page
- `src/lib/components/CardGrid.svelte` - Add favorite buttons
- `src/lib/components/CardTable.svelte` - Add favorite column

---

### 🔔 Phase 5: Notification System (3 days)
**Price monitoring and user alerts**

#### Database Schema
```prisma
model WatchlistEvent {
  id            String   @id @default(cuid())
  watchlistId   String
  eventType     String   // 'listed', 'price_drop', 'sold', 'delisted'
  previousPrice Float?
  currentPrice  Float
  listingUrl    String?
  seen          Boolean  @default(false)
  createdAt     DateTime @default(now())
  
  @@index([watchlistId])
  @@index([seen, createdAt])
}

model NotificationSettings {
  sessionId           String   @id
  emailNotifications  Boolean  @default(false)
  browserNotifications Boolean @default(true)
  priceDropThreshold  Float    @default(0.10) // 10% drop
  checkFrequency      Int      @default(300)   // 5 minutes
  
  session SecureUserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

#### Tasks
- [ ] **5.1**: Add event and settings schemas
- [ ] **5.2**: Create `notificationService.ts` for price monitoring
- [ ] **5.3**: Implement marketplace API scanning job
- [ ] **5.4**: Create `NotificationCenter.svelte` component
- [ ] **5.5**: Add browser notification integration
- [ ] **5.6**: Create notification endpoints and management
- [ ] **5.7**: Implement background scanning with cron job
- [ ] **5.8**: Add notification settings page

#### Files to Create/Modify
- `src/lib/server/services/notificationService.ts`
- `src/lib/components/NotificationCenter.svelte`
- `src/lib/components/NotificationBell.svelte`
- `src/routes/api/notifications/+server.ts`
- `src/routes/api/notifications/settings/+server.ts`
- `src/routes/settings/notifications/+page.svelte`

---

### 🚀 Phase 6: Security Hardening (1 day)
**Production security measures and audit**

#### Security Checklist
- [ ] **6.1**: Add rate limiting middleware to all endpoints
- [ ] **6.2**: Implement CSRF protection
- [ ] **6.3**: Add secure HTTP headers
- [ ] **6.4**: Audit all input validation
- [ ] **6.5**: Add security event logging (without PII)
- [ ] **6.6**: Test against common attacks (XSS, SQL injection)
- [ ] **6.7**: Add data retention and deletion policies
- [ ] **6.8**: Performance test with encrypted operations

#### Files to Create/Modify
- `src/hooks.server.ts` - Security middleware
- `src/lib/server/middleware/rateLimiting.ts`
- `src/lib/server/middleware/security.ts`
- `src/lib/utils/inputValidation.ts`

---

## 🔍 Testing Strategy

### Unit Tests
- [ ] Security service functions (hashing, encryption)
- [ ] Authentication flows (login, logout, session refresh)
- [ ] Watchlist CRUD operations
- [ ] Rate limiting behavior
- [ ] Data encryption/decryption

### Integration Tests
- [ ] End-to-end authentication flow
- [ ] Watchlist persistence across sessions
- [ ] Notification system accuracy
- [ ] Security middleware effectiveness

### Security Tests
- [ ] Brute force protection
- [ ] Session hijacking prevention
- [ ] Data encryption verification
- [ ] Input validation bypass attempts

---

## 📊 Progress Tracking

### Current Status: Phase 2 - Secure Components ✅ COMPLETED  
**Phase 1 Started**: August 28, 2025
**Phase 1 Completed**: August 28, 2025  
**Phase 2 Started**: August 28, 2025
**Phase 2 Completed**: August 28, 2025
**Progress**: All authentication tasks completed

**✅ Phase 1 - Core Authentication (8/8 tasks completed):**
- [x] 1.1: Create Prisma schema additions
- [x] 1.2: Create `securityService.ts` with PIN hashing/validation  
- [x] 1.3: Implement rate limiting (5 attempts = 30min lockout)
- [x] 1.4: Create JWT session management
- [x] 1.5: Add AES-256 data encryption utilities
- [x] 1.6: Create `/api/auth/claim-profile` endpoint
- [x] 1.7: Create `/api/auth/validate-session` endpoint
- [x] 1.8: Add `/api/auth/login` and `/api/auth/logout` endpoints

**✅ Phase 2 - Secure Components (7/7 tasks completed):**
- [x] 2.1: Create `ProfileClaimModal.svelte` with PIN entry
- [x] 2.2: Add PIN strength validation and UX feedback
- [x] 2.3: Implement rate limiting UI (lockout countdown)
- [x] 2.4: Create browser fingerprint utility
- [x] 2.5: Add security messaging and user education
- [x] 2.6: Integrate claim modal with extract page
- [x] 2.7: Add "Continue as Guest" fallback option

**🎨 Authentication UI Fully Functional:**
- ProfileClaimModal with secure PIN entry working
- PinEntry component with validation and accessibility
- AuthStore for session management implemented
- Browser fingerprinting utility operational
- Full integration with extract page workflow
- Comprehensive error handling and user feedback

### Current Status: Phase 3 - Session Management ✅ COMPLETED
**Phase 3 Started**: August 28, 2025  
**Phase 3 Completed**: August 28, 2025
**Progress**: All session management tasks completed

**✅ Phase 3 - Session Management (7/7 tasks completed):**
- [x] 3.1: Create `authStore.ts` with Svelte store (enhanced existing)
- [x] 3.2: Implement automatic session validation on app load
- [x] 3.3: Add session refresh before expiry
- [x] 3.4: Create secure logout functionality (already implemented)
- [x] 3.5: Add session persistence to localStorage (already implemented) 
- [x] 3.6: Implement guest mode fallback (already implemented)
- [x] 3.7: Add authentication guards for protected routes

**🔄 Session Management Fully Functional:**
- SessionManager utility with automatic periodic validation
- Client-side hooks for app initialization and cleanup  
- AuthGuards utility for protecting routes and components
- AuthGuard component for UI-level authentication prompts
- Enhanced validate-session endpoint with automatic token refresh
- Cross-tab session synchronization via storage events
- Comprehensive session health monitoring and debugging tools

**Next Phase**: Phase 4 - Encrypted Watchlist (Core Feature Implementation)

### Metrics to Track
- [ ] Database migration success
- [ ] Authentication endpoint response times
- [ ] Encryption/decryption performance
- [ ] User adoption rate of PIN system
- [ ] Security incident reports

---

## 🎯 Success Criteria

### Functionality
- [ ] Users can claim profiles with PIN
- [ ] Favorites persist across browser sessions
- [ ] Price change notifications work accurately
- [ ] Guest mode fallback functions properly

### Security
- [ ] All PINs are properly hashed (never plain text)
- [ ] User data is encrypted at rest
- [ ] Rate limiting prevents brute force attacks
- [ ] Sessions auto-expire and refresh securely

### Performance  
- [ ] Authentication adds <200ms to page load
- [ ] Encrypted operations don't block UI
- [ ] Notification scanning completes within 5 minutes
- [ ] Database queries remain under 100ms

### User Experience
- [ ] PIN setup takes <30 seconds
- [ ] Favorite button responses feel instant
- [ ] Notifications are relevant and timely
- [ ] Error messages are helpful, not technical

---

## 🚨 Rollback Plan

If critical issues arise:
1. **Phase 1-3**: Disable authentication, fall back to localStorage-only
2. **Phase 4-5**: Disable notifications, keep basic favorites
3. **Phase 6**: Revert security changes if performance issues

Each phase includes database migration rollback scripts and feature flags for quick disabling.

---

## 📝 Notes & Decisions

- **PIN Length**: 4-6 digits (balance security vs UX)
- **Session Duration**: 24 hours with auto-refresh
- **Rate Limiting**: 5 attempts per 30 minutes
- **Encryption**: AES-256 with user-specific keys
- **Notification Frequency**: 5-minute scans (configurable)

---

*Last Updated: [Current Date]*
*Next Review: After Phase 1 completion*