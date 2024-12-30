# Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource naming and configuration
locals {
  s3_origin_id = "S3-egyptian-map-of-pi-${var.environment}"
  
  # Cache behaviors configuration
  cache_behaviors = {
    static = {
      path_pattern     = "/static/*"
      target_origin_id = local.s3_origin_id
      ttl = {
        min     = 0
        default = 86400    # 24 hours
        max     = 31536000 # 1 year
      }
    }
    media = {
      path_pattern     = "/media/*"
      target_origin_id = local.s3_origin_id
      ttl = {
        min     = 0
        default = 604800  # 7 days
        max     = 2592000 # 30 days
      }
    }
  }

  # Common tags for all resources
  common_tags = {
    Environment = var.environment
    Project     = "Egyptian Map of Pi"
    ManagedBy   = "Terraform"
    Service     = "CDN"
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "Origin Access Identity for Egyptian Map of Pi ${var.environment}"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "CDN distribution for Egyptian Map of Pi ${var.environment}"
  default_root_object = "index.html"
  price_class        = "PriceClass_200" # Optimized for Middle East coverage
  
  # Origin configuration
  origin {
    domain_name = var.bucket_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600  # 1 hour
    max_ttl                = 86400 # 24 hours
    compress               = true
  }

  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern     = local.cache_behaviors.static.path_pattern
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.cache_behaviors.static.target_origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = local.cache_behaviors.static.ttl.min
    default_ttl            = local.cache_behaviors.static.ttl.default
    max_ttl                = local.cache_behaviors.static.ttl.max
    compress               = true
  }

  # Media files cache behavior
  ordered_cache_behavior {
    path_pattern     = local.cache_behaviors.media.path_pattern
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.cache_behaviors.media.target_origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = local.cache_behaviors.media.ttl.min
    default_ttl            = local.cache_behaviors.media.ttl.default
    max_ttl                = local.cache_behaviors.media.ttl.max
    compress               = true
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none" # Allow access from all locations
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  # Custom error responses
  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  # Web Application Firewall integration
  web_acl_id = var.web_acl_id

  # Resource tags
  tags = local.common_tags

  # Logging configuration
  logging_config {
    include_cookies = false
    bucket         = "${var.bucket_domain_name}"
    prefix         = "cdn-logs/"
  }
}

# Outputs for DNS and application configuration
output "distribution_id" {
  description = "The identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID for DNS configuration"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "oai_path" {
  description = "The path for the CloudFront Origin Access Identity"
  value       = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
}