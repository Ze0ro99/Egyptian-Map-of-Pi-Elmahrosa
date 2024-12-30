# Terraform AWS ElastiCache Redis Module Variables
# Version: 1.0
# Provider Version: hashicorp/terraform ~> 1.0

variable "redis_node_type" {
  type        = string
  description = "Instance type for Redis nodes (e.g. cache.t3.medium, cache.r6g.large)"
  validation {
    condition     = can(regex("^cache\\.[t-z][0-9]\\.[\\w]+$", var.redis_node_type))
    error_message = "Must be a valid Redis node type (e.g. cache.t3.medium, cache.r6g.large)."
  }
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the Redis cluster (minimum 2 for HA)"
  default     = 2
  validation {
    condition     = var.redis_num_cache_nodes >= 2 && var.redis_num_cache_nodes <= 6
    error_message = "Number of cache nodes must be between 2 and 6 for optimal performance and HA."
  }
}

variable "redis_port" {
  type        = number
  default     = 6379
  description = "Port number for Redis connections"
  validation {
    condition     = var.redis_port >= 1024 && var.redis_port <= 65535
    error_message = "Port must be between 1024 and 65535."
  }
}

variable "redis_family" {
  type        = string
  description = "Redis engine version family (e.g. redis7.0)"
  default     = "redis7.0"
  validation {
    condition     = can(regex("^redis[6-7]\\.[0-9]$", var.redis_family))
    error_message = "Redis family must be redis6.x or redis7.x."
  }
}

variable "redis_parameter_group_family" {
  type        = string
  description = "Redis parameter group family for performance optimization"
  default     = "redis7.x"
  validation {
    condition     = can(regex("^redis[6-7]\\.x$", var.redis_parameter_group_family))
    error_message = "Parameter group family must be redis6.x or redis7.x."
  }
}

variable "redis_maintenance_window" {
  type        = string
  description = "Preferred maintenance window (UTC) optimized for Egyptian time zone"
  default     = "sat:02:00-sat:04:00"  # Corresponds to 4:00-6:00 AM Egypt time
  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-9][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-9][0-9]$", var.redis_maintenance_window))
    error_message = "Maintenance window must be in the format day:HH:MM-day:HH:MM."
  }
}

variable "redis_snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain Redis snapshots"
  default     = 7
  validation {
    condition     = var.redis_snapshot_retention_limit >= 1 && var.redis_snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 1 and 35 days."
  }
}

variable "redis_snapshot_window" {
  type        = string
  description = "Daily time range for Redis snapshots (UTC) during low traffic periods"
  default     = "00:00-02:00"  # Corresponds to 2:00-4:00 AM Egypt time
  validation {
    condition     = can(regex("^[0-2][0-9]:[0-9][0-9]-[0-2][0-9]:[0-9][0-9]$", var.redis_snapshot_window))
    error_message = "Snapshot window must be in the format HH:MM-HH:MM."
  }
}

variable "redis_subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for multi-AZ Redis deployment in Bahrain region"
  validation {
    condition     = length(var.redis_subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for multi-AZ deployment."
  }
}

variable "redis_security_group_ids" {
  type        = list(string)
  description = "List of security group IDs for Redis cluster access control"
  validation {
    condition     = length(var.redis_security_group_ids) >= 1
    error_message = "At least 1 security group ID is required."
  }
}

variable "redis_at_rest_encryption" {
  type        = bool
  description = "Enable encryption at rest for Redis cluster"
  default     = true
}

variable "redis_transit_encryption" {
  type        = bool
  description = "Enable encryption in transit for Redis cluster"
  default     = true
}

variable "redis_auto_minor_version_upgrade" {
  type        = bool
  description = "Enable automatic minor version upgrades during maintenance window"
  default     = true
}

variable "redis_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for Redis cluster"
  default     = true
}

variable "redis_notification_topic_arn" {
  type        = string
  description = "ARN of SNS topic for Redis cluster notifications"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for Redis cluster components"
  default = {
    Environment = "production"
    Project     = "egyptian-map-of-pi"
    Terraform   = "true"
  }
}

variable "redis_parameter_group_parameters" {
  type = list(object({
    name  = string
    value = string
  }))
  description = "List of Redis parameter group parameters for performance optimization"
  default = [
    {
      name  = "maxmemory-policy"
      value = "volatile-lru"
    },
    {
      name  = "maxmemory-samples"
      value = "10"
    },
    {
      name  = "activedefrag"
      value = "yes"
    },
    {
      name  = "active-defrag-threshold-lower"
      value = "10"
    },
    {
      name  = "active-defrag-threshold-upper"
      value = "30"
    }
  ]
}