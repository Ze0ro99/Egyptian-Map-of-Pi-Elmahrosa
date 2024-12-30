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
  bucket_name = "${var.project_name}-${var.environment}-${var.bucket_name}"
  
  default_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  
  tags = merge(local.default_tags, var.tags)

  # Intelligent tiering configuration
  intelligent_tiering = {
    status = "Enabled"
    filter = {
      prefix = ""
      tags   = {}
    }
    tiering = {
      access = [
        {
          days = 90
          storage_class = "DEEP_ARCHIVE_ACCESS"
        },
        {
          days = 30
          storage_class = "ARCHIVE_ACCESS"
        }
      ]
    }
  }
}

# Main S3 bucket resource
resource "aws_s3_bucket" "main" {
  bucket = local.bucket_name
  tags   = local.tags

  # Force destroy only in non-production environments
  force_destroy = var.environment != "production"
}

# Bucket versioning configuration
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
  }
}

# Server-side encryption configuration
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  count  = var.encryption_enabled ? 1 : 0
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# CORS configuration for web access
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    content {
      allowed_headers = cors_rule.value.allowed_headers
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = cors_rule.value.expose_headers
      max_age_seconds = cors_rule.value.max_age_seconds
    }
  }
}

# Lifecycle rules configuration
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {
        prefix = rule.value.prefix
      }

      dynamic "transition" {
        for_each = rule.value.transition_days != null ? [1] : []
        content {
          days          = rule.value.transition_days
          storage_class = rule.value.transition_storage_class
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration_days != null ? [1] : []
        content {
          noncurrent_days = rule.value.noncurrent_version_expiration_days
        }
      }
    }
  }
}

# Public access block configuration
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy for CloudFront OAI access
resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAIAccess"
        Effect    = "Allow"
        Principal = {
          AWS = var.cloudfront_oai_iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.main.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.main]
}

# Intelligent tiering configuration
resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  name   = "EntireStorage"
  status = local.intelligent_tiering.status

  filter {
    prefix = local.intelligent_tiering.filter.prefix
    tags   = local.intelligent_tiering.filter.tags
  }

  dynamic "tiering" {
    for_each = local.intelligent_tiering.tiering.access
    content {
      access_tier = tiering.value.storage_class
      days        = tiering.value.days
    }
  }
}

# Bucket logging configuration
resource "aws_s3_bucket_logging" "main" {
  count         = var.logging_enabled ? 1 : 0
  bucket        = aws_s3_bucket.main.id
  target_bucket = aws_s3_bucket.main.id
  target_prefix = "logs/"
}

# Cross-region replication configuration
resource "aws_s3_bucket_replication_configuration" "main" {
  count  = var.replication_enabled ? 1 : 0
  bucket = aws_s3_bucket.main.id
  role   = aws_iam_role.replication[0].arn

  rule {
    id     = "EntireBucketReplication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica[0].arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [aws_s3_bucket_versioning.main]
}

# Replica bucket (if replication is enabled)
resource "aws_s3_bucket" "replica" {
  count         = var.replication_enabled ? 1 : 0
  bucket        = "${local.bucket_name}-replica"
  force_destroy = true

  provider = aws.replica
  tags     = merge(local.tags, { Type = "Replica" })
}