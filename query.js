const { Builder, By, Chrome, Key, TimeUnit, until } = require('selenium-webdriver');
const fs = require('fs');

class Query {
  static new(driver, citation) {
    let query = new Query(driver, citation)
    query.getMetadata()
    return query
  }

  constructor(driver, citation) {
    this.driver = driver
    this.citation = citation
  }

  getMetadata() {
    let { yearRegex } = globalConstants
    this.documentType = 'census'
    this.year = this.citation.match(yearRegex)[1]
    this.constants = {
      ...ReferenceDirectory.constants,
      ...ReferenceDirectory[this.documentType].constants,
      ...ReferenceDirectory[this.documentType][this.year],
    }
  }

  get url() {
    return this.constants.url
  }

  get locations() {
    let locationRegex = this.constants.locationRegex;
    let [ township, county, state ] = locationRegex.test(this.citation) && this.citation.match(locationRegex)[1].split(', ')
    return { township, county, state }
  }

  get district() {
    let districtRegex = this.constants.districtRegex;
    return districtRegex.test(this.citation) && this.citation.match(districtRegex)[1]
  }

  get page() {
    let pageRegex = this.constants.pageRegex;
    return pageRegex.test(this.citation) && parseInt(this.citation.match(pageRegex)[1])
  }

  async findAncestryCitation() {
    var { township, county, state } = this.locations
    await this.driver.get(this.url);

    await this.selectDropdown(0, state)
    await this.selectDropdown(1, `${state}.${county}`)
    await this.selectDropdown(2, `${state}.${county}.${township}`)

    await this.driver.sleep(5000)
    await this.driver.wait(until.elementLocated(By.xpath("//ul[@class='browseList']")), 10000)
    await this.driver.findElement(By.linkText(`District ${this.district}`)).click()

    await this.driver.wait(until.elementLocated(By.xpath('//*[@id="floatingControl"]/button[2]')), 10000)
    await this.driver.findElement(By.xpath('//*[@id="floatingControl"]/button[2]')).click()

    await this.driver.wait(until.elementLocated(By.xpath('//div[@id="infoPanelContent"]/header/div/menu/button[2]')), 10000)
    await this.driver.findElement(By.xpath('//div[@id="infoPanelContent"]/header/div/menu/button[3]')).click()

    var x = 1
    var maxPages = await parseInt(this.driver.findElement(By.xpath('//*[@id="footer"]/div[2]/div[1]/div/div/span[3]')).getText())
    while(x < 50) {
      var [ oldIndex, oldPage ] = await this.nextPage(oldIndex, oldPage)
      await this.driver.sleep(1000)
      x++
      if (oldPage > this.page) {
        x = 50
      }
      else if (this.page <= maxPages) {
        x = 50
      }
    }
  }

  async selectDropdown(index, value) {
    await this.driver.wait(until.elementLocated(By.xpath(`//select[@id='browseOptions${index}']`)), 10000)
    await this.driver.wait(until.elementIsEnabled(this.driver.findElement(By.xpath(`//select[@id='browseOptions${index}']`))), 10000)
    await this.driver.findElement(By.xpath(`//select[@id='browseOptions${index}']/option[@value='${value.replace(/ /g, "+")}']`)).click()
  }


  async nextPage(oldIndex=0, oldPage) {
    let pageRegex = this.constants.pageRegex
    var currentIndex = await this.driver.findElement(By.xpath('//*[@id="footer"]/div[2]/div[1]/div/div/input')).getAttribute("value")
    if (currentIndex === oldIndex) {
      var currentPage = oldPage
    }
    else {
      let tempCitation = await this.driver.findElement(By.xpath('//div[@class="sourceCitation"]/div/p[1]')).getText()
      var currentPage = pageRegex.test(tempCitation) && parseInt(tempCitation.match(pageRegex)[1])
      var version = (this.constants.dualPages && currentPage === oldPage) ? 'B' : 'A'
      if (currentPage === this.page) {
        this.saveImage(version)
        this.driver.sleep(10000)
      }
    }
    if (currentPage <= this.page) {
      await this.driver.findElement(By.xpath('//div[@class="pageCountWrapInner next"]')).click()
    }
    return [ currentIndex, oldPage ]
  }

  async saveImage(version) {
    await this.driver.findElement(By.xpath('//*[@id="saveMenuBtn"]')).click();
    await this.driver.findElement(By.xpath('//*[@id="saveMenuDiv"]/div/div[2]/button[5]')).click();
    await this.driver.sleep(5000);
    // await new Promise((resolve) => {
    //   driver.findElement(By.xpath('//*[@id="notificationBar"]/div'), 5000)
    //   .then(element => {
    //     return element.getText()
    //   })
    //   .then(pageError => {
    //     console.log(pageError)
    //     if (pageError === refreshError) {
    //       console.error('refresh page')
    //     }
    //     return resolve()
    //   })
    //   .catch(() => {
    //     return resolve()
    //   })
    // })
    this.moveFile(version)
  }

  get basePath() {
    return "/Users/ashleyschauer"
    // return "/Users/aschauer"
  }

  moveFile(version) {
    var { township, county, state } = this.locations
    if(!fs.existsSync(`${this.basePath}/Downloads/genealogy/media/${state}/${county}/${township}`)) {
      fs.mkdirSync(`${this.basePath}/Downloads/genealogy/media/${state}/${county}/${township}`, { recursive: true })
    }
    // console.log(this.citationFilename(version))
    let file = fs.readdirSync(`${this.basePath}/Downloads`).sort().find(file => /^[_\-0-9]+\.jpg$/.test(file));
    fs.renameSync(`${this.basePath}/Downloads/${file}`, `${this.basePath}/Downloads/genealogy/media/${this.citationFilename(version)}`)
  }

  citationFilename(version) {
    var { township, county, state } = this.locations
    return `${state}/${county}/${township}/${this.constants.citationFilename(this.citation, version)}.jpg`
  }
}

const globalConstants = {
  districtRegex: /Enumeration District: ([0-9]{4});/,
  filenameRegex: /([a-zA-Z ]+): /g,
  pageRegex: /Page: ([0-9]+)/,
  yearRegex: /Year: ([0-9]{4});/,
}

const ReferenceDirectory = {
  census: {
    '1900': {
      url: 'https://search.ancestry.com/search/db.aspx?dbid=7602',
      matchRegex: /^Year: 1900; Census Place: ([- ,a-zA-Z]+);( Roll: ([0-9]+);)? Page: ([0-9]{2}[AB]?); Enumeration District: ([0-9]{4}); FHL microfilm: ([0-9]+)$/,
      dualPages: true
    },
    '1910': {
      url: 'https://search.ancestry.com/search/db.aspx?dbid=7884',
      // matchRegex: / /,
    },
    constants: {
      locationRegex: /Census Place: ([a-zA-Z, ]+);/,
      citationFilename: (citation, version='') =>
        `Census -- ${
          citation
            .replace(globalConstants.pageRegex, `@[$1]${version}`)
            .replace(globalConstants.filenameRegex, '')
            .replace(/ ,/g, ',')
        }`,
    }
  },
  constants: globalConstants
}

module.exports = Query
