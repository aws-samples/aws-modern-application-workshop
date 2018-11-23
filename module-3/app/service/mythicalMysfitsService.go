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
	// http://localhost:PORT/misfits?filter=value1&value=value2
	// To get by ID:
	// http://localhost:PORT/misfits?filter=MysfitId&value=VALUE
	fmt.Println("GET params were:", r.URL.Query())

	var items string

	// Initialize log output to stderr, use HTML output for web page
	// Set the second arg to L.JSON for JSON; L.STRING for a plain string
	// Don't forget to change the header below if you change the output format!

	contentType := "application/json"

	switch DefaultFormat {
	case "JSON":
		L.Init(os.Stderr, L.JSON)
		contentType = "application/json"
	case "HTML":
		L.Init(os.Stderr, L.HTML)
		contentType = "application/html"
	case "TEXT":
		L.Init(os.Stderr, L.STRING)
		contentType = "text/html; charset=utf-8"
	default:
		L.Init(os.Stderr, L.JSON)
		contentType = "application/json"
	}

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

	// Set the type of content
	w.Header().Set("Content-Type", contentType)

	w.Write(body)
}

// Defaults
var DefaultFormat = "JSON"
var DefaultPort = ":8088"

func main() {
	// Check environment
	port := os.Getenv("PORT")
	if port != "" {
		DefaultPort = port
	}

	format := os.Getenv("FORMAT")
	if format != "" {
		DefaultFormat = format
	}

	mux := http.NewServeMux()
	mux.Handle("/", http.HandlerFunc(healthCheckResponse))
	mux.Handle("/misfits", http.HandlerFunc(showMisfits))
	http.ListenAndServe(DefaultPort, mux)
}
