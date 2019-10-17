using System;

using Newtonsoft.Json;

using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.DynamoDBv2;
using System.Collections.Generic;
using Amazon.DynamoDBv2.Model;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace PostQuestionsService
{
    public class Function
    {
        private static AmazonDynamoDBClient client = new AmazonDynamoDBClient();
        public async System.Threading.Tasks.Task<APIGatewayProxyResponse> FunctionHandlerAsync(APIGatewayProxyRequest apigProxyEvent, ILambdaContext context)
        {
            Console.WriteLine($"Processing request data for request {apigProxyEvent.RequestContext.RequestId}.");
            var data = JsonConvert.DeserializeObject<Question>(apigProxyEvent.Body);
            Question question = new Question();
            question.Id = Guid.NewGuid().ToString();
            question.Text = data.Text;
            question.EmailAddress = data.EmailAddress;
            var write = await client.PutItemAsync("MysfitsQuestionsTable", new Dictionary<string, AttributeValue>{
                { "QuestionId", new AttributeValue(question.Id) },
                { "QuestionText", new AttributeValue(question.Text) },
                { "UserEmailAddress", new AttributeValue(question.EmailAddress) }
            });
            context.Logger.LogLine("Stream processing complete.");
            var response = new APIGatewayProxyResponse
            {
                StatusCode = (int)write.HttpStatusCode,
                Body = { },
                Headers = new Dictionary<string, string>
              {
                  { "Content-Type", "application/json" },
                  { "Access-Control-Allow-Origin", "*" },
                  { "Access-Control-Allow-Headers", "*"},
                  { "Access-Control-Allow-Methods", "*"}

              }
            };
            return response;
        }
    }
}
