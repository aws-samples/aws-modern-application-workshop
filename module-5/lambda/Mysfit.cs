using System;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;

namespace streaming_lambda
{

    [DynamoDBTable("MysfitsTable")]
    public class Mysfit
    {
        [DynamoDBHashKey]
        public string MysfitId { get; set; }
        public string Name { get; set; }
        public string Species { get; set; }
        public int Age { get; set; }
        public string Description { get; set; }
        public string GoodEvil { get; set; }
        public string LawChaos { get; set; }
        public string ThumbImageUri { get; set; }
        public string ProfileImageUri { get; set; }
        public int Likes { get; set; }
        public bool Adopted { get; set; }
    }
}