# AWS Setup Guide for Famiglia Profile Image Upload

This guide explains how to configure AWS services for the profile image upload feature.

## Architecture

```
Frontend → Backend API → AWS API Gateway → Lambda → S3
```

## Prerequisites

- AWS Account
- AWS CLI configured (optional, for deployment)
- Node.js 18+ for Lambda runtime

## 1. S3 Bucket Setup

### Create Bucket

1. Go to AWS S3 Console
2. Click "Create bucket"
3. Name: `famiglia-profile-images` (or your preferred name)
4. Region: `sa-east-1` (São Paulo) - or your preferred region
5. Uncheck "Block all public access" (we need public read for images)
6. Enable ACLs (for public-read on individual objects)

### Bucket Policy (Optional - for public read)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::famiglia-profile-images/*"
        }
    ]
}
```

## 2. IAM Role for Lambda

### Create Role

1. Go to IAM Console → Roles → Create Role
2. Select "AWS Service" → Lambda
3. Attach policies:
   - `AWSLambdaBasicExecutionRole`
   - Create custom policy for S3:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::famiglia-profile-images/*"
        }
    ]
}
```

4. Name the role: `FamigliaUploadLambdaRole`

## 3. Lambda Function

### Create Function

1. Go to Lambda Console → Create function
2. Name: `FamigliaUploadProfileImage`
3. Runtime: Node.js 20.x
4. Execution role: `FamigliaUploadLambdaRole`

### Function Code

Upload the code from `AWS/lambda/uploadProfileImage.mjs`:

```javascript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "sa-east-1" });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "famiglia-profile-images";

export const handler = async (event) => {
  // ... (see uploadProfileImage.mjs for full code)
};
```

### Environment Variables

Set these in Lambda configuration:
- `S3_BUCKET_NAME`: Your bucket name (e.g., `famiglia-profile-images`)
- `AWS_REGION`: Your region (e.g., `sa-east-1`)

### Configuration

- Memory: 256 MB (minimum recommended for image processing)
- Timeout: 30 seconds
- Handler: `index.handler`

## 4. API Gateway

### Create HTTP API

1. Go to API Gateway Console → Create API → HTTP API
2. Name: `FamigliaAPI` (or add to existing)

### Create Route

1. Add route: `POST /upload-profile-image`
2. Integrate with Lambda: `FamigliaUploadProfileImage`

### Configure CORS

In API Gateway settings:
- Allowed Origins: `http://localhost:5173`, `https://your-production-domain.com`
- Allowed Methods: `POST, OPTIONS`
- Allowed Headers: `Content-Type, Authorization`

### Deploy

1. Create stage: `prod`
2. Deploy API
3. Note the Invoke URL (e.g., `https://xxxxxx.execute-api.sa-east-1.amazonaws.com/prod`)

## 5. Backend Configuration

Add to your `.env` file:

```env
AWS_UPLOAD_API_URL=https://xxxxxx.execute-api.sa-east-1.amazonaws.com/prod
```

## 6. Testing

### Test Lambda Directly

```json
{
  "body": "{\"image\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\",\"fileName\":\"test.png\",\"contentType\":\"image/png\"}"
}
```

### Test via API Gateway

```bash
curl -X POST https://your-api-gateway-url/upload-profile-image \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/png;base64,...","fileName":"test.png","contentType":"image/png"}'
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure API Gateway CORS is configured correctly
2. **Access Denied on S3**: Check IAM role permissions
3. **Timeout**: Increase Lambda timeout for large images
4. **Payload Too Large**: API Gateway has a 10MB limit by default

### Logs

Check CloudWatch Logs for Lambda execution logs:
- Log group: `/aws/lambda/FamigliaUploadProfileImage`

## Security Considerations

1. Consider adding authentication to the Lambda function
2. Use presigned URLs for more secure uploads (alternative approach)
3. Implement rate limiting on API Gateway
4. Consider using CloudFront for CDN distribution of images
