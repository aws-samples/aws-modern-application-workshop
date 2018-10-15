package main

import (
    "fmt"
    "net/http"
    "os"
    "strings"

    L "../client"
)

func getContentType() string {
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

    return contentType
}

// Handle GET requests
func getHandler(w http.ResponseWriter, r *http.Request, t string) (string, string) {
    // We handle (in local testing):
    // /misfits                              returns all misfits
    // /misfits?filter=FILTER&value=VALUE    returns a misfit where FILTER is has VALUE
    // /misfits/{mysfitsId}                  returns a misfit by their MysfitId

    var path= r.URL.Path

    // If just /, return simple message
    if path == "/" {
        // We must set the format to text, otherwise we get a JSON format error
        return "Nothing here, used for health check. Try /misfits instead.", "TEXT"
    }

    // If just /misfits, get them all
    if path == "/misfits" {
        return L.GetAllMysfits(), t
    }

    // Did we get a filter request?
    filter := r.URL.Query().Get("filter")
    if filter != "" {
        fmt.Println("Got filter: " + filter)
        value := r.URL.Query().Get("value")
        if value != "" {
            fmt.Println("Got value: " + value)
            return L.QueryMysfits(filter, value), t
        }
    }

    // We have a path like: /misfits/abc123
    // First make sure it's not /misfits/abc123/xyz
    s := strings.Split(path, "/")

    // Splitting /misfits/abc123 gives us:
    // s[0]: ""
    // s[1]: "misfits"
    // s[2]: "abc123"

    if len(s) == 3 {
        id := s[2]
        return L.GetMysfit(id), t
    }

    // We must set the format to text, otherwise we get a JSON format error
    return "Got bad GET request", "TEXT"
}

// Handle POST requests
func postHandler(w http.ResponseWriter, r *http.Request, t string) (string, string) {
    // We support:
    // /misfits/<mysfitId>/like     increments the likes for misfit with mysfitId
    // /misfits/<mysfitId>/adopt    enables adopt for misfit with mysfitId

    path := r.URL.Path

    s := strings.Split(path, "/")

    // Splitting /misfits/abc123/adopt gives us:
    // s[0] == ""
    // s[1] == "misfits"
    // s[2] == "abc123"
    // s[3] == "adopt"

    if len(s) == 4 {
        id := s[2]
        action := s[3]

        switch action {
        case "like":
            L.IncMysfitLikes(id)
            return "Incremented likes for " + id, "TEXT"
        case "adopt":
            L.SetMysfitAdopt(id)
            return "Enabled adoption for " + id, "TEXT"
        default:
            return "Unknown action: " + action, "TEXT"
        }
    }

    return "Unknown request", "TEXT"
}

// Handle everything here
func mainHandler(w http.ResponseWriter, r *http.Request) {
    // Show path and method
    fmt.Println("")
    fmt.Println("In mainHandler")
    fmt.Println("Method: " + r.Method)
    fmt.Println("Path:   " + r.URL.Path)

    content := ""
    contentType := getContentType()

    // If GET, send it to getHandler
    switch r.Method {
    case "GET":
        content, contentType = getHandler(w, r, contentType)
    case "POST":
        content, contentType = postHandler(w, r, contentType)
    default:
        content = "Bad HTTP request method: " + r.Method
        contentType = "TEXT"
    }

    // Add content to web page
    body := []byte(content)
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
	mux.Handle("/", http.HandlerFunc(mainHandler))
	http.ListenAndServe(DefaultPort, mux)
}
