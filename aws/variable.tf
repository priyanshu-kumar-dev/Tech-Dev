variable "aws_region" {
  description = "AWS region for the deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "roadguard-ai"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.20.1.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type for the application"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Optional EC2 key pair name for SSH access"
  type        = string
  default     = ""
}

variable "admin_cidr" {
  description = "CIDR allowed to access SSH; use your public IP in production"
  type        = string
  default     = "0.0.0.0/0"
}

variable "github_repo_url" {
  description = "GitHub repository that contains the application source code"
  type        = string
  default     = "https://github.com/Princekumarsahu-321/RoadGuard-AI.git"
}
