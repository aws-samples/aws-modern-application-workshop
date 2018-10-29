using System;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Runtime;


namespace ModernWebAppNET
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
        [DynamoDBProperty(typeof(BoolTypeConverter))]
        public bool Adopted { get; set; }
    }
    // Converts the complex type DimensionType to string and vice-versa.
    public class BoolTypeConverter : IPropertyConverter
    {
        public DynamoDBEntry ToEntry(object value)
        {
            var adopted = (bool)value;
            var entry = new DynamoDBBool(adopted);
            return entry;
        }

        public object FromEntry(DynamoDBEntry entry)
        {
            var adopted = (bool)entry;
            return adopted;
        }
    }
}