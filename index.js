const { Builder, By, Chrome, Key, TimeUnit, until } = require('selenium-webdriver');
const fs = require('fs');

var loginUrl = 'https://www.ancestry.com/account/signin';
const fileNameRegex = /([a-zA-Z ]+): /g;
const refreshError =
  "Oops, we've hit a snag. There was an unexpected error trying to download the image.\nPlease refresh the page and try again.";
const locationRegex = /Census Place: ([a-zA-Z, ]+);/

const citationToFilename = citation => `Census -- ${citation.replace(fileNameRegex, '').replace(/ /g, '')}`;

const start = async () => {
  const citation = "Year: 1910; Census Place: Artesia, Iroquois, Illinois; Roll: T624_292; Page: 1B; Enumeration District: 0060; FHL microfilm: 1374305"
  const [ township, city, state ] = locationRegex.test(citation) && citation.match(locationRegex)[1].split(', ')

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
    await driver.wait(
      until.elementLocated(
        By.xpath('//*[@id="wcontainer394983957_widget394983957_m_widgetHeader"]/h2')
      ),
      60000
    );

    await driver.get('https://www.ancestry.com/interactive/7884/31111_4328187-00353');
    await driver.findElement(By.xpath('//*[@id="saveMenuBtn"]')).click();
    await driver.findElement(By.xpath('//*[@id="saveMenuDiv"]/div/div[2]/button[5]')).click();
    await driver.sleep(5000);
    await new Promise((resolve) => {
      driver.findElement(By.xpath('//*[@id="notificationBar"]/div'), 5000)
      .then(element => {
        return element.getText()
      })
      .then(pageError => {
        console.log(pageError)
        if (pageError === refreshError) {
          console.error('refresh page')
        }
        return resolve()
      })
      .catch(() => {
        return resolve()
      })
    })
    if (!fs.existsSync(`/Users/aschauer/Downloads/genealogy/media/${state}`)) {
      fs.mkdirSync(`/Users/aschauer/Downloads/genealogy/media/${state}`)
    }
    if (!fs.existsSync(`/Users/aschauer/Downloads/genealogy/media/${state}/${city}`)) {
      fs.mkdirSync(`/Users/aschauer/Downloads/genealogy/media/${state}/${city}`)
    }
    if (!fs.existsSync(`/Users/aschauer/Downloads/genealogy/media/${state}/${city}/${township}`)) {
      fs.mkdirSync(`/Users/aschauer/Downloads/genealogy/media/${state}/${city}/${township}`)
    }
    let file = fs.readdirSync('/Users/aschauer/Downloads').sort().find(file => /^[_\-0-9]+\.jpg$/.test(file));
    fs.renameSync(`/Users/aschauer/Downloads/${file}`, `/Users/aschauer/Downloads/genealogy/media/${state}/${city}/${township}/${citationToFilename(citation)}.jpg`)
    // await driver.wait(until.elementLocated(By.xpath('//*[@id="fake"]')), 10000)
    // await census['1910'](driver, 'Illinois', 'Iroquois', 'Artesia', 'District 0060')
  } finally {
    await driver.quit();
  }
};

const census1910 = async (driver, state, county, township, district) => {
  await driver.get('https://search.ancestry.com/search/db.aspx?dbid=7884');
  await driver.wait(until.elementLocated(By.xpath("//select[@id='browseOptions0']")), 10000);

  await driver
    .findElement(By.xpath(`//select[@id='browseOptions0']/option[@value='${state}']`))
    .click();
  await driver.wait(until.elementLocated(By.xpath("//select[@id='browseOptions1']")), 10000);
  console.log(state);

  await driver.wait(
    until.elementIsEnabled(driver.findElement(By.xpath("//select[@id='browseOptions1']"))),
    10000
  );
  await driver
    .findElement(By.xpath(`//select[@id='browseOptions1']/option[@value='${state}.${county}']`))
    .click();
  console.log(county);

  await driver.wait(until.elementLocated(By.xpath("//select[@id='browseOptions2']")), 10000);
  await driver.wait(
    until.elementIsEnabled(driver.findElement(By.xpath("//select[@id='browseOptions2']"))),
    10000
  );
  await driver
    .findElement(
      By.xpath(`//select[@id='browseOptions2']/option[@value='${state}.${county}.${township}']`)
    )
    .click();
  console.log(township);

  await driver.wait(until.elementLocated(By.xpath("//ul[@class='browseList']")), 10000);
  await driver.findElement(By.linkText(district)).click();
  console.log(district);

  await driver.wait(until.elementLocated(By.xpath('//*[@id="toolsMenuTrigger"]')), 10000);
  console.log('woohoo');
};

const census = {
  '1910': census1910
};

start();
