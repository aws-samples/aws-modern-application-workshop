package main

import (
    "context"
    "fmt"
    "github.com/aws/aws-lambda-go/events"
    "net/http"
    "io/ioutil"
    "flag"
    "os"
    "encoding/json"
    "encoding/base64"
    "log"
)

// Mysfit is a value returned by query
type Mysfit struct {
    UserId          string
    MysfitId        string
    Name            string
    Species         string
    Description     string
    Age             int
    GoodEvil        string
    LawChaos        string
    ThumbImageUri   string
    ProfileImageUri string
    Likes           int
    Adopted         bool
}

func getMisfit(id string) string {
    apiEndpoint := "REPLACE_ME_API_ENDPOINT" + "/mysfits/" + id // # eg: 'https://ljqomqjzbf.execute-api.us-east-1.amazonaws.com/prod/'
    apiEndpoint = "http://localhost" + DefaultPort + "/misfits/" + id

    fmt.Println("Querying end point: " + apiEndpoint)

    resp, err := http.Get(apiEndpoint)
    if err != nil {
        fmt.Println("Got an error querying endpoint " + apiEndpoint)
        return ""
    }

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        fmt.Println("Got an error reading response body")
        return ""
    }

    output := string(body)

    return output
}

func processRecord(ctx context.Context, kinesisEvent events.KinesisEvent) (string, error) {
    output := ""

    var misfit Mysfit

    // Loop through event records
    for _, record := range kinesisEvent.Records {
        fmt.Println("Processing record: " + record.EventID)

        kinesisRecord := record.Kinesis
        dataBytes := kinesisRecord.Data
        click := string(dataBytes)

         json.Unmarshal([]byte(click), &misfit)

        // Build string for Kinesis FireHose
        enrichedClick := "{ "
        enrichedClick += "\"userId\": \"" + misfit.UserId + "\", "
        enrichedClick += "\"mysfitId\": \"" + misfit.MysfitId + "\", "
        enrichedClick += "\"goodevil\": \"" + misfit.GoodEvil + "\", "
        enrichedClick += "\"lawchaos\": \"" + misfit.LawChaos + "\", "
        enrichedClick += "\"species\": \"" + misfit.Species + "\", "
        enrichedClick += " }"

        log.Println("Enriched click: " + enrichedClick)

        // kinesis firehose expects record payloads to be sent as base64 encoded strings
        data := []byte(enrichedClick)
        str := base64.StdEncoding.EncodeToString(data)

        output += str
    }

    return output, nil
}

var DefaultPort = ":8088"

func main() {
    // Check environment
    port := os.Getenv("PORT")
    if port != "" {
        DefaultPort = port
    }

    idPtr := flag.String("id", "", "The misfit ID")
    flag.Parse()
    id := *idPtr

    if id == "" {
        fmt.Println("You must supply an ID as -id mysfitId")
    } else {
        output := getMisfit(id)

        fmt.Println("Misfit:")
        fmt.Println(output)
    }
}
