#!/bin/bash

# Egyptian Map of Pi Infrastructure Setup Script
# Version: 1.0.0
# Description: Automated setup script for Egyptian Map of Pi infrastructure
# with specific optimizations for the Egyptian market including Arabic language
# support, regional compliance, and multi-AZ deployment with DR capabilities.

set -euo pipefail

# Color codes for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Global variables
MAIN_REGION="me-south-1"  # AWS Bahrain region
DR_REGION="eu-south-1"    # AWS Milan region for DR
PROJECT_NAME="egyptian-map-pi"
ENVIRONMENT="production"
KUBERNETES_VERSION="1.27"
DEFAULT_LANGUAGE="ar"
BACKUP_RETENTION_DAYS=90

# Log function with timestamps
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Error handling function
error_handler() {
    log "${RED}Error occurred in script at line $1${NC}"
    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Check prerequisites function
check_prerequisites() {
    log "${YELLOW}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log "${RED}AWS CLI is not installed. Please install AWS CLI v2.${NC}"
        exit 1
    fi
    
    # Check AWS credentials and region
    if ! aws sts get-caller-identity &> /dev/null; then
        log "${RED}AWS credentials not configured. Please run 'aws configure'.${NC}"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log "${RED}Terraform is not installed. Please install Terraform v1.5+.${NC}"
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log "${RED}kubectl is not installed. Please install kubectl v1.27+.${NC}"
        exit 1
    }
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log "${RED}Docker is not installed. Please install Docker.${NC}"
        exit 1
    }

    log "${GREEN}All prerequisites met.${NC}"
    return 0
}

# Setup AWS infrastructure
setup_aws_infrastructure() {
    log "${YELLOW}Setting up AWS infrastructure...${NC}"
    
    # Initialize Terraform
    cd ../terraform
    terraform init
    
    # Create terraform.tfvars
    cat > terraform.tfvars <<EOF
project_name = "${PROJECT_NAME}"
environment = "${ENVIRONMENT}"
aws_region = "${MAIN_REGION}"
availability_zones = ["${MAIN_REGION}a", "${MAIN_REGION}b", "${MAIN_REGION}c"]
eks_cluster_version = "${KUBERNETES_VERSION}"
mongodb_storage_size = 100
redis_num_cache_nodes = 3
s3_versioning = true
cdn_price_class = "PriceClass_200"
EOF

    # Plan and apply Terraform configuration
    terraform plan -out=tfplan
    terraform apply -auto-approve tfplan
    
    # Store outputs for later use
    EKS_CLUSTER_ENDPOINT=$(terraform output -raw eks_primary_endpoint)
    MONGODB_ENDPOINT=$(terraform output -raw mongodb_endpoint)
    REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
    CDN_DOMAIN=$(terraform output -raw cdn_domain_name)
    
    log "${GREEN}AWS infrastructure setup completed.${NC}"
}

# Setup Kubernetes cluster
setup_kubernetes_cluster() {
    log "${YELLOW}Setting up Kubernetes cluster...${NC}"
    
    # Update kubeconfig
    aws eks update-kubeconfig --region ${MAIN_REGION} --name "${PROJECT_NAME}-${ENVIRONMENT}-eks"
    
    # Create namespaces
    kubectl create namespace egyptian-map-pi --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply resource quotas
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
  namespace: egyptian-map-pi
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
EOF

    # Setup RBAC
    kubectl apply -f ../kubernetes/rbac/
    
    # Apply network policies
    kubectl apply -f ../kubernetes/network-policies/
    
    log "${GREEN}Kubernetes cluster setup completed.${NC}"
}

# Deploy applications
deploy_applications() {
    log "${YELLOW}Deploying applications...${NC}"
    
    # Build and push Docker images
    cd ../../src
    
    # Backend services
    docker-compose -f ../infrastructure/docker/docker-compose.prod.yml build
    docker-compose -f ../infrastructure/docker/docker-compose.prod.yml push
    
    # Deploy applications
    kubectl apply -f ../infrastructure/kubernetes/deployments/
    kubectl apply -f ../infrastructure/kubernetes/services/
    kubectl apply -f ../infrastructure/kubernetes/ingress/
    
    # Setup monitoring
    kubectl apply -f ../infrastructure/kubernetes/monitoring/
    
    # Wait for deployments
    kubectl wait --for=condition=available --timeout=300s deployment --all -n egyptian-map-pi
    
    log "${GREEN}Applications deployed successfully.${NC}"
}

# Setup monitoring and logging
setup_monitoring() {
    log "${YELLOW}Setting up monitoring and logging...${NC}"
    
    # Install Prometheus and Grafana
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --set grafana.adminPassword="${GRAFANA_PASSWORD}" \
        --values ../kubernetes/monitoring/prometheus-values.yaml
    
    # Setup log aggregation
    kubectl apply -f ../kubernetes/logging/
    
    log "${GREEN}Monitoring and logging setup completed.${NC}"
}

# Main execution
main() {
    log "${YELLOW}Starting Egyptian Map of Pi infrastructure setup...${NC}"
    
    # Check prerequisites
    check_prerequisites
    
    # Setup infrastructure
    setup_aws_infrastructure
    
    # Setup Kubernetes
    setup_kubernetes_cluster
    
    # Deploy applications
    deploy_applications
    
    # Setup monitoring
    setup_monitoring
    
    log "${GREEN}Infrastructure setup completed successfully!${NC}"
    
    # Print important information
    cat <<EOF

${YELLOW}=== Egyptian Map of Pi Infrastructure Details ===${NC}
EKS Cluster Endpoint: ${EKS_CLUSTER_ENDPOINT}
MongoDB Endpoint: ${MONGODB_ENDPOINT}
Redis Endpoint: ${REDIS_ENDPOINT}
CDN Domain: ${CDN_DOMAIN}

${YELLOW}Next Steps:${NC}
1. Configure DNS records for your domain
2. Setup SSL certificates
3. Configure monitoring alerts
4. Perform security assessment

${YELLOW}For support:${NC}
- Documentation: https://docs.egyptianmapofpi.com
- Support: support@egyptianmapofpi.com
EOF
}

# Script execution
main "$@"