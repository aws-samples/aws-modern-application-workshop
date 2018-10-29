using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using Amazon.Lambda.Core;
using Amazon.Lambda.KinesisFirehoseEvents;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Threading.Tasks;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace streaming_lambda
{
    public class Function
    {
        public async Task<KinesisFirehoseResponse> FunctionHandlerAsync(KinesisFirehoseEvent evnt, ILambdaContext context)
        {
            context.Logger.LogLine($"InvocationId: {evnt.InvocationId}");
            context.Logger.LogLine($"DeliveryStreamArn: {evnt.DeliveryStreamArn}");
            context.Logger.LogLine($"Region: {evnt.Region}");

            var response = new KinesisFirehoseResponse
            {
                Records = new List<KinesisFirehoseResponse.FirehoseRecord>()
            };

            foreach (var record in evnt.Records)
            {
                context.Logger.LogLine($"\tRecordId: {record.RecordId}");
                context.Logger.LogLine($"\t\tApproximateArrivalEpoch: {record.ApproximateArrivalEpoch}");
                context.Logger.LogLine($"\t\tApproximateArrivalTimestamp: {record.ApproximateArrivalTimestamp}");
                context.Logger.LogLine($"\t\tData: {record.DecodeData()}");

                KinesisFirehoseResponse.FirehoseRecord transformedRecord = new KinesisFirehoseResponse.FirehoseRecord();
                transformedRecord.RecordId = record.RecordId;
                //AM the code fail on the line below. I have tried writing it the way it's supposed to be written using the SDK which is the line below it and doesnt work.
                // transformedRecord.Result = "Ok"; 
                transformedRecord.Result = KinesisFirehoseResponse.TRANSFORMED_STATE_OK;

                //var clickEvent = record.DecodeData();
                JObject clickEvent;
                try
                {
                    clickEvent = JObject.Parse(record.DecodeData());
                    JToken mysfitId;
                    JToken userId;
                    if (clickEvent.TryGetValue("mysfitId", out mysfitId) && clickEvent.TryGetValue("userId", out userId))
                    {
                        Mysfit mysfit = await retrieveMysfit(mysfitId.ToString(), context);
                        EnrichedClick click = new EnrichedClick()
                        {
                            userId = userId.ToString(),
                            mysfitId = mysfit.MysfitId,
                            goodevil = mysfit.GoodEvil,
                            lawchaos = mysfit.LawChaos,
                            species = mysfit.Species
                        };
                        transformedRecord.EncodeData(JsonConvert.SerializeObject(click));
                        response.Records.Add(transformedRecord);
                    }
                }
                catch (JsonReaderException jex)
                {
                    //Exception in parsing json
                    context.Logger.Log(jex.Message);
                }
            }
            return response;
        }

        public async Task<Mysfit> retrieveMysfit(string mysfitId, ILambdaContext context)
        {
            Mysfit mysfit = new Mysfit();
            string apiEndpoint = System.Environment.GetEnvironmentVariable("MYSFITS_API_URL");

            using (var client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiEndpoint);
                // client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(
                    new MediaTypeWithQualityHeaderValue("application/json"));
                string route = "mysfits/" + mysfitId;

                var result = await client.GetAsync(route);
                result.EnsureSuccessStatusCode();

                string resultContent = await result.Content.ReadAsStringAsync();
                //if mysfit received, convert to mysfit and return
                if (result.IsSuccessStatusCode)
                {
                    mysfit = JsonConvert.DeserializeObject<Mysfit>(resultContent);
                    return mysfit;

                }
                else
                {
                    return mysfit;
                }
            }
        }
        public class EnrichedClick
        {

            public string userId { get; set; }
            public string mysfitId { get; set; }
            public string goodevil { get; set; }
            public string lawchaos { get; set; }
            public string species { get; set; }
        }
    }
}