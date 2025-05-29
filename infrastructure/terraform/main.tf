# NubemGenesis Infrastructure as Code
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket = "nubemgenesis-terraform-state"
    prefix = "infrastructure/terraform.tfstate"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "nubemgenesis-v1-1"
}

variable "region" {
  description = "Primary region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "prod"
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "sql.googleapis.com",
    "redis.googleapis.com",
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "compute.googleapis.com"
  ])
  
  service = each.value
  project = var.project_id
  
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "nubemgenesis_vpc" {
  name                    = "nubemgenesis-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
}

# Subnet
resource "google_compute_subnetwork" "nubemgenesis_subnet" {
  name          = "nubemgenesis-subnet-${var.environment}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.nubemgenesis_vpc.id
  
  private_ip_google_access = true
}

# Cloud SQL Instance
resource "google_sql_database_instance" "nubemgenesis_db" {
  name             = "nubemgenesis-db-${var.environment}"
  database_version = "POSTGRES_15"
  region          = var.region
  
  settings {
    tier = var.environment == "prod" ? "db-g1-small" : "db-f1-micro"
    
    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
    
    ip_configuration {
      ipv4_enabled = false
      private_network = google_compute_network.nubemgenesis_vpc.id
    }
    
    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }
  
  deletion_protection = var.environment == "prod" ? true : false
  
  depends_on = [google_project_service.required_apis]
}

# Redis Instance
resource "google_redis_instance" "nubemgenesis_cache" {
  name           = "nubemgenesis-cache-${var.environment}"
  memory_size_gb = var.environment == "prod" ? 4 : 1
  region         = var.region
  
  authorized_network = google_compute_network.nubemgenesis_vpc.id
  
  depends_on = [google_project_service.required_apis]
}

# Cloud Storage Bucket
resource "google_storage_bucket" "nubemgenesis_storage" {
  name     = "nubemgenesis-storage-${var.environment}-${random_id.bucket_suffix.hex}"
  location = var.region
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Security Policy
resource "google_compute_security_policy" "nubemgenesis_policy" {
  name = "nubemgenesis-security-policy-${var.environment}"
  
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
  }
  
  rule {
    action   = "deny(403)"
    priority = "2000"
    match {
      expr {
        expression = "origin.region_code == 'CN' || origin.region_code == 'RU'"
      }
    }
  }
  
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

# Outputs
output "vpc_network" {
  value = google_compute_network.nubemgenesis_vpc.name
}

output "database_connection_name" {
  value = google_sql_database_instance.nubemgenesis_db.connection_name
}

output "redis_host" {
  value = google_redis_instance.nubemgenesis_cache.host
}

output "storage_bucket" {
  value = google_storage_bucket.nubemgenesis_storage.name
}