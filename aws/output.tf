output "app_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "app_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.app.public_dns
}

output "application_url" {
  description = "URL used to access the deployed RoadGuard AI app"
  value       = "http://${aws_instance.app.public_dns}"
}

output "security_group_id" {
  description = "Security group created for the app"
  value       = aws_security_group.app.id
}
