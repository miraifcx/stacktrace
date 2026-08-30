# StackTrace

A specialized incident response and diagnostic logging platform powered by Gemini. It is designed to act as a Tier-2/Tier-3 AI-assisted SRE system that tracks, summarizes, and classifies system outages and infrastructure events.

This application is built as a full-stack Express + Vite + React (TypeScript) architecture, utilizing Firebase Authentication, Cloud Firestore for persistence, and the Gemini API for LLM-powered diagnostics.

## Production Deployment & Security Guide

To deploy this application securely to Google Cloud Run and ensure it meets security compliance requirements (including zero-hardcoded secrets and strict Firestore access boundaries), follow the step-by-step guide below.

---

### 1. Environment & Prerequisites

Ensure you have the following installed and configured on your local machine or Google Cloud Shell:
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- A Google Cloud Project with billing enabled.

Enable the required APIs in your Google Cloud Project:
```bash
gcloud services enable run.googleapis.com \
                       secretmanager.googleapis.com \
                       firestore.googleapis.com
```

---

### 2. Secret Management Setup (Zero-Hardcoding)

The application relies on the `GEMINI_API_KEY` to interact with the LLM. **Never hardcode this key in your source code.** Instead, use Google Cloud Secret Manager to inject it at runtime.

1. **Create and populate the secret:**
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

2. **Grant the default Cloud Run service account access to read the secret:**
*(Replace `YOUR_PROJECT_NUMBER` with your actual Google Cloud Project Number)*
```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Database Security Configuration (Firestore Rules)

To prevent unauthorized access and cross-user data leakage, you must restrict Firestore reads and writes exclusively to the document owner.

1. Create a file named `firestore.rules` in your project root (if it doesn't already exist) or deploy these rules directly via the Firebase console.
2. Ensure the rules enforce owner-bound path checking:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Restrict access so users can only read/write their own cases
    match /users/{userId}/cases/{caseId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // (Optional) Include Interactions path if utilized
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
3. Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

---

### 4. Cloud Run Deployment Flow

You can deploy the application directly to Cloud Run from the source code. Cloud Run will automatically build the container and deploy the service.

Deploy the service while injecting the Secret Manager reference:
```bash
gcloud run deploy stacktrace-diagnostics \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

### 5. Required Campaign Labeling (Verification)

If you are deploying this application as part of the Google Cloud AI challenge, you **must** apply the mandatory resource label to register the service for automated challenge verification.

Run the following command after your service is deployed:
*(Replace `<REGION>` with the region you deployed to, e.g., `us-central1`)*

```bash
gcloud run services update stacktrace-diagnostics \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```
