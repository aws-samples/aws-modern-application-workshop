#!/usr/bin/env bash
PROJECT_NAME="mythical-mysfits"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
FRONTEND_PATH="$DIR/../frontend"
FRONTEND_BUILD_PATH="$DIR/../frontend/dist"
AWS_REGION="$(aws configure get region)"
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-west-2";
fi
S3_BUCKET_NAME="$PROJECT_NAME-frontend-$(aws sts get-caller-identity --query Account --output text)"

cd ${FRONTEND_PATH} && \
npm run build -- --prod
aws s3 mb s3://$S3_BUCKET_NAME --region $AWS_REGION || true
aws s3 website s3://$S3_BUCKET_NAME --index index.html --error index.html
aws s3 rm s3://$S3_BUCKET_NAME --recursive
aws s3 cp $FRONTEND_BUILD_PATH s3://$S3_BUCKET_NAME --acl public-read --recursive
S3_BUCKET_LOCATION=$(aws s3api get-bucket-location --bucket $S3_BUCKET_NAME --query LocationConstraint --output text)
if [ ! $S3_BUCKET_LOCATION = "None" ]; then
    echo "View your project here: http://$S3_BUCKET_NAME.s3-website.$S3_BUCKET_LOCATION.amazonaws.com"
else
    echo "View your project here: http://$S3_BUCKET_NAME.s3-website.us-east-1.amazonaws.com"
fi