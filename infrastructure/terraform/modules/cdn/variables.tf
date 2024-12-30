# Terraform variables definition file for CloudFront CDN module
# Version: 1.0
# Provider version compatibility: hashicorp/terraform ~> 1.0

# Environment identifier variable with validation
variable "environment" {
  type        = string
  description = "Deployment environment identifier (prod, staging, dev) for resource naming and configuration"

  validation {
    condition     = can(regex("^(prod|staging|dev)$", var.environment))
    error_message = "Environment must be one of: prod, staging, dev"
  }
}

# Project name variable
variable "project_name" {
  type        = string
  description = "Project identifier for resource naming and tagging conventions"
  default     = "egyptian-map-of-pi"
}

# AWS region variable
variable "region_name" {
  type        = string
  description = "AWS region name for CDN configuration, defaulting to Middle East (Bahrain)"
  default     = "me-south-1"
}

# S3 bucket domain name variable
variable "bucket_domain_name" {
  type        = string
  description = "Origin S3 bucket domain name for CDN content source configuration"
}

# S3 origin identifier variable
variable "s3_origin_id" {
  type        = string
  description = "Unique identifier for the S3 origin in CloudFront distribution"
  default     = "S3-egyptian-map-of-pi"
}

# Cache TTL configurations
variable "default_ttl" {
  type        = number
  description = "Default Time-To-Live in seconds for cached objects"
  default     = 3600 # 1 hour
}

variable "static_ttl" {
  type        = number
  description = "Time-To-Live in seconds for static assets (CSS, JS, images)"
  default     = 86400 # 24 hours
}

variable "media_ttl" {
  type        = number
  description = "Time-To-Live in seconds for media files (user uploads)"
  default     = 604800 # 7 days
}

variable "price_list_ttl" {
  type        = number
  description = "Time-To-Live in seconds for price list and product data"
  default     = 300 # 5 minutes
}

# Performance optimization configurations
variable "enable_compression" {
  type        = bool
  description = "Enable CloudFront compression for improved performance"
  default     = true
}

# HTTP method configurations
variable "allowed_methods" {
  type        = list(string)
  description = "List of allowed HTTP methods"
  default     = ["GET", "HEAD", "OPTIONS"]
}

# Resource tagging configurations
variable "tags" {
  type        = map(string)
  description = "Resource tags for cost allocation and management"
  default = {
    Project     = "egyptian-map-of-pi"
    ManagedBy   = "terraform"
    Environment = "var.environment"
    Region      = "middle-east"
    Service     = "cdn"
  }
}