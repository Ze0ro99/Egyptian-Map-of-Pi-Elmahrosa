# Project Information
variable "project_name" {
  description = "Name of the Egyptian Map of Pi project"
  type        = string
  default     = "egyptian-map-of-pi"
}

variable "environment" {
  description = "Deployment environment (production, staging, dr)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "dr"], var.environment)
    error_message = "Environment must be one of: production, staging, dr"
  }
}

# Regional Configuration
variable "aws_region" {
  description = "AWS region for deployment (me-south-1 for prod, eu-south-1 for DR)"
  type        = string
  validation {
    condition     = contains(["me-south-1", "eu-south-1"], var.aws_region)
    error_message = "AWS region must be either me-south-1 (Bahrain) for production or eu-south-1 (Milan) for DR"
  }
}

variable "availability_zones" {
  description = "List of availability zones for multi-AZ deployment"
  type        = list(string)
  validation {
    condition     = length(var.availability_zones) >= 3
    error_message = "At least 3 availability zones must be specified for high availability"
  }
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.27"
  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.eks_cluster_version))
    error_message = "EKS cluster version must be 1.27 or higher"
  }
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_node_group_scaling" {
  description = "Auto-scaling configuration for EKS node groups"
  type = object({
    min_size     = number
    max_size     = number
    desired_size = number
  })
  default = {
    min_size     = 2
    max_size     = 10
    desired_size = 3
  }
  validation {
    condition     = var.eks_node_group_scaling.min_size >= 2
    error_message = "Minimum node group size must be at least 2 for high availability"
  }
}

# MongoDB Configuration
variable "mongodb_instance_class" {
  description = "RDS instance type for MongoDB deployment"
  type        = string
  default     = "db.r6g.large"
}

variable "mongodb_storage_size" {
  description = "Storage size in GB for MongoDB RDS instance"
  type        = number
  default     = 100
  validation {
    condition     = var.mongodb_storage_size >= 100
    error_message = "MongoDB storage size must be at least 100 GB"
  }
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type for Redis deployment"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 3
  validation {
    condition     = var.redis_num_cache_nodes >= 2
    error_message = "Redis cluster must have at least 2 nodes for high availability"
  }
}

# S3 Configuration
variable "s3_versioning" {
  description = "Enable/disable versioning for S3 buckets"
  type        = bool
  default     = true
}

# CloudFront Configuration
variable "cdn_price_class" {
  description = "Price class for CloudFront distribution"
  type        = string
  default     = "PriceClass_200"  # Includes Middle East and Europe
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cdn_price_class)
    error_message = "CDN price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All"
  }
}

# Resource Tagging
variable "tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Project     = "egyptian-map-of-pi"
    ManagedBy   = "terraform"
    Application = "marketplace"
  }
}