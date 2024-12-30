# Provider configuration
# AWS Provider v5.0+ for enhanced security features and EKS support
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Local variables for enhanced configuration management
locals {
  cluster_name = var.cluster_name
  tags = merge(
    var.tags,
    {
      "kubernetes.io/cluster/${var.cluster_name}" = "owned"
      "Platform"                                  = "egyptian-map-of-pi"
    }
  )
}

# KMS key for cluster encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster ${local.cluster_name} encryption"
  deletion_window_in_days = 7
  enable_key_rotation    = true
  tags                   = local.tags
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = local.cluster_name
  version  = var.cluster_version
  role_arn = data.aws_iam_role.cluster_role.arn

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = var.cluster_endpoint_private_access
    endpoint_public_access  = var.cluster_endpoint_public_access
    security_group_ids      = var.cluster_security_group_ids
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = var.cluster_enabled_log_types

  # Enable OIDC provider for service account integration
  identity {
    oidc {
      enabled = true
    }
  }

  # Configure cluster add-ons
  dynamic "addon" {
    for_each = var.cluster_addons
    content {
      addon_name               = addon.key
      addon_version           = addon.value.version
      resolve_conflicts       = addon.value.resolve_conflicts
      service_account_role_arn = addon.value.service_account_role_arn
    }
  }

  tags = local.tags

  # Ensure proper ordering of dependencies
  depends_on = [
    aws_kms_key.eks
  ]
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.cluster_name}-node-group"
  node_role_arn   = data.aws_iam_role.node_role.arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = var.node_group_config.desired_size
    max_size     = var.node_group_config.max_size
    min_size     = var.node_group_config.min_size
  }

  # Launch template configuration
  launch_template {
    name    = "${local.cluster_name}-node-template"
    version = "$Latest"

    # Configure instance specifications
    instance_types = var.node_group_config.instance_types
    
    # Configure capacity type for cost optimization
    capacity_type = "ON_DEMAND"

    # Configure node labels
    labels = {
      "role"      = "application"
      "platform"  = "egyptian-map-of-pi"
      "terraform" = "true"
    }

    # Configure taints for workload isolation
    taint {
      key    = "dedicated"
      value  = "application"
      effect = "NO_SCHEDULE"
    }
  }

  # Update configuration for zero-downtime updates
  update_config {
    max_unavailable_percentage = 33
  }

  # Configure auto-scaling
  scaling_config {
    desired_size = var.node_group_config.desired_size
    max_size     = var.node_group_config.max_size
    min_size     = var.node_group_config.min_size
  }

  # Node group tags
  tags = merge(
    local.tags,
    {
      "k8s.io/cluster-autoscaler/enabled" = "true"
      "k8s.io/cluster-autoscaler/${local.cluster_name}" = "owned"
    }
  )

  # Lifecycle policy to ignore changes that should be managed elsewhere
  lifecycle {
    ignore_changes = [
      scaling_config[0].desired_size
    ]
  }

  depends_on = [
    aws_eks_cluster.main
  ]
}

# Data source for cluster IAM role
data "aws_iam_role" "cluster_role" {
  name = "eks-cluster-role"
}

# Data source for node group IAM role
data "aws_iam_role" "node_role" {
  name = coalesce(var.node_group_iam_role_name, "eks-node-group-role")
}

# Outputs for use in other modules
output "cluster_endpoint" {
  description = "Endpoint for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority" {
  description = "Certificate authority data for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "node_group_id" {
  description = "EKS node group ID"
  value       = aws_eks_node_group.main.id
}

output "node_group_status" {
  description = "Status of the EKS node group"
  value       = aws_eks_node_group.main.status
}