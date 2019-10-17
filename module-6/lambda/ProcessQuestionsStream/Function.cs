using System;
using System.Net;
using System.Threading.Tasks;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace ProcessQuestionsStream
{
    public class Function
    {
        AmazonSimpleNotificationServiceClient _simpleNotificationService;
        string _topicArn;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public Function()
        {
            _simpleNotificationService = new AmazonSimpleNotificationServiceClient();
            _topicArn = System.Environment.GetEnvironmentVariable("SNS_TOPIC_ARN");
        }


        /// <summary>
        /// This method is called for every Lambda invocation. This method takes in an SNS event object and can be used 
        /// to respond to SNS messages.
        /// </summary>
        /// <param name="evnt"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public async Task FunctionHandlerAsync(DynamoDBEvent evnt, ILambdaContext context)
        {
            foreach (var record in evnt.Records)
            {
                await ProcessRecordAsync(record, context);
            }
        }

        private async Task ProcessRecordAsync(DynamoDBEvent.DynamodbStreamRecord record, ILambdaContext context)
        {
            if (record.Dynamodb == null)
                throw new Exception("Event record had no DynamoDB value");

            var item = record.Dynamodb.NewImage;
            AttributeValue userEmail;
            AttributeValue questionText;

            if (!item.TryGetValue("QuestionText", out questionText))
                throw new Exception("Failed to obtain question text");
            if (!item.TryGetValue("UserEmailAddress", out userEmail))
                throw new Exception("Failed to obtain email address");

            var emailSubject = $"New Customer Question: {userEmail.S}";
            var emailMessage = $"USER EMAIL: {userEmail.S}. QUESTION TEXT: {questionText.S}";

            var request = new PublishRequest
            {
                Message = emailMessage,
                Subject = emailSubject,
                TopicArn = _topicArn
            };
            try
            {
                var response = await _simpleNotificationService.PublishAsync(request);
                if (response.HttpStatusCode == HttpStatusCode.OK)
                {
                    context.Logger.LogLine($"Successfully sent SNS message '{response.MessageId} to {_topicArn}'");
                }
                else
                {
                    context.Logger.LogLine($"Received a failure response '{response.HttpStatusCode}' when sending SNS message '{response.MessageId ?? "Missing ID"}'");
                }
            }
            catch (AmazonSimpleNotificationServiceException ex)
            {
                context.Logger.LogLine("An AWS SNS exception was thrown " + ex.ToString());
            }
            catch (Exception ex)
            {
                context.Logger.LogLine("An exception was thrown: " + ex.ToString());
            }
            await Task.CompletedTask;
        }
    }
}
