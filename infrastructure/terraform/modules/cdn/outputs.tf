# Output definitions for CloudFront CDN module
# Version: 1.0
# Provider compatibility: hashicorp/terraform ~> 1.5

# CloudFront distribution ID output
output "distribution_id" {
  description = "The ID of the CloudFront distribution for the Egyptian Map of Pi CDN"
  value       = aws_cloudfront_distribution.main.id
}

# CloudFront distribution domain name output
output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution for content delivery in Egypt"
  value       = aws_cloudfront_distribution.main.domain_name
}

# CloudFront distribution hosted zone ID output
output "distribution_hosted_zone_id" {
  description = "The Route 53 hosted zone ID for the CloudFront distribution enabling geolocation routing"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

# CloudFront Origin Access Identity path output
output "origin_access_identity_path" {
  description = "The path for the CloudFront Origin Access Identity used in S3 bucket policies"
  value       = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
}

# CloudFront distribution deployment status output
output "distribution_status" {
  description = "The current status of the CloudFront distribution deployment"
  value       = aws_cloudfront_distribution.main.status
}

# CloudFront Origin Access Identity IAM ARN output
output "origin_access_identity_iam_arn" {
  description = "The IAM ARN of the Origin Access Identity for S3 bucket policy configuration"
  value       = aws_cloudfront_origin_access_identity.main.iam_arn
}