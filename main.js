function main() {
  // Check if the spreadsheet exists
  var sheetName = "Indeed Job Tracker";
  var spreadsheet = getOrCreateSpreadsheet(sheetName);

  // Get the most recent job title from the spreadsheet
  var lastJobTitle = getLastJobTitle(spreadsheet);
  
  // Scrape emails starting from the last job title
  scrapeEmails(lastJobTitle, spreadsheet);
}

function getOrCreateSpreadsheet(sheetName) {
  var files = DriveApp.getFilesByName(sheetName);
  var spreadsheet;

  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
    Logger.log(sheetName + " already exists.");
  } else {
    spreadsheet = SpreadsheetApp.create(sheetName);
    Logger.log("Created new spreadsheet: " + spreadsheet.getUrl());

    // Set headers
    var sheet = spreadsheet.getActiveSheet();
    sheet.getRange("A1").setValue("Job Title");
    sheet.getRange("B1").setValue("Company");
    sheet.getRange("C1").setValue("Location");
    sheet.getRange("D1").setValue("Date");
    sheet.getRange("E1").setValue("Job Link");
    sheet.getRange("F1").setValue("Status");

    // Set text wrapping for columns A-D
    sheet.getRange("A:F").setWrap(true);
  }
  return spreadsheet;
}

function getLastJobTitle(spreadsheet) {
  var sheet = spreadsheet.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    // No jobs listed, return an empty string
    return "";
  } else {
    // Get the job title from the last row
    return sheet.getRange(lastRow, 1).getValue(); // Column A is the Job Title column
  }
}

function scrapeEmails(lastJobTitle, spreadsheet) {
  // Search for emails from indeedapply@indeed.com with the specified keywords
  var query = 'from:indeedapply@indeed.com OR from:noreply@indeed.com OR (from:no-reply@indeed.com subject:"Not selected")';
  // If you have any keywords you want to enter, enter them below
  var keywords = 'subject:("software" OR "internship")';
  var searchQuery = query + ' ' + keywords;

  var threads = GmailApp.search(searchQuery);
  
  if (threads.length > 0) {
    var sheet = spreadsheet.getActiveSheet();
    var foundLastJobTitle = lastJobTitle === "";

    for (var i = threads.length - 1; i >= 0; i--) { // Start from the oldest thread
      var messages = threads[i].getMessages();
      for (var j = messages.length - 1; j >= 0; j--) { // Start from the oldest message in the thread
        var message = messages[j];
        
        // Extract details from the email
        var date = message.getDate();
        var subject = message.getSubject();
        var body = message.getBody(); // This extracts the HTML body
        var from = message.getFrom();

        if (from.includes("no-reply@indeed.com") && subject.includes("Not selected")) {
          var bodyChunk = body.substring(12000, 17000);
          var jobDetails = queryGeminiAPI(bodyChunk);
          setUpdate(sheet, jobDetails);
          continue;
        } else if (from.includes("noreply@indeed.com")) {
          var jobDetails = queryGeminiAPI(subject);
          setUpdate(sheet, jobDetails);
          continue;
        }
        // Skip irrelevant emails from Indeed
        else if (subject.toLowerCase().includes("your application status updates") || 
            body.toLowerCase().includes("your application status updates") || 
            !subject.includes("Indeed Application")) {
          continue;
        }

        // Extract specific information from the email
        var jobDetails = extractJobDetails(subject, body, date);

        // Check if the job title matches the last known job title
        if (!foundLastJobTitle) {
          if (jobDetails.title === lastJobTitle) {
            foundLastJobTitle = true;
          }
          continue;
        }

        // Add the new entry to the list
        var linkCell = '=HYPERLINK("' + jobDetails.link + '", "link")';
        sheet.appendRow([jobDetails.title, jobDetails.company, jobDetails.location, jobDetails.date, linkCell, "Applied"]);
      }
    }
    // Append all new entries to the spreadsheet in their original order
  } else {
    Logger.log('No emails found from indeedapply@indeed.com with the specified keywords');
  }
}

function extractJobDetails(subject, body, date) {
  // Use regex to match the specific parts of the email body
  var regexJobTitle = /^[^:]*:(.*)$/; // Adjust this regex to match the HTML structure of your email
  var regexCompany = /<a href=".*?">(.*?)<\/a>/; // Match the company name
  var regexLocation = /<\/strong>\s*-\s*([^<]*)\s*<\/p>/; // Match the location, capturing until a paragraph end
  var regexLink = /href="(https:\/\/apply\.indeed\.com\/indeedapply\/confirmemail\/viewjob\?[^"]+)"/; // Match the job link in the 19k-20.5k chunk
  
  var jobTitleMatch = subject.match(regexJobTitle);
  var companyMatch = body.match(regexCompany);
  var locationMatch = body.match(regexLocation);
  var bodyChunk1 = body.substring(19000, 21500);
  var linkMatch = bodyChunk1.match(regexLink);

  var jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : 'No job title found';
  var company = companyMatch ? companyMatch[1].trim() : 'No company found';
  var location = locationMatch ? locationMatch[1].trim() : 'No location found';
  var dateApplied = formatDate(date);
  var link = linkMatch ? linkMatch[1].trim() : 'No link found';

  return {
    title: jobTitle,
    company: company,
    location: location,
    date: dateApplied,
    link: link
  };
}

function formatDate(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1; // Months are zero-based
  var year = date.getFullYear();
  return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
}

function queryGeminiAPI(item) {
  // Replace with your actual Gemini API key. You can get one for free at https://aistudio.google.com/app/apikey
  var apiKey = 'ENTER API KEY HERE'; 
  var endpoint = 'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=' + apiKey;
  var query = `Given this:\n` + item + `\n identify the job title and company. You MUST return your response in the following JSON format:
  {
    "job_info": [
      {
        "jobTitle": "<job title>",
        "company": "<company>"
      }
    ]
  }`;

  var payload = JSON.stringify({
    "prompt": {
      "text": query
    }
  });

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': payload,
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var jsonResponse = JSON.parse(response.getContentText());
    
    // Process the response as needed
    if (jsonResponse && jsonResponse.candidates && jsonResponse.candidates.length > 0) {
      var generatedContent = jsonResponse.candidates[0].output;
      generatedContent = generatedContent.replace(/```json/g, '').replace(/```/g, '');
      generatedContent = generatedContent.replace(/,\s*([\]}])/g, '$1');
      // Assuming the generated content is a JSON string, parse it
      var generatedJson = JSON.parse(generatedContent);
      
      if (generatedJson.job_info && generatedJson.job_info.length > 0) {
        return {
          title: generatedJson.job_info[0].jobTitle,
          company: generatedJson.job_info[0].company
        };
      } else {
        Logger.log('No job info found in the generated content');
        return null;
      }

    } else {
      Logger.log('No generated content found in the response');
      return null;
    }
  } catch (e) {
    Logger.log('Error fetching data from Gemini API: ' + e.toString());
    return null;
  }
}

function setUpdate(sheet, jobDetails) {
  if (jobDetails && jobDetails.title) {
    // Get the range of column A
    var range = sheet.getRange("A:A");
    // Get all the values in column A
    var values = range.getValues();

    // Loop through the values
    for (var k = 0; k < values.length; k++) {
      // Check if the current value matches the value being searched for
      if (values[k][0] === jobDetails.title) {
        sheet.getRange(k + 1, 6).setValue("Not selected"); // Column F is the Update column
      }
    }
  }
}
