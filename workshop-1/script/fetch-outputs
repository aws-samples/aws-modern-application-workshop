#! /bin/bash

set -eu

if [[ $# -eq 1 ]]; then
  STACK_NAME=$1
else
  STACK_NAME="$(echo $C9_PROJECT | sed 's/^Project-//')"
fi

aws cloudformation describe-stacks --stack-name "$STACK_NAME" | jq -r '[.Stacks[0].Outputs[] | {key: .OutputKey, value: .OutputValue}] | from_entries' > cfn-output.json
