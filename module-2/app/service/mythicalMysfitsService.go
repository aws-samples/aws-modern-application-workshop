package main

import (
    "io/ioutil"
    "net/http"
)

// For http://localhost:8080
func healthCheckResponse(w http.ResponseWriter, req *http.Request) {
    w.Write([]byte("Nothing here, used for health check. Try /mysfits instead."))
}

// Show mysfits-response.json for http://localhost:8080/mysfits
func showMysfits(w http.ResponseWriter, r *http.Request) {
    // Read Mysfits data from file and show it
    body, _ := ioutil.ReadFile("mysfits-response.json")

    // Let the web server know it's JSON
    w.Header().Set("Content-Type", "application/json")
    w.Write(body)
}

func main() {
    mux := http.NewServeMux()
    mux.Handle("/", http.HandlerFunc(healthCheckResponse))
    mux.Handle("/mysfits", http.HandlerFunc(showMysfits))
    http.ListenAndServe(":8080", mux)
}
