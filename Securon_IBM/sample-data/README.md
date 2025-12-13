# Securon Platform Sample Data

This directory contains mock datasets for testing and demonstration of the Securon platform capabilities.

## Directory Structure

```
sample-data/
├── terraform-plans/     # Sample Terraform plan files for infrastructure scanning
├── logs/               # Sample log files for ML analysis
├── ml-results/         # Sample ML analysis outputs
└── README.md          # This file
```

## Terraform Plans

### basic-infrastructure.json
- Simple infrastructure setup with EC2 instance, security group, and S3 bucket
- Contains security issues: open security groups (0.0.0.0/0), unencrypted S3 bucket
- Use for testing basic scanning functionality

### modular-setup.json
- Modular Terraform configuration with VPC, security, and database modules
- Demonstrates module resolution and cross-module dependencies
- Contains issues: unencrypted database, publicly accessible RDS instance
- Use for testing module parsing and complex infrastructure analysis

### complex-multi-region.json
- Multi-region deployment with load balancers, Aurora clusters, and CloudFront
- Includes encrypted and unencrypted resources for mixed security posture
- Contains global resources and cross-region dependencies
- Use for testing complex infrastructure scenarios and global resource handling

## Log Files

### vpc-flow-logs.json
- Sample VPC Flow Logs in JSON format
- Contains normal traffic patterns and some suspicious activities
- Includes various protocols (TCP, UDP) and port usage patterns
- Use for testing network traffic analysis and anomaly detection

### cloudtrail-logs.json
- Sample CloudTrail API logs
- Contains normal AWS API calls and some suspicious administrative actions
- Includes different user types (IAM users, root account)
- Use for testing API call analysis and administrative action monitoring

### application-logs.json
- Sample application logs with authentication, file uploads, and security events
- Contains structured JSON logs with metadata
- Includes normal operations and security incidents
- Use for testing application-level anomaly detection

## ML Analysis Results

### anomalies.json
- Sample anomalies detected by ML analysis
- Covers different anomaly types: suspicious IPs, unusual ports, abnormal transfers
- Includes confidence scores and detailed explanations
- Use for testing ML result visualization and rule generation

### proposed-rules.json
- Sample security rules proposed by ML analysis
- Based on the anomalies in anomalies.json
- Includes rule conditions, remediation guidance, and metadata
- Use for testing rule approval workflows and integration

## Usage in Development

These sample files are designed to be used during development and testing:

1. **CLI Testing**: Use Terraform plans to test scanning functionality
2. **ML Pipeline Testing**: Use log files to test anomaly detection
3. **Dashboard Development**: Use ML results to build visualization components
4. **Integration Testing**: Use complete datasets for end-to-end workflow testing

## Security Note

All data in these files is synthetic and does not represent real infrastructure, logs, or security incidents. IP addresses, user names, and other identifiers are fictional and safe for development use.