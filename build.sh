#!/bin/bash

# Netlify build script for farming simulator
echo "Starting build process..."

# Make sure we're in frontend directory
cd frontend || exit 1

# Install dependencies 
echo "Installing dependencies..."
npm install --no-package-lock

# Run the build
echo "Building application..."  
npm run build

# Check if build was successful
if [ -d "build" ]; then
  echo "Build successful! ✅"
  exit 0
else
  echo "Build failed! ❌"
  exit 1
fi