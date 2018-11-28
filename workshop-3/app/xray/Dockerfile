# Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License").
# You may not use this file except in compliance with the License.
# A copy of the License is located at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# or in the "license" file accompanying this file. This file is distributed
# on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
# express or implied. See the License for the specific language governing
# permissions and limitations under the License.

FROM amazonlinux:1

# Download latest 2.x release of X-Ray daemon
# Unpack archive, by default unzip is not installed so do that beforehand
RUN yum install -y unzip && \
    cd /tmp/ && \
    curl https://s3.dualstack.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-linux-2.x.zip > aws-xray-daemon-linux-2.x.zip && \
		unzip aws-xray-daemon-linux-2.x.zip && \
		cp xray /usr/bin/xray && \
		rm aws-xray-daemon-linux-2.x.zip && \
    rm cfg.yaml

# Expose port 2000 on udp
EXPOSE 2000/udp

ENTRYPOINT ["/usr/bin/xray", "-b", "0.0.0.0:2000"]

# No cmd line parameters, use default configuration
CMD ['']