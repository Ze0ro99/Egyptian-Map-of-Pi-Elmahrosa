# Configure AWS Provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Create DB subnet group for RDS instance placement
resource "aws_db_subnet_group" "mongodb_subnet_group" {
  name        = "${var.identifier}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Egyptian Map of Pi MongoDB RDS instance"

  tags = merge(
    var.tags,
    {
      Name = "${var.identifier}-subnet-group"
    }
  )
}

# Create MongoDB-compatible RDS instance
resource "aws_db_instance" "mongodb_instance" {
  identifier = var.identifier
  
  # Instance Configuration
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = var.storage_type
  
  # Engine Configuration
  engine         = "mongodb"  # MongoDB-compatible engine
  engine_version = var.engine_version
  
  # Authentication
  username = var.username
  password = var.password
  
  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.mongodb_subnet_group.name
  vpc_security_group_ids = var.vpc_security_group_ids
  multi_az              = var.multi_az
  availability_zone     = var.multi_az ? null : var.availability_zone
  
  # Backup Configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  
  # Maintenance Configuration
  maintenance_window = var.maintenance_window
  
  # Performance Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.rds_enhanced_monitoring[0].arn : null
  
  # Security Configuration
  storage_encrypted = var.storage_encrypted
  kms_key_id       = var.kms_key_id
  
  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7  # 7 days retention for performance data
  
  # Enhanced Monitoring Role
  depends_on = [
    aws_iam_role_policy_attachment.rds_enhanced_monitoring
  ]
  
  # Additional Configuration
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true
  deletion_protection       = true  # Prevent accidental deletion
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.identifier}-final-snapshot"
  
  # Parameter Group
  parameter_group_name = aws_db_parameter_group.mongodb_params.name
  
  # Tags
  tags = merge(
    var.tags,
    {
      Name = var.identifier
    }
  )
}

# Create Parameter Group for MongoDB optimization
resource "aws_db_parameter_group" "mongodb_params" {
  family = "mongodb${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"
  name   = "${var.identifier}-params"

  parameter {
    name  = "max_connections"
    value = "4000"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.identifier}-params"
    }
  )
}

# Create IAM role for enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  name  = "${var.identifier}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Attach policy for enhanced monitoring
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = var.monitoring_interval > 0 ? 1 : 0
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Create CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.mongodb_instance.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_memory" {
  alarm_name          = "${var.identifier}-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "FreeableMemory"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000000000"  # 1GB in bytes
  alarm_description  = "This metric monitors RDS freeable memory"
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.mongodb_instance.id
  }

  tags = var.tags
}