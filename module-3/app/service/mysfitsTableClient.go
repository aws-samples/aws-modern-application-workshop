package main

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"

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

func getJSONStringFromItems(items []map[string]*dynamodb.AttributeValue) string {
	return ""
}

func getAllMysfitsDebug() string {
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

func queryMysfitsDebug(filter string, value string) string {
	Init(os.Stdout)

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
