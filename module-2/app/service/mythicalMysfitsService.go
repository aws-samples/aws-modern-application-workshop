package main

import (
    "net/http"
    "time"

    "github.com/bnkamalesh/webgo/middleware"
    "github.com/bnkamalesh/webgo"
    "io/ioutil"
)

// Show "Hello world" for http://localhost:8088
func helloWorld(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte ("Hello world"))
    webgo.R200(
        w,
        "",
    )
}

// Show mysfits-response.json for http://localhost:8088/misfits
func showMisfits(w http.ResponseWriter, r *http.Request) {
    // Read Misfits data from file and show it
    body, _ := ioutil.ReadFile("mysfits-response.json")

    // Let the web server know it's JSON
    w.Header().Set("Content-Type", "application/json")
    w.Write(body)

    webgo.R200(
        w,
        "",
    )
}

func getRoutes() []*webgo.Route {
    return []*webgo.Route{
        &webgo.Route{
            Name:     "hellowebgo",                   // A label for the API/URI, this is not used anywhere.
            Method:   http.MethodGet,                 // request type
            Pattern:  "/",                            // Pattern for the route
            Handlers: []http.HandlerFunc{helloWorld}, // route handler
        },
        &webgo.Route{
            Name:     "misfits",                       // A label for the API/URI, this is not used anywhere.
            Method:   http.MethodGet,                  // request type
            Pattern:  "/misfits",                      // Pattern for the route
            Handlers: []http.HandlerFunc{showMisfits}, // route handler
        },
    }
}

func main() {
    cfg := webgo.Config{
        Host:         "",
        Port:         "8088",
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 60 * time.Second,
    }
    router := webgo.NewRouter(&cfg, getRoutes())
    router.Use(middleware.AccessLog)
    router.Start()
}
