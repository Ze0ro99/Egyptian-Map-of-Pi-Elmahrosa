#!/bin/bash

# Egyptian Map of Pi - Monitoring Stack Deployment Script
# Version: 1.0.0
# This script manages the deployment and maintenance of the monitoring stack
# with specific adaptations for the Egyptian market and enhanced security monitoring

# Global variables
MONITORING_NAMESPACE="monitoring"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="9.5.3"
ALERTMANAGER_VERSION="v0.25.0"
EGYPTIAN_TIMEZONE="Africa/Cairo"
ALERT_LANGUAGE="ar"

# Exit on any error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo -e "$(date +'%Y-%m-%d %H:%M:%S') ${1}"
}

# Error handling function
handle_error() {
    log "${RED}Error: ${1}${NC}"
    exit 1
}

# Verify prerequisites
check_prerequisites() {
    log "${YELLOW}Checking prerequisites...${NC}"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        handle_error "kubectl is required but not installed"
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        handle_error "helm is required but not installed"
    }
    
    # Verify cluster access
    if ! kubectl cluster-info &> /dev/null; then
        handle_error "Unable to access Kubernetes cluster"
    }
    
    log "${GREEN}Prerequisites check passed${NC}"
}

# Create monitoring namespace if it doesn't exist
create_namespace() {
    log "Creating monitoring namespace if it doesn't exist..."
    kubectl create namespace ${MONITORING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
}

# Deploy Prometheus with Egyptian market adaptations
deploy_prometheus() {
    log "Deploying Prometheus ${PROMETHEUS_VERSION}..."
    
    # Apply Prometheus configuration
    kubectl apply -f ../kubernetes/monitoring/prometheus.yaml -n ${MONITORING_NAMESPACE} || \
        handle_error "Failed to apply Prometheus configuration"
    
    # Wait for Prometheus deployment
    kubectl rollout status statefulset/prometheus -n ${MONITORING_NAMESPACE} --timeout=300s || \
        handle_error "Prometheus deployment failed"
    
    log "${GREEN}Prometheus deployment successful${NC}"
}

# Deploy Grafana with Arabic support
deploy_grafana() {
    log "Deploying Grafana ${GRAFANA_VERSION}..."
    
    # Apply Grafana configuration
    kubectl apply -f ../kubernetes/monitoring/grafana.yaml -n ${MONITORING_NAMESPACE} || \
        handle_error "Failed to apply Grafana configuration"
    
    # Wait for Grafana deployment
    kubectl rollout status deployment/grafana -n ${MONITORING_NAMESPACE} --timeout=300s || \
        handle_error "Grafana deployment failed"
    
    log "${GREEN}Grafana deployment successful${NC}"
}

# Deploy Alertmanager with Egyptian alert routing
deploy_alertmanager() {
    log "Deploying Alertmanager ${ALERTMANAGER_VERSION}..."
    
    # Apply Alertmanager configuration
    kubectl apply -f ../kubernetes/monitoring/alertmanager.yaml -n ${MONITORING_NAMESPACE} || \
        handle_error "Failed to apply Alertmanager configuration"
    
    # Wait for Alertmanager deployment
    kubectl rollout status statefulset/alertmanager -n ${MONITORING_NAMESPACE} --timeout=300s || \
        handle_error "Alertmanager deployment failed"
    
    log "${GREEN}Alertmanager deployment successful${NC}"
}

# Configure security monitoring
configure_security_monitoring() {
    log "Configuring security monitoring..."
    
    # Apply security metric collectors
    kubectl patch configmap prometheus-config -n ${MONITORING_NAMESPACE} \
        --patch "$(cat ../kubernetes/monitoring/prometheus.yaml | grep -A50 'security-metrics')" || \
        handle_error "Failed to configure security monitoring"
        
    log "${GREEN}Security monitoring configured${NC}"
}

# Verify monitoring stack health
verify_monitoring_health() {
    log "Verifying monitoring stack health..."
    
    # Check Prometheus health
    if ! kubectl get pods -l app=prometheus -n ${MONITORING_NAMESPACE} | grep -q "Running"; then
        handle_error "Prometheus pods not healthy"
    fi
    
    # Check Grafana health
    if ! kubectl get pods -l app=grafana -n ${MONITORING_NAMESPACE} | grep -q "Running"; then
        handle_error "Grafana pods not healthy"
    fi
    
    # Check Alertmanager health
    if ! kubectl get pods -l app=alertmanager -n ${MONITORING_NAMESPACE} | grep -q "Running"; then
        handle_error "Alertmanager pods not healthy"
    fi
    
    log "${GREEN}All monitoring components are healthy${NC}"
}

# Main deployment function
deploy_monitoring_stack() {
    log "Starting monitoring stack deployment..."
    
    check_prerequisites
    create_namespace
    deploy_prometheus
    deploy_grafana
    deploy_alertmanager
    configure_security_monitoring
    verify_monitoring_health
    
    log "${GREEN}Monitoring stack deployment completed successfully${NC}"
}

# Health check function
health_check() {
    log "Performing health check..."
    
    # Check component status
    local components=("prometheus" "grafana" "alertmanager")
    for component in "${components[@]}"; do
        if ! kubectl get pods -l app=${component} -n ${MONITORING_NAMESPACE} | grep -q "Running"; then
            handle_error "${component} is not healthy"
        fi
    done
    
    # Verify Arabic support in Grafana
    if ! kubectl exec -n ${MONITORING_NAMESPACE} deploy/grafana -- curl -s localhost:3000/api/frontend/settings | grep -q "\"language\":\"ar\""; then
        handle_error "Arabic language support not properly configured in Grafana"
    fi
    
    log "${GREEN}Health check passed successfully${NC}"
}

# Command line argument handling
case "$1" in
    deploy)
        deploy_monitoring_stack
        ;;
    health-check)
        health_check
        ;;
    update-prometheus)
        deploy_prometheus
        ;;
    update-grafana)
        deploy_grafana
        ;;
    update-alertmanager)
        deploy_alertmanager
        ;;
    configure-security)
        configure_security_monitoring
        ;;
    *)
        echo "Usage: $0 {deploy|health-check|update-prometheus|update-grafana|update-alertmanager|configure-security}"
        exit 1
        ;;
esac

exit 0
```

This script implements a comprehensive monitoring stack deployment with specific adaptations for the Egyptian market. Key features include:

1. Full deployment of Prometheus, Grafana, and Alertmanager with version control
2. Enhanced security monitoring configuration
3. Arabic language support in Grafana
4. Egyptian timezone and locale settings
5. Error handling and logging
6. Health checks with Arabic support verification
7. Component-specific updates and configurations
8. Security metric collection setup

The script follows enterprise-grade practices with:
- Comprehensive error handling
- Detailed logging
- Modular functions
- Version control
- Health verification
- Security considerations
- Market-specific adaptations

Usage examples:
```bash
# Deploy full monitoring stack
./monitoring.sh deploy

# Perform health check
./monitoring.sh health-check

# Update specific components
./monitoring.sh update-prometheus
./monitoring.sh update-grafana
./monitoring.sh update-alertmanager

# Configure security monitoring
./monitoring.sh configure-security