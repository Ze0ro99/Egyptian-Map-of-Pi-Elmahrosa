# AWS ElastiCache Redis Module for Egyptian Map of Pi
# Provider: hashicorp/aws ~> 4.0
# Purpose: Deploy highly available Redis cluster for caching and message broker

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

locals {
  namespace = "egyptian-map-pi"
  name      = "${local.namespace}-redis-${var.environment}"
}

# Redis Parameter Group for performance optimization
resource "aws_elasticache_parameter_group" "redis" {
  family = var.redis_family
  name   = "${local.name}-params"

  description = "Redis parameter group for ${local.namespace}"

  # Performance optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "active-defrag-threshold-lower"
    value = "10"
  }

  parameter {
    name  = "active-defrag-threshold-upper"
    value = "30"
  }

  tags = {
    Name        = "${local.name}-params"
    Environment = var.environment
    Project     = local.namespace
    Terraform   = "true"
  }
}

# Redis Subnet Group for network isolation
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.name}-subnet"
  description = "Redis subnet group for ${local.namespace}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${local.name}-subnet"
    Environment = var.environment
    Project     = local.namespace
    Terraform   = "true"
  }
}

# Security Group for Redis access control
resource "aws_security_group" "redis" {
  name        = "${local.name}-sg"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.redis_port
    to_port         = var.redis_port
    protocol        = "tcp"
    security_groups = []  # To be populated by application security groups
    description     = "Redis access from application nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${local.name}-sg"
    Environment = var.environment
    Project     = local.namespace
    Terraform   = "true"
  }
}

# Redis Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${local.name}-cluster"
  replication_group_description = "Redis cluster for ${local.namespace}"
  node_type                    = var.redis_node_type
  port                         = var.redis_port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]
  
  # High Availability Configuration
  automatic_failover_enabled = true
  multi_az_enabled          = true
  num_cache_clusters        = 2
  
  # Security Configuration
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token_enabled         = true
  auth_token                 = random_password.redis_auth_token.result
  
  # Maintenance Configuration
  maintenance_window         = "sun:02:00-sun:04:00"  # 4:00-6:00 AM Egypt time
  snapshot_window           = "00:00-02:00"          # 2:00-4:00 AM Egypt time
  snapshot_retention_limit  = 7
  auto_minor_version_upgrade = true
  
  # Engine Configuration
  engine               = "redis"
  engine_version      = "7.0"
  
  # Notification Configuration
  notification_topic_arn = var.redis_notification_topic_arn

  tags = {
    Name        = "${local.name}-cluster"
    Environment = var.environment
    Project     = local.namespace
    Terraform   = "true"
  }
}

# Generate secure auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# CloudWatch Alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = [var.redis_notification_topic_arn]
  ok_actions         = [var.redis_notification_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = {
    Name        = "${local.name}-cpu-alarm"
    Environment = var.environment
    Project     = local.namespace
    Terraform   = "true"
  }
}

# Outputs for other modules
output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Redis primary endpoint address"
}

output "redis_reader_endpoint" {
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  description = "Redis reader endpoint address"
}

output "redis_port" {
  value       = var.redis_port
  description = "Redis port number"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Redis security group ID"
}