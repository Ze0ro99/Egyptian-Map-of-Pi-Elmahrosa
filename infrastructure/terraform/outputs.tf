# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint URL for the Kubernetes API server in AWS Bahrain region"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster for Egyptian Map of Pi platform"
  value       = module.eks.cluster_id
  sensitive   = false
}

output "eks_cluster_certificate" {
  description = "Base64 encoded certificate data for cluster authentication"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster control plane"
  value       = module.eks.cluster_security_group_id
  sensitive   = false
}

output "eks_node_group_id" {
  description = "ID of the EKS node group for application workloads"
  value       = module.eks.node_group_id
  sensitive   = false
}

# MongoDB RDS Outputs
output "mongodb_endpoint" {
  description = "Connection endpoint for MongoDB RDS instance"
  value       = module.rds.db_instance_endpoint
  sensitive   = false
}

output "mongodb_port" {
  description = "Port number for MongoDB RDS connections"
  value       = module.rds.db_instance_port
  sensitive   = false
}

output "mongodb_availability_zone" {
  description = "Availability zone of the MongoDB RDS instance"
  value       = module.rds.db_instance_availability_zone
  sensitive   = false
}

# Redis ElastiCache Outputs
output "redis_endpoint" {
  description = "Primary endpoint for Redis ElastiCache cluster"
  value       = module.elasticache.primary_endpoint
  sensitive   = false
}

output "redis_port" {
  description = "Port number for Redis connections"
  value       = 6379
  sensitive   = false
}

output "redis_auth_token" {
  description = "Authentication token for Redis cluster access"
  value       = module.elasticache.auth_token
  sensitive   = true
}

# S3 Storage Outputs
output "s3_bucket_name" {
  description = "Name of S3 bucket for media storage"
  value       = module.s3.bucket_name
  sensitive   = false
}

output "s3_bucket_region" {
  description = "AWS region for S3 bucket (me-south-1)"
  value       = "me-south-1"
  sensitive   = false
}

# CloudFront CDN Outputs
output "cdn_domain_name" {
  description = "CloudFront distribution domain name for content delivery"
  value       = module.cloudfront.domain_name
  sensitive   = false
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID for cache management"
  value       = module.cloudfront.distribution_id
  sensitive   = false
}

# Network Configuration Outputs
output "vpc_id" {
  description = "ID of the VPC hosting the Egyptian Map of Pi infrastructure"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for internal resources"
  value       = module.vpc.private_subnet_ids
  sensitive   = false
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for external-facing resources"
  value       = module.vpc.public_subnet_ids
  sensitive   = false
}

# Platform Information
output "platform_info" {
  description = "Egyptian Map of Pi platform deployment information"
  value = {
    platform_name = "egyptian-map-of-pi"
    environment   = "production"
    region        = "me-south-1"
    availability_zones = [
      "me-south-1a",
      "me-south-1b",
      "me-south-1c"
    ]
    kubernetes_version = module.eks.cluster_version
  }
  sensitive = false
}

# Monitoring and Logging
output "monitoring_config" {
  description = "Monitoring and logging configuration endpoints"
  value = {
    prometheus_endpoint = module.monitoring.prometheus_endpoint
    grafana_endpoint   = module.monitoring.grafana_endpoint
    kibana_endpoint    = module.monitoring.kibana_endpoint
  }
  sensitive = false
}