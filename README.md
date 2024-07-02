# indeed-job-tracker

## Purpose
This is a Google Apps script created with the purpose of providing a quick and easy way to keep track of jobs you've applied to using Indeed. This script goes through all emails you've received from Indeed and stores each job applied to in a Google Spreadsheet. The spreadsheet stores the job title, company, location, date applied, job link, and status of each job you've applied to. I'm currently working on combining this script and one that works with Workday emails into one main script that I'll also publish on Github.

## How To Use:
- Open Google Apps Script and create a new project
- Copy and paste the "main.js" file.
- Change the search query (the part in the parentheses) as needed (line 55). If you would like to just search all emails from Indeed, leave the quotations blank.
- Visit https://aistudio.google.com/app/apikey and generate an API key for free. Copy and paste this key into the API field (line 151)
- Save your script and give it a name, and then run the script! You will have to authorize some stuff though. In the pop-up, click "Advanced", and then click "Go to (script title)". The link to the spreadsheet created will appear in the console logger. Copy and paste this link in a new tab to see the results!
- Run the script whenever you want to update your spreadsheet. All you have to do is just open the same script again and click the run button. The script will take care of the rest.
- If you have any issues, please report them using the issues tab. Alternatively, you can reach me at nasreenmir06@gmail.com. 

## Future Add-Ons:
- Combine Workday and Indeed tracker into one script.
- Make the script work with jobs applied to on SAP Success Factors and LinkedIn.
- Make the script work with all emails from any sender.
- Automated follow-up emails?

I also wrote a Medium article about how I built this app. Read it here: https://medium.com/@nasreenmir06/how-i-built-a-job-application-parser-with-google-apps-script-d60fe3950f51
