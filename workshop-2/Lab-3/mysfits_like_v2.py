import os
import requests
from urlparse import urlparse
from flask import Flask, jsonify, json, Response, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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
    print('Like processed.')

def fulfill_like(mysfit_id):
    url = urlparse('http://{}/mysfits/{}/fulfill-like'.format(os.environ['MONOLITH_URL'], mysfit_id))
    return requests.post(url=url.geturl())


@app.route("/mysfits/<mysfit_id>/like", methods=['POST'])
def like_mysfit(mysfit_id):
    process_like_request()
    service_response = fulfill_like(mysfit_id)

    flask_response = Response(service_response)
    flask_response.headers["Content-Type"] = "application/json"

    return flask_response

# Run the service on the local server it has been deployed to
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
