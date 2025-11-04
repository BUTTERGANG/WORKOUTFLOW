# Legal Compliance - ACTION REQUIRED

## 🚨 CRITICAL: Legal Documents Required Before Production

Your application **CANNOT be deployed to production** without these legal documents. Failure to include them exposes you to:
- **GDPR fines**: Up to €20 million or 4% of annual revenue
- **CCPA fines**: Up to $7,500 per violation
- **Lawsuits**: User legal action
- **App Store Rejection**: If mobile apps planned

---

## Required Legal Documents

### 1. Privacy Policy (CRITICAL)

Create a file: `client/src/pages/privacy-policy.tsx`

**Must Include:**
- What data you collect (name, email, workout logs, etc.)
- How you use the data
- How long you store data
- User rights (access, deletion, export)
- Cookie usage
- Third-party services (NeonDB, Replit Auth, Google Fonts)
- Contact information for privacy inquiries
- GDPR compliance statement
- CCPA compliance statement (if applicable)
- Date of last update

**Template Services:**
- https://www.termsfeed.com/privacy-policy-generator/
- https://www.freeprivacypolicy.com/
- Consult with a lawyer for custom policy

### 2. Terms of Service (CRITICAL)

Create a file: `client/src/pages/terms-of-service.tsx`

**Must Include:**
- User agreement to terms
- Acceptable use policy
- User responsibilities
- Intellectual property rights
- Limitation of liability
- Dispute resolution
- Termination conditions
- Governing law
- Contact information
- Date of last update

**Template Services:**
- https://www.termsfeed.com/terms-conditions-generator/
- https://www.termsandconditionsgenerator.com/
- Consult with a lawyer for custom terms

### 3. Cookie Consent Banner (CRITICAL)

**Implementation Required:**

```typescript
// Install package:
npm install react-cookie-consent

// Add to App.tsx:
import CookieConsent from "react-cookie-consent";

<CookieConsent
  location="bottom"
  buttonText="I understand"
  cookieName="workout-builder-consent"
  style={{ background: "#2B373B" }}
  buttonStyle={{ color: "#4e503b", fontSize: "13px" }}
  expires={150}
>
  This website uses cookies to enhance the user experience.{" "}
  <a href="/privacy-policy" style={{ color: "#fff" }}>
    Learn more
  </a>
</CookieConsent>
```

---

## Required API Endpoints (GDPR Compliance)

### 1. Data Export Endpoint

```typescript
// Add to server/routes.ts:
app.get('/api/users/me/export', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const userId = req.currentUser!.id;

    // Gather all user data
    const userData = {
      profile: await storage.getUser(userId),
      workoutSessions: await storage.getUserWorkoutSessions(userId),
      programs: await storage.getUserPrograms(userId),
      teams: await storage.getUserTeams(userId),
      messages: await storage.getUserMessages(userId),
      // Add other user data...
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
    res.json(userData);
  } catch (error) {
    logger.error("Error exporting user data", error);
    res.status(500).json({ message: "Failed to export data" });
  }
});
```

### 2. Account Deletion Endpoint

```typescript
// Add to server/routes.ts:
app.delete('/api/users/me', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const userId = req.currentUser!.id;

    // Delete all user data (cascade deletes should handle most)
    await storage.deleteUser(userId);

    // Clear session
    req.session.destroy((err) => {
      if (err) logger.error("Session destruction error", err);
    });

    res.json({
      message: "Account deleted successfully",
      success: true
    });
  } catch (error) {
    logger.error("Error deleting user account", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
});
```

### 3. Add to storage.ts:

```typescript
async deleteUser(userId: string): Promise<void> {
  // Cascade deletes should handle most, but be explicit
  await this.db.delete(users).where(eq(users.id, userId));
  // All related data deleted via CASCADE
}

async getUserWorkoutSessions(userId: string) {
  return await this.db.query.workoutSessions.findMany({
    where: eq(workoutSessions.athleteId, userId),
    with: {
      exerciseLogs: {
        with: {
          setLogs: true,
        },
      },
    },
  });
}

// Add similar methods for other user data...
```

---

## Add Routes for Legal Pages

```typescript
// Add to client/src/App.tsx routes:
<Route path="/privacy-policy" component={PrivacyPolicy} />
<Route path="/terms-of-service" component={TermsOfService} />
```

## Add Links in Footer

Create a footer component with links:
```tsx
<footer className="border-t py-6 text-center text-sm text-muted-foreground">
  <div className="flex justify-center gap-4">
    <Link href="/privacy-policy">Privacy Policy</Link>
    <Link href="/terms-of-service">Terms of Service</Link>
    <a href="mailto:privacy@yourdomain.com">Contact</a>
  </div>
  <p className="mt-2">© 2025 Workout Builder. All rights reserved.</p>
</footer>
```

---

## Data Retention Policy

**Define and implement:**
- How long you keep user data after account deletion
- Backup retention periods
- Anonymization vs deletion
- Log retention periods

**Recommended:**
- Active accounts: Indefinite (while user is active)
- Deleted accounts: 30-day grace period, then permanent deletion
- Logs: 90 days
- Backups: 30 days with user data anonymized

---

## User Settings Page Additions

Add to Settings page (`client/src/pages/settings.tsx`):

```tsx
<Card>
  <CardHeader>
    <CardTitle>Privacy & Data</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <Button
      variant="outline"
      onClick={handleExportData}
    >
      Download My Data
    </Button>
    <Button
      variant="destructive"
      onClick={handleDeleteAccount}
    >
      Delete My Account
    </Button>
  </CardContent>
</Card>
```

---

## Compliance Checklist

### Before Production:
- [ ] Privacy Policy page created and linked
- [ ] Terms of Service page created and linked
- [ ] Cookie consent banner implemented
- [ ] Data export endpoint implemented
- [ ] Account deletion endpoint implemented
- [ ] Footer with legal links added to all pages
- [ ] User data download feature in settings
- [ ] Account deletion feature in settings (with confirmation)
- [ ] Privacy policy reviewed by legal counsel (RECOMMENDED)
- [ ] Terms reviewed by legal counsel (RECOMMENDED)

### Recommended:
- [ ] Privacy policy URL updated in all meta tags
- [ ] Privacy email set up (privacy@yourdomain.com)
- [ ] Data retention policy documented
- [ ] Backup anonymization process implemented
- [ ] GDPR representative appointed (if EU users)
- [ ] Data processing agreement with vendors (NeonDB, Replit)

---

## Additional Considerations

### If You Have EU Users:
- Appoint a GDPR representative
- Document legal basis for data processing
- Implement "right to be forgotten" (deletion endpoint)
- Implement data portability (export endpoint)
- Get explicit consent for data processing

### If You Have California Users:
- CCPA compliance required
- "Do Not Sell My Personal Information" link
- Privacy policy must include CCPA disclosures

### For Mobile Apps:
- App Store requires privacy policy URL
- Google Play requires privacy policy URL
- Privacy policy must be accessible from app

---

## Timeline

**IMMEDIATE (Before any deployment):**
1. Create basic Privacy Policy and Terms of Service
2. Add cookie consent banner
3. Link legal pages in footer

**WITHIN 1 WEEK:**
4. Implement data export endpoint
5. Implement account deletion endpoint
6. Add user-facing data management features

**WITHIN 1 MONTH:**
7. Have legal documents reviewed by attorney
8. Implement full GDPR/CCPA compliance measures
9. Document data retention policies

---

## Resources

- **GDPR Guide**: https://gdpr.eu/
- **CCPA Guide**: https://oag.ca.gov/privacy/ccpa
- **Privacy Policy Generator**: https://www.termsfeed.com/
- **Legal Templates**: https://www.iubenda.com/
- **Cookie Consent**: https://www.npmjs.com/package/react-cookie-consent

---

## ⚠️ DISCLAIMER

This document provides guidance but **IS NOT LEGAL ADVICE**. Consult with a qualified attorney to ensure compliance with all applicable laws and regulations in your jurisdiction.

---

**Status**: ❌ NOT COMPLIANT - ACTION REQUIRED
**Priority**: 🔴 CRITICAL - BLOCKING PRODUCTION DEPLOYMENT
**Est. Time**: 4-8 hours (basic compliance) + legal review time
