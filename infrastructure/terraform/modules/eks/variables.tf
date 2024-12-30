# Core cluster configuration variables
variable "cluster_name" {
  description = "Name of the EKS cluster for Egyptian Map of Pi platform"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster (must be 1.27 or higher)"
  type        = string
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.cluster_version))
    error_message = "Cluster version must be 1.27 or higher for Egyptian Map of Pi platform requirements."
  }
}

variable "vpc_id" {
  description = "ID of the VPC where EKS cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for multi-AZ deployment in AWS Bahrain region (me-south-1)"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability deployment."
  }
}

# Node group configuration
variable "node_group_config" {
  description = "Configuration for EKS node groups including instance types and scaling parameters"
  type = object({
    instance_types = list(string)
    min_size      = number
    max_size      = number
    desired_size  = number
  })

  default = {
    instance_types = ["t3.medium"]
    min_size      = 2
    max_size      = 10
    desired_size  = 3
  }

  validation {
    condition     = var.node_group_config.min_size >= 2
    error_message = "Minimum node group size must be at least 2 for high availability."
  }

  validation {
    condition     = var.node_group_config.max_size <= 10
    error_message = "Maximum node group size cannot exceed 10 nodes."
  }

  validation {
    condition     = var.node_group_config.desired_size >= var.node_group_config.min_size && var.node_group_config.desired_size <= var.node_group_config.max_size
    error_message = "Desired size must be between min_size and max_size."
  }
}

# Cluster endpoint access configuration
variable "cluster_endpoint_public_access" {
  description = "Enable/disable public access to the EKS cluster endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Enable/disable private access to the EKS cluster endpoint"
  type        = bool
  default     = true
}

# Security configuration
variable "cluster_security_group_ids" {
  description = "List of security group IDs for the EKS cluster"
  type        = list(string)
  default     = []
}

# Resource tagging
variable "tags" {
  description = "Tags to be applied to all EKS resources for the Egyptian Map of Pi platform"
  type        = map(string)
  default = {
    Environment = "production"
    Platform    = "egyptian-map-of-pi"
    Terraform   = "true"
  }
}

# Additional configuration for cluster addons
variable "cluster_addons" {
  description = "Map of cluster addon configurations"
  type = map(object({
    version               = string
    resolve_conflicts     = string
    service_account_role_arn = string
  }))
  default = {
    coredns = {
      version               = "v1.9.3-eksbuild.3"
      resolve_conflicts     = "OVERWRITE"
      service_account_role_arn = null
    }
    kube-proxy = {
      version               = "v1.27.1-eksbuild.1"
      resolve_conflicts     = "OVERWRITE"
      service_account_role_arn = null
    }
    vpc-cni = {
      version               = "v1.12.6-eksbuild.1"
      resolve_conflicts     = "OVERWRITE"
      service_account_role_arn = null
    }
  }
}

# Logging configuration
variable "cluster_enabled_log_types" {
  description = "List of EKS cluster control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

# Node group IAM configuration
variable "node_group_iam_role_name" {
  description = "Name to use for the EKS node group IAM role"
  type        = string
  default     = null
}