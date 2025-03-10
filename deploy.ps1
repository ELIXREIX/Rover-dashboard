# Store current branch name
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $currentBranch"

# Build the application
Write-Host "Building application for production..."
ng build --configuration=production

# Commit any pending changes on current branch
git add .
git commit -m "Build updates before deployment" -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0) { Write-Host "No changes to commit" }

# Switch to deployment branch
Write-Host "Switching to deployment branch..."
git checkout deployment 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating deployment branch..."
    git checkout -b deployment
}

# Remove previous build artifacts (only in deployment branch)
Write-Host "Cleaning deployment branch..."
Get-ChildItem -Path . -Exclude .git | Remove-Item -Recurse -Force

# Copy build files to deployment branch root
Write-Host "Copying build files to deployment branch..."
Copy-Item -Path "$currentBranch/dist/my-ngzorro-app/*" -Destination . -Recurse

# Add and commit changes
git add .
git commit -m "Updated deployment with latest build"

# Push to GitHub
Write-Host "Pushing to GitHub..."
git push -u origin deployment

# Return to original branch
Write-Host "Returning to $currentBranch branch..."
git checkout $currentBranch

Write-Host "Deployment complete!"