# Backend configuration for Egyptian Map of Pi Terraform state management
# Version: 1.0.0
# This configuration establishes a secure, encrypted, and regionally compliant 
# state storage solution with proper locking mechanisms for concurrent access

terraform {
  backend "s3" {
    # Primary state bucket in AWS Bahrain region (me-south-1) for regional compliance
    bucket = "egyptian-map-of-pi-terraform-state"
    
    # Dynamic state file path based on environment workspace
    key = "environments/${terraform.workspace}/terraform.tfstate"
    
    # Middle East (Bahrain) region for primary deployment
    region = "me-south-1"
    
    # DynamoDB table for state locking and consistency
    dynamodb_table = "egyptian-map-of-pi-terraform-locks"
    
    # Security configurations
    encrypt        = true
    acl           = "private"
    
    # KMS encryption key for additional security
    kms_key_id    = "arn:aws:kms:me-south-1:ACCOUNT_ID:key/KEY_ID"
    
    # Workspace configuration for environment separation
    workspace_key_prefix = "environments"
    
    # Additional S3 backend configurations
    force_path_style = false
    
    # Version 4 signature for improved security
    use_path_style = false
    
    # Enable versioning for state history
    versioning = true
    
    # Error handling and retry configuration
    skip_credentials_validation = false
    skip_region_validation     = false
    skip_metadata_api_check    = false
    
    # Lifecycle configurations
    lifecycle {
      prevent_destroy = true
    }
  }
}

# Backend configuration validation
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}