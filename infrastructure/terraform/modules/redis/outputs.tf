# Redis Cluster Endpoints
output "redis_primary_endpoint" {
  description = "Primary endpoint address for Redis write operations in the Egyptian Map of Pi infrastructure"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = false
}

output "redis_reader_endpoint" {
  description = "Reader endpoint address for Redis read operations, enabling read scaling across replicas"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  sensitive   = false
}

# Redis Connection Details
output "redis_port" {
  description = "Port number for Redis cluster connections (default: 6379)"
  value       = var.redis_port
  sensitive   = false
}

# Redis Configuration Identifiers
output "redis_parameter_group_id" {
  description = "ID of the Redis parameter group containing optimized settings for the Egyptian market"
  value       = aws_elasticache_parameter_group.redis.id
  sensitive   = false
}

output "redis_security_group_id" {
  description = "ID of the Redis security group controlling network access to the cluster"
  value       = aws_security_group.redis.id
  sensitive   = false
}

# Redis Cluster Status
output "redis_status" {
  description = "Current status of the Redis replication group"
  value       = aws_elasticache_replication_group.redis.status
  sensitive   = false
}

# Redis Configuration Details
output "redis_engine_version" {
  description = "Redis engine version running on the cluster"
  value       = aws_elasticache_replication_group.redis.engine_version
  sensitive   = false
}

output "redis_num_cache_clusters" {
  description = "Number of cache clusters in the Redis replication group"
  value       = aws_elasticache_replication_group.redis.num_cache_clusters
  sensitive   = false
}

# Redis Security Configuration
output "redis_encryption_status" {
  description = "Map of encryption settings for the Redis cluster"
  value = {
    at_rest_encryption_enabled  = aws_elasticache_replication_group.redis.at_rest_encryption_enabled
    transit_encryption_enabled  = aws_elasticache_replication_group.redis.transit_encryption_enabled
    auth_token_enabled         = aws_elasticache_replication_group.redis.auth_token_enabled
  }
  sensitive   = false
}

# Redis High Availability Configuration
output "redis_availability_config" {
  description = "Map of high availability settings for the Redis cluster"
  value = {
    multi_az_enabled            = aws_elasticache_replication_group.redis.multi_az_enabled
    automatic_failover_enabled  = aws_elasticache_replication_group.redis.automatic_failover_enabled
    maintenance_window         = aws_elasticache_replication_group.redis.maintenance_window
    snapshot_window           = aws_elasticache_replication_group.redis.snapshot_window
  }
  sensitive   = false
}

# Redis Resource Tags
output "redis_tags" {
  description = "Tags applied to the Redis cluster resources"
  value       = aws_elasticache_replication_group.redis.tags_all
  sensitive   = false
}