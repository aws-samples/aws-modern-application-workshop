package main

import (
    "fmt"
    "net/http"
    "os"
    "strings"

    L "../client"
)

// For http://localhost:8088
func healthCheckResponse(w http.ResponseWriter, req *http.Request) {
    w.Write([]byte("Nothing here, used for health check. Try /misfits instead."))
}

func showMisfits(w http.ResponseWriter, r *http.Request) {
    // Does request contain a 'filter' arg?, ala:
    // http://localhost:PORT/misfits?filter=value1&value=value2

    fmt.Println("GET params were:", r.URL.Query())

    items := ""

    // Initialize log output to stderr, use HTML output for web page
    // Set the second arg to L.JSON for JSON; L.STRING for a plain string

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

    if r.Method == "GET" {
        // We support:
        // /misfits                              returns all misfits
        // /misfits?filter=FILTER&value=VALUE    returns a misfit where FILTER is has VALUE
        // /misfits/{mysfitsId}                  returns a misfit by their MysfitId

        var path= r.URL.Path

        // If just /misfits, get them all
        if path == "/misfits" {
            items = L.GetAllMysfits()
        } else {
            // Did we get a filter request?
            filter := r.URL.Query().Get("filter")
            if filter != "" {
                fmt.Println("Got filter: " + filter)
                value := r.URL.Query().Get("value")
                if value != "" {
                    fmt.Println("Got value: " + value)
                    items = L.QueryMysfits(filter, value)
                }
            } else {
                // We have a path like: /misfits/abc123
                // First make sure it's not /misfits/abc123/xyz
                s := strings.Split(path, "/")

                if len(s) > 2 {
                    items = "Got bad request"
                    fmt.Println(items)
                } else {
                    id := s[1]
                    items = L.GetMysfit(id)
                }
            }
        }
    } else if r.Method == "POST" {
        // We support:
        // /mysfits/<mysfitId>/like              increments the likes for misfit with mysfitId
        // /mysfits/<mysfitId>/adopt             enables adopt for misfit with mysfitId

        path := r.URL.Path

        s := strings.Split(path, "/")

        if len(s) != 2 {
            items = "Got bad request"
            fmt.Println(items)
        } else {
            id := s[1]

            if s[2] == "like" {
                L.IncMysfitLikes(id)
            } else {
                L.SetMysfitAdopt(id)
            }
        }
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
