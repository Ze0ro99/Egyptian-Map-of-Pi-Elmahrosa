# Basic RDS Instance Configuration
variable "identifier" {
  description = "Unique identifier for the RDS instance"
  type        = string
}

variable "instance_class" {
  description = "The instance type for the RDS instance (e.g., db.r6g.xlarge for production)"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "allocated_storage" {
  description = "The allocated storage size in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.allocated_storage >= 100 && var.allocated_storage <= 65536
    error_message = "Allocated storage must be between 100 GB and 65536 GB."
  }
}

variable "storage_type" {
  description = "Type of storage for the RDS instance"
  type        = string
  default     = "gp3"

  validation {
    condition     = contains(["gp3", "io1"], var.storage_type)
    error_message = "Storage type must be either gp3 or io1 for production workloads."
  }
}

# MongoDB Engine Configuration
variable "engine_version" {
  description = "MongoDB compatible engine version for RDS"
  type        = string
  default     = "6.0"

  validation {
    condition     = can(regex("^[0-9]\\.[0-9]$", var.engine_version))
    error_message = "Engine version must be in format X.Y (e.g., 6.0)."
  }
}

# Authentication Configuration
variable "username" {
  description = "Master username for the RDS instance"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{2,15}$", var.username))
    error_message = "Username must start with a letter, be 3-16 characters long, and contain only alphanumeric characters or underscores."
  }
}

variable "password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[a-zA-Z0-9!@#$%^&*()_+=-]{8,41}$", var.password))
    error_message = "Password must be 8-41 characters and contain valid special characters."
  }
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 7 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days."
  }
}

variable "backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "02:00-03:00"  # Optimal window for Egypt timezone

  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM."
  }
}

# High Availability Configuration
variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true  # Enabled by default for production
}

variable "availability_zone" {
  description = "Preferred availability zone in me-south-1 region"
  type        = string
  default     = "me-south-1a"

  validation {
    condition     = can(regex("^me-south-1[a-c]$", var.availability_zone))
    error_message = "Availability zone must be in me-south-1 region (a, b, or c)."
  }
}

# Network Configuration
variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs for RDS instance"
  type        = list(string)
}

variable "subnet_ids" {
  description = "List of subnet IDs for DB subnet group"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnet IDs are required for high availability."
  }
}

# Performance and Monitoring
variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be 0, 1, 5, 10, 15, 30, or 60 seconds."
  }
}

# Resource Tagging
variable "tags" {
  description = "Map of tags to apply to the RDS instance"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "egyptian-map-of-pi"
    Terraform   = "true"
  }
}

# Encryption Configuration
variable "storage_encrypted" {
  description = "Enable storage encryption"
  type        = bool
  default     = true  # Enabled by default for security
}

variable "kms_key_id" {
  description = "KMS key ID for storage encryption"
  type        = string
  default     = null  # Uses AWS default KMS key if not specified
}

# Maintenance Configuration
variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:03:00-sun:04:00"  # After backup window

  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in format ddd:hh:mm-ddd:hh:mm."
  }
}