#!/usr/bin/env bash

# Egyptian Map of Pi Deployment Script
# Version: 1.0.0
# Description: Advanced deployment automation script with enhanced security and validation

set -euo pipefail
IFS=$'\n\t'

# Required tool versions
# kubectl v1.27+
# aws-cli v2.0+
# docker v24.0+

# Global Configuration
readonly ENVIRONMENTS=("production" "staging")
readonly SERVICES=("api-gateway" "web" "auth-service" "location-service" "marketplace-service" "messaging-service" "payment-service")
declare -A AWS_REGIONS=(
    ["production"]="me-south-1"
    ["staging"]="me-south-1"
)
readonly NAMESPACE="app"
readonly LOG_FILE="/var/log/egyptian-map-pi/deployment.log"
readonly TIMEOUT=300

# Logging configuration
setup_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
    log "Deployment started at $(date '+%Y-%m-%d %H:%M:%S')"
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Enhanced prerequisite checking
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Validate kubectl version and context
    if ! kubectl version --client --short | grep -q "v1.2[7-9]"; then
        log "ERROR: kubectl version 1.27+ is required"
        return 1
    }

    # Verify AWS CLI configuration
    if ! aws configure list | grep -q "me-south-1"; then
        log "ERROR: AWS CLI not configured for Middle East region"
        return 1
    }

    # Check Docker installation
    if ! docker info >/dev/null 2>&1; then
        log "ERROR: Docker daemon not running"
        return 1
    }

    # Validate cluster connectivity
    if ! kubectl auth can-i get nodes >/dev/null 2>&1; then
        log "ERROR: Cannot connect to Kubernetes cluster"
        return 1
    }

    # Verify required secrets exist
    if ! kubectl get secret -n "$NAMESPACE" egyptian-map-pi-tls >/dev/null 2>&1; then
        log "ERROR: Required TLS secret not found"
        return 1
    }

    log "Prerequisites check completed successfully"
    return 0
}

# Build and validate Docker images
build_images() {
    local environment=$1
    local version_tag=$2
    
    log "Building images for environment: $environment, version: $version_tag"

    for service in "${SERVICES[@]}"; do
        log "Building $service image..."
        
        # Security scan of base image
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy \
            "egyptian-map-pi/$service:base"

        # Multi-stage build with security hardening
        docker build \
            --build-arg ENV="$environment" \
            --build-arg VERSION="$version_tag" \
            --no-cache \
            --pull \
            --tag "egyptian-map-pi/$service:$version_tag" \
            --file "docker/$service/Dockerfile" \
            --security-opt no-new-privileges \
            .

        # Sign the image
        cosign sign --key cosign.key "egyptian-map-pi/$service:$version_tag"

        # Push to registry
        docker push "egyptian-map-pi/$service:$version_tag"
    done
}

# Deploy infrastructure components
deploy_infrastructure() {
    local environment=$1
    
    log "Deploying infrastructure for environment: $environment"

    # Apply namespace and quotas
    kubectl apply -f "kubernetes/namespace.yaml"
    kubectl apply -f "kubernetes/resource-quotas.yaml"

    # Configure network policies
    kubectl apply -f "kubernetes/network-policies.yaml"

    # Deploy service mesh components
    kubectl apply -f "kubernetes/istio/"

    # Setup monitoring
    kubectl apply -f "kubernetes/monitoring/"

    # Configure auto-scaling
    kubectl apply -f "kubernetes/hpa/"
}

# Deploy application components
deploy_applications() {
    local environment=$1
    local version_tag=$2
    
    log "Deploying applications for environment: $environment, version: $version_tag"

    # Initialize canary deployment
    for service in "${SERVICES[@]}"; do
        log "Deploying $service..."
        
        # Apply deployment with canary
        kubectl apply -f <(envsubst < "kubernetes/deployments/$service.yaml")
        
        # Wait for rollout
        kubectl rollout status deployment "$service" -n "$NAMESPACE" --timeout="${TIMEOUT}s"
        
        # Verify deployment health
        if ! kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
            log "ERROR: Deployment of $service failed"
            kubectl rollout undo deployment "$service" -n "$NAMESPACE"
            return 1
        fi
    done

    # Apply ingress configuration
    kubectl apply -f "kubernetes/ingress.yaml"
}

# Comprehensive deployment verification
verify_deployment() {
    local environment=$1
    
    log "Verifying deployment for environment: $environment"

    # Check pod health
    if ! kubectl get pods -n "$NAMESPACE" | grep -v "Running\|Completed"; then
        log "ERROR: Unhealthy pods detected"
        return 1
    fi

    # Verify service mesh
    if ! istioctl analyze -n "$NAMESPACE"; then
        log "ERROR: Service mesh configuration issues detected"
        return 1
    }

    # Check SSL certificates
    if ! kubectl get certificate -n "$NAMESPACE" egyptian-map-pi-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' | grep -q "True"; then
        log "ERROR: SSL certificate not ready"
        return 1
    }

    # Validate metrics collection
    if ! curl -s "http://prometheus:9090/api/v1/targets" | grep -q "egyptian-map-pi"; then
        log "ERROR: Metrics collection not working"
        return 1
    }

    log "Deployment verification completed successfully"
    return 0
}

# Main deployment function
deploy_environment() {
    local environment=$1
    local version_tag=$2

    log "Starting deployment process for $environment environment"

    # Set AWS region
    aws configure set region "${AWS_REGIONS[$environment]}"

    # Execute deployment steps
    check_prerequisites || exit 1
    build_images "$environment" "$version_tag" || exit 1
    deploy_infrastructure "$environment" || exit 1
    deploy_applications "$environment" "$version_tag" || exit 1
    verify_deployment "$environment" || exit 1

    log "Deployment completed successfully for $environment environment"
}

# Script entry point
main() {
    if [[ $# -ne 2 ]]; then
        echo "Usage: $0 <environment> <version_tag>"
        echo "Environments: ${ENVIRONMENTS[*]}"
        exit 1
    }

    local environment=$1
    local version_tag=$2

    if [[ ! " ${ENVIRONMENTS[*]} " =~ ${environment} ]]; then
        echo "Invalid environment. Must be one of: ${ENVIRONMENTS[*]}"
        exit 1
    }

    setup_logging
    deploy_environment "$environment" "$version_tag"
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi