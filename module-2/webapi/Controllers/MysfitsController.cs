using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ModernWebAppNET.Controllers
{
    [Route("api/mysfits")]
    [ApiController]
    public class MysfitsController : ControllerBase
    {
        // GET api/mysfits
        [HttpGet]
        public IActionResult Get()
        {
            using (StreamReader r = new StreamReader("./mysfits-response.json"))
            {
                var json = r.ReadToEnd();
                var content = new ContentResult();

                content.Content = json;
                content.ContentType = "application/json";


                return content;
                //return new JsonResult(JObject.Parse(json)); 
            }
        }

    }
}
