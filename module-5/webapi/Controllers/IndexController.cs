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
    [Route("/")]
    [ApiController]
    public class IndexController : ControllerBase
    {
        // GET /
        // Used for NLB HealthCheck
        [HttpGet]
        public IActionResult Get()
        {
            return Ok();
        }

    }
}
