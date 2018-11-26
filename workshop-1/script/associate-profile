#! /bin/bash

instance_id=$(curl -sS http://169.254.169.254/latest/meta-data/instance-id)
profile_name="$(jq < cfn-output.json -r '.ProfileName')"

if aws ec2 associate-iam-instance-profile --iam-instance-profile "Name=$profile_name" --instance-id $instance_id; then
  echo "Profile associated successfully."
else
  echo "WARNING: Encountered error associating instance profile with Cloud9 environment"
fi
