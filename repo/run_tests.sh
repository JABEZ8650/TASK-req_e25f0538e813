#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Running tests..."
npx ng test --watch=false --browsers=ChromeHeadlessCI

echo "Tests complete."
