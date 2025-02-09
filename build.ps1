# Clean previous builds
Write-Host "Cleaning previous builds..."
Remove-Item -Recurse -Force .\dist\ -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\.angular\cache\ -ErrorAction SilentlyContinue

# Install dependencies
Write-Host "Installing dependencies..."
npm ci

# Build the application
Write-Host "Building application..."
npm run build:amplify

Write-Host "Build complete! Files are in dist/my-ngzorro-app/browser"