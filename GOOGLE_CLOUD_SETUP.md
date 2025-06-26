# Google Cloud Credentials Setup for Local Development

## Option 1: Get Credentials from Render (Easiest)

Since your production app is already working with Google Cloud, the credentials are stored in Render:

1. **Go to Render Dashboard**
   - https://dashboard.render.com
   - Click on your `pawscribed-app` service

2. **Go to Environment tab**
   - Look for `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Copy the entire base64 string

3. **Set it locally**
   ```bash
   # Add to your .env file:
   GOOGLE_APPLICATION_CREDENTIALS_JSON=paste-the-base64-string-here
   ```

4. **Test it works**
   ```bash
   ./start_local.sh
   # The script will automatically decode and use the credentials
   ```

## Option 2: Create New Service Account (If you need fresh credentials)

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com
   - Select your `pawscribed` project

2. **Create Service Account**
   - Go to: IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: `pawscribed-local-dev`
   - Description: "Local development credentials"
   - Click "Create"

3. **Grant Permissions**
   - Role: "Cloud Speech Client"
   - Click "Continue"
   - Click "Done"

4. **Create JSON Key**
   - Click on your new service account
   - Go to "Keys" tab
   - Add Key → Create new key
   - Choose JSON
   - Download the file

5. **Set up locally**
   ```bash
   # Create credentials directory
   mkdir -p credentials
   
   # Move downloaded file
   mv ~/Downloads/pawscribed-*.json credentials/google-credentials.json
   
   # The start_local.sh script will automatically find it
   ```

## Option 3: Convert Existing JSON to Base64

If you have the JSON file from before:

```bash
# Convert to base64
base64 -i path/to/your-credentials.json | tr -d '\n' > credentials.txt

# Add to .env:
GOOGLE_APPLICATION_CREDENTIALS_JSON=paste-contents-of-credentials.txt
```

## Security Notes

⚠️ **NEVER commit credentials to git!**

The `.gitignore` already excludes:
- `credentials/`
- `*.json` files with certain patterns
- `.env` files

## Verify It's Working

After setting up credentials, run:

```bash
./start_local.sh
```

You should see either:
- "Using local Google Cloud credentials" (if using JSON file)
- "Using environment Google Cloud credentials" (if using base64)

And NOT see:
- "Google Cloud credentials not found"

## Testing Transcription Locally

1. Start local servers: `./start_local.sh`
2. Go to http://localhost:3000
3. Login
4. Go to "Upload Audio"
5. Upload a test audio file
6. It should transcribe successfully!

## Troubleshooting

### "File not found" error
- Check the path in your .env file
- Make sure the JSON file exists in `credentials/`

### "Permission denied" error
- The service account needs "Cloud Speech Client" role
- Check in Google Cloud Console → IAM

### Still not working?
- Check Render environment variables are copied correctly
- Try creating a fresh service account
- Check the backend logs for specific error messages