#!/bin/bash

# Script to run Mend across all branches in the repository
# Repository: KOSASIH/egyptian-map-of-pi--eiweuo
# Author: Ze0ro99
# Date: 2025-04-21

# Exit script on any error
set -e

# Define repository details
REPO_OWNER="KOSASIH"
REPO_NAME="egyptian-map-of-pi--eiweuo"

# Define Mend configuration
TOUCH_LIMIT=20
MEND_CONFIG_FILE=".whitesource"

# Function to update Mend configuration
update_mend_config() {
  if [ -f "$MEND_CONFIG_FILE" ]; then
    echo "Updating Mend configuration..."
    jq '.scanSettings.baseBranches = [] | .checkRunSettings.touchLimit = '"$TOUCH_LIMIT" "$MEND_CONFIG_FILE" > tmp_config.json
    mv tmp_config.json "$MEND_CONFIG_FILE"
    echo "Mend configuration updated with touch limit: $TOUCH_LIMIT"
  else
    echo "Error: Mend configuration file ($MEND_CONFIG_FILE) not found!"
    exit 1
  fi
}

# Fetch all branches from the repository
fetch_branches() {
  echo "Fetching all branches from the repository..."
  BRANCHES=$(git ls-remote --heads https://github.com/$REPO_OWNER/$REPO_NAME.git | awk '{print $2}' | sed 's|refs/heads/||')
  echo "Branches found:"
  echo "$BRANCHES"
}

# Run Mend scan on each branch
run_mend_on_branches() {
  echo "Running Mend scans on all branches..."
  for BRANCH in $BRANCHES; do
    echo "Checking out branch: $BRANCH"
    git checkout "$BRANCH"
    echo "Running Mend scan on branch: $BRANCH"
    mend-cli scan
  done
}

# Main script execution
main() {
  echo "Starting Mend scan script for repository: $REPO_NAME"

  # Update Mend configuration
  update_mend_config

  # Fetch branches
  fetch_branches

  # Run Mend scan on each branch
  run_mend_on_branches

  echo "Mend scan script completed successfully!"
}

# Execute the script
main
