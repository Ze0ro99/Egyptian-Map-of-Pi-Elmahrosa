# Version constraints for Terraform and required providers
# version: ~> 4.0
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Primary AWS provider configuration for main region (Bahrain)
provider "aws" {
  region = var.aws_region

  # Common resource tags for all AWS resources
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "egyptian-map-of-pi"
      ManagedBy   = "terraform"
      Region      = var.aws_region
    }
  }

  # Assume role if specified for different AWS accounts
  dynamic "assume_role" {
    for_each = var.aws_assume_role_arn != null ? [1] : []
    content {
      role_arn = var.aws_assume_role_arn
    }
  }
}

# Secondary AWS provider for Disaster Recovery region (Milan)
provider "aws" {
  alias  = "dr"
  region = "eu-south-1"

  default_tags {
    tags = {
      Environment = "dr"
      Project     = "egyptian-map-of-pi"
      ManagedBy   = "terraform"
      Region      = "eu-south-1"
    }
  }
}

# Kubernetes provider configuration for EKS cluster management
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  token                  = module.eks.cluster_token

  # AWS EKS authentication configuration
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      "${var.project_name}-${var.environment}",
      "--region",
      var.aws_region
    ]
  }
}

# Helm provider configuration for Kubernetes package management
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
    token                  = module.eks.cluster_token

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        "${var.project_name}-${var.environment}",
        "--region",
        var.aws_region
      ]
    }
  }

  # Helm chart repository configuration
  repository_config_path = "${path.module}/.helm/repositories.yaml"
  repository_cache      = "${path.module}/.helm/cache"
}