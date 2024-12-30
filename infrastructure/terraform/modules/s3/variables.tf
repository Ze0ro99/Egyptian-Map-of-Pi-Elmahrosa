# Project identification variables
variable "project_name" {
  description = "Name of the Egyptian Map of Pi project for resource naming"
  type        = string
  default     = "egyptian-map-pi"
}

variable "environment" {
  description = "Deployment environment (production, staging, dr)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "dr"], var.environment)
    error_message = "Environment must be one of: production, staging, dr."
  }
}

# Bucket configuration variables
variable "bucket_name" {
  description = "Name of the S3 bucket to be created"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be valid S3 bucket name format."
  }
}

variable "versioning_enabled" {
  description = "Enable/disable versioning for the S3 bucket"
  type        = bool
  default     = true
}

# Lifecycle management configuration
variable "lifecycle_rules" {
  description = "List of lifecycle rules for object management and retention"
  type = list(object({
    id                       = string
    enabled                 = bool
    prefix                  = string
    expiration_days         = optional(number)
    noncurrent_version_expiration_days = optional(number)
    transition_days         = optional(number)
    transition_storage_class = optional(string)
  }))
  default = []
}

# CORS configuration for web access
variable "cors_rules" {
  description = "CORS configuration for web access to bucket objects"
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = list(string)
    max_age_seconds = number
  }))
  default = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["*.egyptianmappi.com"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3600
    }
  ]
}

# Security configuration
variable "encryption_enabled" {
  description = "Enable/disable server-side encryption for the bucket"
  type        = bool
  default     = true
}

variable "block_public_access" {
  description = "Enable/disable public access blocking for the bucket"
  type = object({
    block_public_acls       = bool
    block_public_policy     = bool
    ignore_public_acls      = bool
    restrict_public_buckets = bool
  })
  default = {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
}

# CDN configuration
variable "cdn_enabled" {
  description = "Enable/disable CloudFront CDN integration"
  type        = bool
  default     = true
}

variable "cdn_price_class" {
  description = "CloudFront price class for CDN distribution"
  type        = string
  default     = "PriceClass_200" # Covers Europe, Middle East, and Africa
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cdn_price_class)
    error_message = "Price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All."
  }
}

# Backup and retention configuration
variable "enable_replication" {
  description = "Enable/disable cross-region replication for disaster recovery"
  type        = bool
  default     = false
}

variable "replication_region" {
  description = "AWS region for bucket replication (if enabled)"
  type        = string
  default     = "eu-south-1" # Milan region for DR
}

# Resource tagging
variable "tags" {
  description = "Map of tags to be applied to the S3 bucket"
  type        = map(string)
  default = {
    Project     = "Egyptian Map of Pi"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# Monitoring and logging
variable "enable_logging" {
  description = "Enable/disable access logging for the bucket"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain bucket access logs"
  type        = number
  default     = 90
  validation {
    condition     = var.log_retention_days >= 30
    error_message = "Log retention must be at least 30 days."
  }
}