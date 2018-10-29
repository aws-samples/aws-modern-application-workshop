using System;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using System.Collections.Generic;
using System.Threading.Tasks;


namespace ModernWebAppNET
{
    public class MysfitsService
    {
        private DynamoDBContext _dynamoContext;
        public MysfitsService(IAmazonDynamoDB dynamoDbClient)
        {
            _dynamoContext = new DynamoDBContext(dynamoDbClient);
        }
        public async Task<List<Mysfit>> GetMysfits()
        {
            List<ScanCondition> conditions = new List<ScanCondition>();
            List<Mysfit> mysfits = await _dynamoContext.ScanAsync<Mysfit>(conditions).GetRemainingAsync();
            return mysfits;
        }
        public async Task<List<Mysfit>> GetMysfitsWithFilter(FilterRequest filter)
        {
            ScanFilter scanFilter = new ScanFilter();
            scanFilter.AddCondition(filter.filter, ScanOperator.Equal, filter.value);

            ScanOperationConfig config = new ScanOperationConfig()
            {
                Filter = scanFilter,
                Select = SelectValues.SpecificAttributes,
                AttributesToGet = new List<string> { "MysfitId", "Name", "Species", "Age", "Description", "GoodEvil", "LawChaos", "ThumbImageUri", "ProfileImageUri" }
            };

            AsyncSearch<Mysfit> searchMysfits = _dynamoContext.FromScanAsync<Mysfit>(config);

            List<Mysfit> mysfits = new List<Mysfit>();

            do
            {
                var searchResults = await searchMysfits.GetNextSetAsync();
                mysfits.AddRange(searchResults);
            } while (!searchMysfits.IsDone);

            return mysfits;
        }
        public async Task<Mysfit> GetMysfitById(string mysfitId)
        {
            return await _dynamoContext.LoadAsync<Mysfit>(mysfitId);
        }
        public async Task LikeMysfit(string mysfitId)
        {
            Mysfit mysfitToBeUpdated = await _dynamoContext.LoadAsync<Mysfit>(mysfitId);
            mysfitToBeUpdated.Likes += 1;
            await _dynamoContext.SaveAsync(mysfitToBeUpdated);
        }
        public async Task AdoptMysfit(string mysfitId)
        {
            Mysfit mysfitToBeUpdated = await _dynamoContext.LoadAsync<Mysfit>(mysfitId);
            mysfitToBeUpdated.Adopted = true;
            await _dynamoContext.SaveAsync(mysfitToBeUpdated);
        }
    }
}

