# Connection Information
output "db_instance_endpoint" {
  description = "Connection endpoint for the MongoDB RDS instance"
  value       = aws_db_instance.mongodb_instance.endpoint
  sensitive   = false # Endpoint is needed for application configuration
}

output "db_instance_address" {
  description = "DNS hostname of the MongoDB RDS instance"
  value       = aws_db_instance.mongodb_instance.address
  sensitive   = false
}

output "db_instance_port" {
  description = "Port number for MongoDB RDS instance connections"
  value       = aws_db_instance.mongodb_instance.port
  sensitive   = false
}

# Resource Identifiers
output "db_instance_id" {
  description = "Identifier of the MongoDB RDS instance"
  value       = aws_db_instance.mongodb_instance.id
  sensitive   = false
}

output "db_instance_arn" {
  description = "ARN of the MongoDB RDS instance"
  value       = aws_db_instance.mongodb_instance.arn
  sensitive   = false
}

# High Availability Information
output "db_instance_availability_zone" {
  description = "Availability zone of the MongoDB RDS instance"
  value       = aws_db_instance.mongodb_instance.availability_zone
  sensitive   = false
}

output "db_instance_multi_az" {
  description = "Whether the MongoDB RDS instance is multi-AZ"
  value       = aws_db_instance.mongodb_instance.multi_az
  sensitive   = false
}

# Security Configuration
output "db_instance_storage_encrypted" {
  description = "Whether the MongoDB RDS instance storage is encrypted"
  value       = aws_db_instance.mongodb_instance.storage_encrypted
  sensitive   = false
}

output "db_instance_kms_key_id" {
  description = "KMS key ID used for storage encryption"
  value       = aws_db_instance.mongodb_instance.kms_key_id
  sensitive   = true # KMS key ID should be treated as sensitive
}

# Performance and Monitoring
output "db_instance_monitoring_role_arn" {
  description = "ARN of the enhanced monitoring IAM role"
  value       = var.monitoring_interval > 0 ? aws_iam_role.rds_enhanced_monitoring[0].arn : null
  sensitive   = false
}

output "db_instance_performance_insights_enabled" {
  description = "Whether Performance Insights is enabled"
  value       = aws_db_instance.mongodb_instance.performance_insights_enabled
  sensitive   = false
}

# Resource Configuration
output "db_parameter_group_name" {
  description = "Name of the DB parameter group used by the instance"
  value       = aws_db_parameter_group.mongodb_params.name
  sensitive   = false
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group used by the instance"
  value       = aws_db_subnet_group.mongodb_subnet_group.name
  sensitive   = false
}

# Backup Configuration
output "db_instance_backup_retention_period" {
  description = "Backup retention period in days"
  value       = aws_db_instance.mongodb_instance.backup_retention_period
  sensitive   = false
}

output "db_instance_backup_window" {
  description = "Backup window time range"
  value       = aws_db_instance.mongodb_instance.backup_window
  sensitive   = false
}