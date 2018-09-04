package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"

    "fmt"
}

func getAllMysfits() {
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
    result := &dynamodb.ScanInput{
        TableName: aws.String("MysfitsTable"),
    }

    // loop through the returned mysfits and add their attributes to a new map
    // that matches the JSON response structure expected by the frontend.
    for _, item := range result.items {

    mysfit = make(map[string]string)

     mysfit["mysfitId"] = item["MysfitId"]["S"]
        mysfit["name"] = item["Name"]["S"]
        mysfit["age"] = int(item["Age"]["N"])
        mysfit["goodevil"] = item["GoodEvil"]["S"]
        mysfit["lawchaos"] = item["LawChaos"]["S"]
        mysfit["species"] = item["Species"]["S"]
        mysfit["description"] = item["Description"]["S"]
        mysfit["thumbImageUri"] = item["ThumbImageUri"]["S"]
        mysfit["profileImageUri"] = item["ProfileImageUri"]["S"]
	
        mysfitList["mysfits"].append(mysfit)
}

result, err := svc.Scan(input)
}

func queryMysfits() {
    // Create a DynamoDB client using our default credentials and region.
    sess := session.Must(session.NewSessionWithOptions(session.Options{
        SharedConfigState: session.SharedConfigEnable,
    }))

    // Create DynamoDB client
    svc := dynamodb.New(sess)

    
}



func main() {


}