# S3 bucket identifier output
output "bucket_id" {
  description = "The name of the S3 bucket created for Egyptian Map of Pi media storage"
  value       = aws_s3_bucket.main.id
}

# S3 bucket ARN output for IAM policies and access control
output "bucket_arn" {
  description = "The ARN of the S3 bucket for IAM policy configuration and CloudFront OAI access"
  value       = aws_s3_bucket.main.arn
  sensitive   = true # ARN contains account ID, marking as sensitive
}

# S3 bucket domain name for CloudFront origin configuration
output "bucket_domain_name" {
  description = "The domain name of the S3 bucket for CloudFront CDN origin configuration"
  value       = aws_s3_bucket.main.bucket_domain_name
}

# S3 bucket regional domain name for optimized Middle East region access
output "bucket_regional_domain_name" {
  description = "The regional domain name of the S3 bucket for optimized CloudFront access in the Middle East region"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

# Replica bucket outputs (if replication is enabled)
output "replica_bucket_id" {
  description = "The name of the replica S3 bucket (if replication is enabled)"
  value       = var.replication_enabled ? aws_s3_bucket.replica[0].id : null
}

output "replica_bucket_arn" {
  description = "The ARN of the replica S3 bucket for disaster recovery (if replication is enabled)"
  value       = var.replication_enabled ? aws_s3_bucket.replica[0].arn : null
  sensitive   = true
}

# Bucket website endpoint (if website hosting is enabled)
output "bucket_website_endpoint" {
  description = "The website endpoint URL of the S3 bucket (if website hosting is enabled)"
  value       = try(aws_s3_bucket.main.website_endpoint, null)
}

# Bucket region for reference
output "bucket_region" {
  description = "The AWS region where the S3 bucket is created"
  value       = aws_s3_bucket.main.region
}