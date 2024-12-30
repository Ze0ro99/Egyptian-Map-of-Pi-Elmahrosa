# Main Terraform configuration for Egyptian Map of Pi infrastructure
# version: ~> 4.0

# Local variables for resource configuration
locals {
  # Common resource naming convention with Arabic support
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Enhanced tagging strategy including Egyptian compliance
  common_tags = merge(var.tags, {
    Region      = var.aws_region
    Environment = var.environment
    Compliance  = "egyptian-data-protection"
    Locale      = "ar-EG"
  })

  # VPC configuration for multi-AZ deployment
  vpc_config = {
    primary = {
      cidr_block           = "10.0.0.0/16"
      availability_zones   = var.availability_zones
      private_subnets     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
      public_subnets      = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
      enable_nat_gateway  = true
      single_nat_gateway  = false
      enable_vpn_gateway  = true
    }
    dr = {
      cidr_block           = "10.1.0.0/16"
      availability_zones   = ["eu-south-1a", "eu-south-1b", "eu-south-1c"]
      private_subnets     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
      public_subnets      = ["10.1.4.0/24", "10.1.5.0/24", "10.1.6.0/24"]
      enable_nat_gateway  = true
      single_nat_gateway  = false
      enable_vpn_gateway  = true
    }
  }

  # EKS node group configuration
  node_groups = {
    primary = {
      desired_size = var.eks_node_group_scaling.desired_size
      max_size     = var.eks_node_group_scaling.max_size
      min_size     = var.eks_node_group_scaling.min_size
      instance_types = var.eks_node_instance_types
    }
  }

  # Egyptian market optimizations
  egyptian_optimizations = {
    timezone = "Africa/Cairo"
    locale   = "ar_EG.UTF-8"
    backup_retention_period = 30  # Egyptian regulatory requirement
    encryption_enabled     = true
    compliance_mode       = "egyptian-data-protection"
  }
}

# VPC Module for Primary Region (Bahrain)
module "vpc_primary" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "${local.name_prefix}-vpc"
  cidr = local.vpc_config.primary.cidr_block
  
  azs             = local.vpc_config.primary.availability_zones
  private_subnets = local.vpc_config.primary.private_subnets
  public_subnets  = local.vpc_config.primary.public_subnets

  enable_nat_gateway   = local.vpc_config.primary.enable_nat_gateway
  single_nat_gateway   = local.vpc_config.primary.single_nat_gateway
  enable_vpn_gateway   = local.vpc_config.primary.enable_vpn_gateway
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    "kubernetes.io/cluster/${local.name_prefix}-eks" = "shared"
  })
}

# VPC Module for DR Region (Milan)
module "vpc_dr" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"
  providers = {
    aws = aws.dr
  }

  name = "${local.name_prefix}-vpc-dr"
  cidr = local.vpc_config.dr.cidr_block
  
  azs             = local.vpc_config.dr.availability_zones
  private_subnets = local.vpc_config.dr.private_subnets
  public_subnets  = local.vpc_config.dr.public_subnets

  enable_nat_gateway   = local.vpc_config.dr.enable_nat_gateway
  single_nat_gateway   = local.vpc_config.dr.single_nat_gateway
  enable_vpn_gateway   = local.vpc_config.dr.enable_vpn_gateway
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    "kubernetes.io/cluster/${local.name_prefix}-eks-dr" = "shared"
  })
}

# EKS Cluster Module for Primary Region
module "eks_primary" {
  source = "./modules/eks"

  cluster_name    = "${local.name_prefix}-eks"
  cluster_version = var.eks_cluster_version
  
  vpc_id          = module.vpc_primary.vpc_id
  subnet_ids      = module.vpc_primary.private_subnets
  
  node_groups     = local.node_groups
  
  tags = merge(local.common_tags, {
    Region = "primary"
  })

  egyptian_optimizations = local.egyptian_optimizations
}

# EKS Cluster Module for DR Region
module "eks_dr" {
  source = "./modules/eks"
  providers = {
    aws = aws.dr
  }

  cluster_name    = "${local.name_prefix}-eks-dr"
  cluster_version = var.eks_cluster_version
  
  vpc_id          = module.vpc_dr.vpc_id
  subnet_ids      = module.vpc_dr.private_subnets
  
  node_groups     = local.node_groups
  
  tags = merge(local.common_tags, {
    Region = "dr"
  })

  egyptian_optimizations = local.egyptian_optimizations
}

# MongoDB RDS Module
module "mongodb" {
  source = "./modules/rds"

  identifier = "${local.name_prefix}-mongodb"
  instance_class = var.mongodb_instance_class
  allocated_storage = var.mongodb_storage_size
  
  vpc_security_group_ids = [module.eks_primary.cluster_security_group_id]
  subnet_ids = module.vpc_primary.private_subnets
  
  multi_az = true
  backup_retention_period = local.egyptian_optimizations.backup_retention_period
  
  tags = local.common_tags
}

# Redis ElastiCache Module
module "redis" {
  source = "./modules/elasticache"

  cluster_id = "${local.name_prefix}-redis"
  node_type = var.redis_node_type
  num_cache_nodes = var.redis_num_cache_nodes
  
  subnet_group_name = module.vpc_primary.elasticache_subnet_group_name
  security_group_ids = [module.eks_primary.cluster_security_group_id]
  
  tags = local.common_tags
}

# S3 Bucket for Application Assets
module "s3_assets" {
  source = "./modules/s3"

  bucket_name = "${local.name_prefix}-assets"
  versioning_enabled = var.s3_versioning
  
  replication_configuration = {
    role = aws_iam_role.replication.arn
    rules = [{
      id = "asset-replication"
      status = "Enabled"
      destination = {
        bucket = "${local.name_prefix}-assets-dr"
        storage_class = "STANDARD"
      }
    }]
  }
  
  tags = local.common_tags
}

# CloudFront Distribution
module "cdn" {
  source = "./modules/cloudfront"

  distribution_name = "${local.name_prefix}-cdn"
  price_class = var.cdn_price_class
  
  origins = {
    s3 = {
      domain_name = module.s3_assets.bucket_regional_domain_name
      origin_id   = "S3-${local.name_prefix}-assets"
    }
  }
  
  default_cache_behavior = {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${local.name_prefix}-assets"
  }
  
  tags = local.common_tags
}

# Outputs
output "eks_primary_endpoint" {
  description = "Endpoint for primary EKS cluster"
  value       = module.eks_primary.cluster_endpoint
}

output "eks_dr_endpoint" {
  description = "Endpoint for DR EKS cluster"
  value       = module.eks_dr.cluster_endpoint
}

output "mongodb_endpoint" {
  description = "MongoDB RDS endpoint"
  value       = module.mongodb.endpoint
}

output "redis_endpoint" {
  description = "Redis ElastiCache endpoint"
  value       = module.redis.endpoint
}

output "cdn_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.domain_name
}