from __future__ import print_function
import os
import requests
import mmchaos
import sys
import logging
import random
from urlparse import urlparse
from flask import Flask, jsonify, json, Response, request, abort
from flask_cors import CORS

# [TODO] load x-ray recorder module
# [TODO] load middleware module for incoming requests

loglevel = os.environ['LOGLEVEL'].upper()

app = Flask(__name__)
CORS(app)
app.config['DEBUG'] = True
app.logger

# [TODO] x-ray recorder config to label segments as 'like service'
# [TODO] initialize the x-ray middleware

# The service basepath has a short response just to ensure that healthchecks
# sent to the service root will receive a healthy response.
@app.route("/")
def health_check_response():
    url = urlparse('http://{}/'.format(os.environ['MONOLITH_URL']))
    response = requests.get(url=url.geturl())

    flask_response = jsonify({"message" : "Health check, monolith service available."})
    flask_response.status_code = response.status_code
    return flask_response

# indicate that the provided mysfit should be marked as liked.
def process_like_request():
    #print('Like processed.', file=sys.stderr)
    app.logger.info('Like processed.')

def fulfill_like(mysfit_id):
    url = urlparse('http://{}/mysfits/{}/fulfill-like'.format(os.environ['MONOLITH_URL'], mysfit_id))
    app.logger.info('Fulfill processed.')
    return requests.post(url=url.geturl())

@app.route("/mysfits/<mysfit_id>/like", methods=['POST'])
def like_mysfit(mysfit_id):
    app.logger.info('Like received.')
    if os.environ['CHAOSMODE'] == "on":
        n = random.randint(1,100)
        if n < 65:
            app.logger.warn('WARN: stress function activated')
            mmchaos.stress()
        elif n < 90:
            app.logger.warn('WARN: simulated 404 activated')
            abort(404)
        app.logger.warn('WARN: This thing should NOT be left on..')
    
    process_like_request()
    service_response = fulfill_like(mysfit_id)

    flask_response = Response(service_response)
    flask_response.headers["Content-Type"] = "application/json"

    return flask_response

# Run the service on the local server it has been deployed to
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
