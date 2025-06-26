#!/bin/bash

echo "Setting up Google Cloud credentials for local development"
echo "======================================================="

# Check if credentials already exist in production
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
    echo "Found GOOGLE_APPLICATION_CREDENTIALS_JSON in environment"
    echo "This should be set in your production environment (Render)"
    exit 0
fi

# Create credentials directory
CREDS_DIR="./credentials"
mkdir -p $CREDS_DIR

echo ""
echo "To use Google Cloud Speech-to-Text locally, you need to:"
echo ""
echo "1. Go to Google Cloud Console:"
echo "   https://console.cloud.google.com"
echo ""
echo "2. Select your project (pawscribed)"
echo ""
echo "3. Go to IAM & Admin > Service Accounts"
echo ""
echo "4. Create a new service account or use existing one"
echo ""
echo "5. Create a JSON key for the service account"
echo ""
echo "6. Download the JSON file"
echo ""
echo "7. Save it as: $CREDS_DIR/google-credentials.json"
echo ""
echo "8. Update your .env file with:"
echo "   GOOGLE_APPLICATION_CREDENTIALS=$CREDS_DIR/google-credentials.json"
echo ""
echo "IMPORTANT: Never commit this file to git!"
echo "The .gitignore already excludes it."