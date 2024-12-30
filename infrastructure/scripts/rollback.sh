#!/usr/bin/env bash

# Egyptian Map of Pi - Deployment Rollback Script
# Version: 1.0.0
# Supports parallel rollback operations with < 5 minute recovery time
# Compatible with kubectl v1.27+ and AWS CLI v2.0+

set -euo pipefail

# Import environment configurations
ENVIRONMENTS=('production' 'staging')
SERVICES=('api-gateway' 'web' 'auth-service' 'location-service' 'marketplace-service' 'messaging-service' 'payment-service')
AWS_REGIONS=('me-south-1' 'me-south-1')
NAMESPACE="egyptian-map-pi"

# Rollback configuration
ROLLBACK_TIMEOUT=300 # 5 minutes maximum rollback time
MAX_PARALLEL_ROLLBACKS=3
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_INTERVAL=10

# Logging configuration
LOGFILE="/var/log/egyptian-map-pi/rollback.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function with timestamp
log() {
    local level=$1
    local message=$2
    echo -e "${TIMESTAMP} [${level}] ${message}" | tee -a "${LOGFILE}"
}

# Check prerequisites for rollback operation
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check kubectl version
    if ! kubectl version --client --short | grep -q "v1.2[7-9]"; then
        log "ERROR" "kubectl version 1.27+ is required"
        return 1
    }

    # Verify AWS CLI
    if ! aws --version | grep -q "aws-cli/2"; then
        log "ERROR" "AWS CLI v2.0+ is required"
        return 1
    }

    # Check cluster connectivity
    if ! kubectl cluster-info &>/dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster"
        return 1
    }

    # Verify namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &>/dev/null; then
        log "ERROR" "Namespace ${NAMESPACE} does not exist"
        return 1
    }

    return 0
}

# Get previous stable revision with enhanced error handling
get_previous_revision() {
    local service=$1
    local environment=$2
    local max_attempts=3
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log "INFO" "Attempting to get previous revision for ${service} (attempt ${attempt}/${max_attempts})"
        
        local revision
        revision=$(kubectl rollout history deployment "${service}" -n "${NAMESPACE}" | 
                  grep -v "REVISION" | 
                  sort -rn | 
                  sed -n '2p' | 
                  awk '{print $1}')

        if [ -n "${revision}" ]; then
            # Verify revision stability
            if kubectl rollout history deployment "${service}" -n "${NAMESPACE}" --revision="${revision}" | 
               grep -q "SuccessfulDeployment"; then
                log "INFO" "Found stable revision ${revision} for ${service}"
                echo "${revision}"
                return 0
            fi
        fi

        attempt=$((attempt + 1))
        sleep 5
    done

    log "ERROR" "Failed to get previous stable revision for ${service}"
    return 1
}

# Perform rollback with parallel processing and enhanced monitoring
rollback_deployment() {
    local service=$1
    local environment=$2
    local revision=$3
    local start_time
    start_time=$(date +%s)

    log "INFO" "Starting rollback of ${service} to revision ${revision}"

    # Create rollback operation record
    local operation_id
    operation_id=$(uuidgen)
    log "INFO" "Rollback operation ID: ${operation_id}"

    # Execute rollback
    if ! kubectl rollout undo deployment "${service}" -n "${NAMESPACE}" --to-revision="${revision}"; then
        log "ERROR" "Failed to initiate rollback for ${service}"
        return 1
    }

    # Monitor rollback progress with timeout
    local timeout=$ROLLBACK_TIMEOUT
    while [ $timeout -gt 0 ]; do
        if kubectl rollout status deployment "${service}" -n "${NAMESPACE}" --timeout=5s &>/dev/null; then
            local end_time
            end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log "INFO" "Rollback of ${service} completed successfully in ${duration} seconds"
            return 0
        fi

        timeout=$((timeout - 5))
        sleep 5
    done

    log "ERROR" "Rollback timeout exceeded for ${service}"
    return 1
}

# Verify rollback success with comprehensive health checks
verify_rollback() {
    local service=$1
    local environment=$2
    local retries=$HEALTH_CHECK_RETRIES

    while [ $retries -gt 0 ]; do
        log "INFO" "Verifying rollback for ${service} (attempts remaining: ${retries})"

        # Check deployment status
        if ! kubectl get deployment "${service}" -n "${NAMESPACE}" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
            log "WARN" "Deployment not available, retrying..."
            retries=$((retries - 1))
            sleep "${HEALTH_CHECK_INTERVAL}"
            continue
        }

        # Verify pod health
        local ready_pods
        ready_pods=$(kubectl get deployment "${service}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
        local desired_pods
        desired_pods=$(kubectl get deployment "${service}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}')

        if [ "${ready_pods}" != "${desired_pods}" ]; then
            log "WARN" "Pod readiness mismatch (${ready_pods}/${desired_pods}), retrying..."
            retries=$((retries - 1))
            sleep "${HEALTH_CHECK_INTERVAL}"
            continue
        }

        # Check service endpoints
        if ! kubectl get endpoints "${service}" -n "${NAMESPACE}" | grep -q "${service}"; then
            log "WARN" "Service endpoints not ready, retrying..."
            retries=$((retries - 1))
            sleep "${HEALTH_CHECK_INTERVAL}"
            continue
        }

        log "INFO" "Rollback verification successful for ${service}"
        return 0
    done

    log "ERROR" "Rollback verification failed for ${service}"
    return 1
}

# Main rollback function
rollback() {
    local environment=$1
    local services=("${@:2}")
    local failed_services=()

    # Validate environment
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${environment} " ]]; then
        log "ERROR" "Invalid environment: ${environment}"
        return 1
    }

    # Check prerequisites
    if ! check_prerequisites; then
        log "ERROR" "Prerequisites check failed"
        return 1
    }

    log "INFO" "Starting rollback operation for environment: ${environment}"

    # Process services in parallel with maximum concurrent limit
    local service_count=${#services[@]}
    local current_index=0

    while [ $current_index -lt $service_count ]; do
        local parallel_batch=()
        local batch_size=0

        while [ $batch_size -lt $MAX_PARALLEL_ROLLBACKS ] && [ $current_index -lt $service_count ]; do
            parallel_batch+=("${services[$current_index]}")
            current_index=$((current_index + 1))
            batch_size=$((batch_size + 1))
        done

        # Process batch in parallel
        for service in "${parallel_batch[@]}"; do
            {
                log "INFO" "Processing rollback for ${service}"
                local revision
                if ! revision=$(get_previous_revision "${service}" "${environment}"); then
                    log "ERROR" "Failed to get previous revision for ${service}"
                    failed_services+=("${service}")
                    continue
                fi

                if ! rollback_deployment "${service}" "${environment}" "${revision}"; then
                    log "ERROR" "Rollback failed for ${service}"
                    failed_services+=("${service}")
                    continue
                fi

                if ! verify_rollback "${service}" "${environment}"; then
                    log "ERROR" "Rollback verification failed for ${service}"
                    failed_services+=("${service}")
                    continue
                fi

                log "INFO" "Rollback completed successfully for ${service}"
            } &
        done

        # Wait for batch completion
        wait
    done

    # Report results
    if [ ${#failed_services[@]} -eq 0 ]; then
        log "INFO" "All services rolled back successfully"
        return 0
    else
        log "ERROR" "Rollback failed for services: ${failed_services[*]}"
        return 1
    fi
}

# Script execution
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <environment> <service1> [service2 ...]"
    exit 1
fi

# Execute rollback with provided arguments
rollback "$@"