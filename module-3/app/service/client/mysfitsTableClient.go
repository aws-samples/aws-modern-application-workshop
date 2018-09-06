package main

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"

	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
)

// Info is for logging
var Info *log.Logger

// Init initializes the logger
func Init(
	infoHandle io.Writer) {
	Info = log.New(infoHandle,
		"INFO: ",
		log.Ldate|log.Ltime|log.Lshortfile)
}

// Item is a value returned by query
type Item struct {
	MysfitId        string `json:"MysfitId"`
	Name            string `json:"Name"`
	Species         string `json:"Species"`
	Description     string `json:"Description"`
	Age             int    `json:"Age"`
	GoodEvil        string `json:"GoodEvil"`
	LawChaos        string `json:"LawChaos"`
	ThumbImageUri   string `json:"ThumbImageUri"`
	ProfileImageUri string `json:"ProfileImageUri"`
	Likes           int    `json:"Likes"`
	Adopted         bool   `json:"Adopted"`
}

// Items stores a list of Items
type Items []Item

// Get items as array of structs
func getItems(items []map[string]*dynamodb.AttributeValue) Items {
	var mysfitList Items

	err := dynamodbattribute.UnmarshalListOfMaps(items, &mysfitList)
	if err != nil {
		println("Got error unmarshalling items:")
		println(err.Error())
		return nil
	}

	return mysfitList
}

// getJSONStringFromItems creates a JSON string from the items from a scan or query
func getJSONStringFromItems(items []map[string]*dynamodb.AttributeValue) string {
	output := "{\"mysfits\": ["
	myItems := getItems(items)

	len := len(myItems)

	for i, item := range myItems {
		iJSON, err := json.Marshal(item)
		if err != nil {
			fmt.Println(err)
			return ""
		}

		if i == len-1 {
			output += string(iJSON)
		} else {
			output += string(iJSON) + ","
		}
	}

	return output + "]}"
}

// GetAllMysfits gets all table items
func GetAllMysfits() string {
	// Create a DynamoDB client using our default credentials and region.
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	// Create DynamoDB client
	svc := dynamodb.New(sess)

	// Retrieve all Mysfits from DynamoDB using the DynamoDB scan operation.
	// Note: The scan API can be expensive in terms of latency when a DynamoDB
	// table contains a high number of records and filters are applied to the
	// operation that require a large amount of data to be scanned in the table
	// before a response is returned by DynamoDB. For high-volume tables that
	// receive many requests, it is common to store the result of frequent/common
	// scan operations in an in-memory cache. DynamoDB Accelerator (DAX) or
	// use of ElastiCache can provide these benefits. But, because out Mythical
	// Mysfits API is low traffic and the table is very small, the scan operation
	// will suit our needs for this workshop.

	input := &dynamodb.ScanInput{
		TableName: aws.String("MysfitsTable"),
	}

	result, err := svc.Scan(input)
	if err != nil {
		Info.Print("Got error scanning table:")
		return ""
	}

	// loop through the returned mysfits and add their attributes to a new map
	// that matches the JSON response structure expected by the frontend.
	Init(os.Stdout)
	Info.Print(result.Items)

	jsonValue := getJSONStringFromItems(result.Items)

	return jsonValue
}

// QueryMysfits gets only the specified items
func QueryMysfits(filter string, value string) string {
	Init(os.Stdout)
	Info.Println("Filter: " + filter)
	Info.Println("Value: " + value)

	// We only have two secondary indexes: GoodEvil(Index) and LawChaos(Index)
	if filter != "GoodEvil" && filter != "LawChaos" {
		Info.Print("We only allow quering for GoodEvil or LawChaos")
		return ""
	}

	// Create a DynamoDB client using our default credentials and region.
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	// Create DynamoDB client
	svc := dynamodb.New(sess)

	// Use the DynamoDB scan API to retrieve mysfits from the table that are
	// equal to the selected filter values.
	input := &dynamodb.ScanInput{
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":a": {
				S: aws.String(value),
			},
		},
		FilterExpression: aws.String(filter + " = :a"),
		TableName:        aws.String("MysfitsTable"),
	}

	result, err := svc.Scan(input)
	if err != nil {
		Info.Print("Got error getting item:")
		return ""
	}

	jsonValue := getJSONStringFromItems(result.Items)
	Info.Print(jsonValue)

	return jsonValue
}

// main to test from command line
func main() {
	filterPtr := flag.String("filter", "", "The table attribute to query")
	valuePtr := flag.String("value", "", "The value of the table attribute")
	flag.Parse()
	filter := *filterPtr
	value := *valuePtr

	var output string

	if filter != "" && value != "" {
		fmt.Println("Getting filtered values")
		output = QueryMysfits(filter, value)
	} else {
		fmt.Println("Getting all values")
		output = GetAllMysfits()
	}

	fmt.Print(output)
}
