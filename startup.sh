#!/bin/bash

# Decode Google Cloud credentials if provided as base64 environment variable
if [ ! -z "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
    echo "Setting up Google Cloud credentials..."
    echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" | base64 -d > /tmp/google-credentials.json
    export GOOGLE_APPLICATION_CREDENTIALS="/tmp/google-credentials.json"
    echo "Google Cloud credentials configured."
else
    echo "No Google Cloud credentials provided, transcription service will have limited functionality."
fi

# Run database migrations
echo "Running database migrations..."
python migrate_database.py

# Start the application
echo "Starting Pawscribed backend..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT