package main

import (
	"fmt"
	"net/http"
    "os"

    L "../client"
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

	var items string

	// Initialize log output to stderr, use HTML output for web page
	// Set the second arg to L.JSON for JSON; L.STRING for a plain string
	// Don't forget to change the header below if you change the output format!
    L.Init(os.Stderr, L.HTML)

	filter := r.URL.Query().Get("filter")
	if filter != "" {
		value := r.URL.Query().Get("value")
		if value != "" {
			items = L.QueryMysfits(filter, value)
		}
	} else {
		items = L.GetAllMysfits()
	}

	// Add items to web page
	body := []byte(items)

	// Let the web server know it's JSON
	//w.Header().Set("Content-Type", "application/json")

    // Let the web server know it's text
    //w.Header().Set("Content-Type", "application/text")

    // Let the web server know it's HTML
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(body)
}

func main() {
    DefaultPort := ":8088"

    // Check environment
    port := os.Getenv("PORT")

    if port != "" {
        DefaultPort = port
    }

	mux := http.NewServeMux()
	mux.Handle("/", http.HandlerFunc(healthCheckResponse))
	mux.Handle("/misfits", http.HandlerFunc(showMisfits))
	http.ListenAndServe(DefaultPort, mux)
}
