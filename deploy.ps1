# Store current branch name and save state
$currentBranch = git rev-parse --abbrev-ref HEAD
$projectRoot = Get-Location
Write-Host "Current branch: $currentBranch"

# Build the application
Write-Host "Building application for production..."
ng build --configuration=production

# Create a temporary directory and save the build files
Write-Host "Saving build files to temporary location..."
$tempDir = Join-Path $env:TEMP "rover-build-backup"
if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
New-Item -Path $tempDir -ItemType Directory -Force | Out-Null
Copy-Item -Path "dist/my-ngzorro-app/browser/*" -Destination $tempDir -Recurse

# Save any uncommitted changes in the current branch
git stash push -m "Temporary stash for deployment script" --include-untracked

# Switch to deployment branch
Write-Host "Switching to deployment branch..."
git fetch origin
git checkout deployment 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating new deployment branch..."
    git checkout -b deployment
} else {
    Write-Host "Pulling latest from remote deployment branch..."
    git pull origin deployment --ff-only 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Cannot fast-forward. Creating fresh deployment branch..."
        git checkout -B deployment
    }
}

# CAREFULLY clean deployment branch files (not touching .git)
Write-Host "Cleaning deployment branch files..."
Get-ChildItem -Path . -Exclude .git | Remove-Item -Recurse -Force

# Copy build files from temp location to deployment branch root
Write-Host "Copying build files to deployment branch..."
Copy-Item -Path "$tempDir/*" -Destination . -Recurse

# Add and commit changes
git add .
git commit -m "Updated deployment with latest build from $currentBranch branch"

# Push to GitHub with force flag
Write-Host "Pushing to GitHub..."
git push -f origin deployment

# Return to original branch and restore any stashed changes
Write-Host "Returning to $currentBranch branch..."
git checkout $currentBranch
git stash pop 2>$null

Write-Host "Deployment complete! Your $currentBranch branch is restored."