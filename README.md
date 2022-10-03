# YNAB Going Dutch

A CSV bank statement converter, created for Dutch banks. Completely written in javascript.
Select csv files using the `Browse` button and it will download the converted file, super quick and easy! (Firefox will give you a prompt first. Chrome will ask you for permission if multiple files are downloaded)

The system will split unique account numbers in different output files.

Everything is done locally. Your information never leaves your own computer.

## Automated synchronisation
YNABGoingDutch supports automated synchronisation with your YNAB account. Note that this functionality is still under construction!

To use this feature you need to do the following:
- Create a Personal Access Token (PAT). [Click here to get instructions on obtaining PATs](https://api.youneedabudget.com/#personal-access-tokens). Make sure you also store your PAT on your device or in the cloud.
- Open the side panel of YNABGoingDutch by clicking on the cog in the upper right corner.
- Paste the PAT in the text field in the settings panel.
- Click on "Test connection".

You should now see "Success!" in the side panel. This means that you have successfully connected YNABGoingDutch with your YNAB account! Your PAT will be stored in your local browser, and it will be reloaded the next time you visit the website.

To stop automated synchronization, please uncheck the "Sync with YNAB" box in the settings panel. You can also clear your PAT, which will remove it completely from the browser. You will need to enter your PAT again the next time you want to use this feature.

We do not store any information on servers! The PAT is stored locally in your browser. We only send your transaction data to YNAB when you have turned on auto sync.

## Supported Banks
YNAB Going Dutch will automatically recognize your bank, and convert it correctly!

Currently the banks that are supported are:
 - Rabobank
 - ING bank
 - ASN bank
 - SNS bank
 - KNAB
 - bunq (both English and Dutch localization)
 - Triodos Bank
 
For ABN AMRO support, please visit [YNABGoingDutch ABN AMRO edition](https://github.com/danielswrath/YNABGoingDutch-ABN-edition).

 If you want support for your bank, please create a github issue, or contact me some other way.
 You are also welcome to fork the repo and add support yourself! Please create a pull request if you want your code to be added.

## Bugs and Problems
If you have any problems or issues while using YNABGoingDutch, please create an issue on this repository.

## Just let me use it!
The latest version of the master branch can be used on [GitHub Pages](https://danielswrath.github.io/YNABGoingDutch).

### Docker
A Dockerfile and docker-compose.yml is added, which can be used to run the project locally and set the PAT as environment variable. Copy .env-example to .env and add your PAT and run:

``docker compose up --build``

Now the application will be available in your browser on http://localhost:8080