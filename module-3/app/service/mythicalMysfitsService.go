package main

import (
	"fmt"
	"net/http"
)

// For http://localhost:8088
func healthCheckResponse(w http.ResponseWriter, req *http.Request) {
	w.Write([]byte("Nothing here, used for health check. Try /misfits instead."))
}

// Show mysfits-response.json for http://localhost:8088/misfits
func showMisfits(w http.ResponseWriter, r *http.Request) {
	// Does request contain a 'filter' arg?, ala:
	// http://localhost:8088/misfits?filter=value1&value=value2
	fmt.Println("GET params were:", r.URL.Query())

	var items Items

	// if only one expected
	filter := r.URL.Query().Get("filter")
	if filter != "" {
		value := r.URL.Query().Get("value")
		if value != "" {
			// Call Getall
			items = queryMysfits(filter, value)
		}

	} else {
		items = getAllMysfits()
	}

	// Read Misfits data from file and show it
	body := []byte(items)

	// Let the web server know it's JSON
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

func main() {
	mux := http.NewServeMux()
	mux.Handle("/", http.HandlerFunc(healthCheckResponse))
	mux.Handle("/misfits", http.HandlerFunc(showMisfits))
	http.ListenAndServe(":8088", mux)
}
