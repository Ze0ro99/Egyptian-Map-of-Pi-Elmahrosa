# Core cluster information
output "cluster_id" {
  description = "The name/id of the EKS cluster for the Egyptian Map of Pi platform"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "The endpoint URL for the Kubernetes API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

# Node group information
output "node_group_id" {
  description = "EKS node group identifier"
  value       = aws_eks_node_group.main.id
}

output "node_group_status" {
  description = "Status of the EKS node group"
  value       = aws_eks_node_group.main.status
}

output "node_group_resources" {
  description = "List of objects containing information about underlying resources of the node group"
  value       = aws_eks_node_group.main.resources
}

# Security and networking
output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster control plane"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_vpc_config" {
  description = "VPC configuration for the EKS cluster"
  value = {
    vpc_id             = aws_eks_cluster.main.vpc_config[0].vpc_id
    subnet_ids         = aws_eks_cluster.main.vpc_config[0].subnet_ids
    security_group_ids = aws_eks_cluster.main.vpc_config[0].security_group_ids
  }
}

# Monitoring and logging
output "cluster_logging_enabled_types" {
  description = "List of enabled control plane logging types"
  value       = aws_eks_cluster.main.enabled_cluster_log_types
}

output "node_group_scaling_config" {
  description = "Current scaling configuration of the node group"
  value = {
    desired_size = aws_eks_node_group.main.scaling_config[0].desired_size
    max_size     = aws_eks_node_group.main.scaling_config[0].max_size
    min_size     = aws_eks_node_group.main.scaling_config[0].min_size
  }
}

# Tags
output "cluster_tags" {
  description = "Tags applied to the EKS cluster"
  value       = aws_eks_cluster.main.tags
}

# Platform-specific outputs
output "platform_info" {
  description = "Egyptian Map of Pi platform-specific cluster information"
  value = {
    platform_name = "egyptian-map-of-pi"
    region        = "me-south-1"  # AWS Bahrain region
    environment   = "production"
    kubernetes_version = aws_eks_cluster.main.version
  }
}