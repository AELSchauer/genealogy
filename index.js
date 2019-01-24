const { Builder, By, Chrome, Key, TimeUnit, until } = require('selenium-webdriver');
const fs = require('fs');
const Query = require('./query')

var loginUrl = 'https://www.ancestry.com/account/signin';
const refreshError =
  "Oops, we've hit a snag. There was an unexpected error trying to download the image.\nPlease refresh the page and try again.";


const start = async () => {
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chrome =>
      chrome.Options().setUserPreferences({
        'download.prompt_for_download': false
        // 'download.default_directory': '/Users/aschauer/Desktop' // this isn't working :(
      })
    )
    .build();

  try {
    await driver.get(loginUrl);
    await driver.wait(until.elementLocated(By.xpath('//*[@id="wcontainer394983957_widget394983957_m_widgetHeader"]/h2')), 60000);

    var citation = "Year: 1900; Census Place: Bergdorf, McPherson, South Dakota; Roll: 1552; Page: 8A; Enumeration District: 0228; FHL microfilm: 1241552"
    var query = Query.new(driver, citation)
    await census(driver, query)
  } finally {
    await driver.quit();
  }
};

const census = async (driver, query) => {
  await query.findAncestryCitation()
}

start();
