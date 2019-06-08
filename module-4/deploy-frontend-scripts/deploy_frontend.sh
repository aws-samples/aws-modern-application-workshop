#!/usr/bin/env bash
PROJECT_NAME="mythical-mysfits"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
FRONTEND_PATH="$DIR/../frontend"
FRONTEND_BUILD_PATH="$DIR/../frontend/dist"

cd ${FRONTEND_PATH} && \
npm install
npm run build -- --prod
cd ../cdk/
npm install
npm run build
cdk deploy --app bin/web.js -c FRONTEND_BUILD_PATH=$FRONTEND_BUILD_PATH
