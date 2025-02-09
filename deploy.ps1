# AWS Configuration
$awsAccountId = "767828739769"
$bucketName = "rover-data-storage"
$distributionId = "EJL53O7JLQPFH"
$region = "ap-southeast-1"

# Verify AWS credentials
Write-Host "Verifying AWS credentials..."
$currentAccount = aws sts get-caller-identity --query "Account" --output text
if ($currentAccount -ne $awsAccountId) {
    Write-Host "AWS account mismatch! Expected: $awsAccountId, Got: $currentAccount"
    exit 1
}
Write-Host "AWS credentials verified for account $awsAccountId"

# Build application
Write-Host "Building application..."
ng build --configuration=production
if (-not $?) {
    Write-Host "Build failed!"
    exit 1
}

# Upload to S3
Write-Host "Uploading to S3..."
aws s3 sync dist/my-ngzorro-app s3://$bucketName --delete --region $region
if (-not $?) {
    Write-Host "S3 sync failed!"
    exit 1
}

# Invalidate CloudFront cache
Write-Host "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*"
if (-not $?) {
    Write-Host "Cache invalidation failed!"
    exit 1
}

Write-Host "Deployment complete!"