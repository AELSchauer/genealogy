const fs = require('fs');

class Query {
  static new(driver, citation) {
    let query = new Query(driver, citation)
    query.metadata()
    return query
  }

  constructor(driver, citation) {
    this.driver = driver
    this.citation = citation
  }

  metadata() {
    this.documentType = 'census'
    this.year = this.citation.match(/Year: ([0-9]{4});/)[1]
    this.referenceData = ReferenceDirectory[this.documentType][this.year]
    this.constants = ReferenceDirectory[this.documentType].constants
  }

  locations() {
    let locationRegex = this.constants.locationRegex
    let [ township, city, state ] = locationRegex.test(this.citation) && this.citation.match(locationRegex)[1].split(', ')
    return { township, city, state }
  }

  createDirectories() {
    var { township, city, state } = this.locations()
    if(!fs.existsSync(`/Users/aschauer/Downloads/genealogy/media/${state}/${city}/${township}`)) {
      fs.mkdirSync(`/Users/aschauer/Downloads/genealogy/media/${state}/${city}/${township}`, { recursive: true })
    }
  }

  citationFilename() {
    var { township, city, state } = this.locations()
    return `${state}/${city}/${township}/${this.referenceData.citationFilename(this.citation)}.jpg`
  }

  moveFile() {
    let file = fs.readdirSync('/Users/aschauer/Downloads').sort().find(file => /^[_\-0-9]+\.jpg$/.test(file));
    fs.renameSync(`/Users/aschauer/Downloads/${file}`, `/Users/aschauer/Downloads/genealogy/media/${this.citationFilename()}`)
  }
}

const filenameRegex = /([a-zA-Z ]+): /g;
const ReferenceDirectory = {
  census: {
    '1910': {
      url: 'https://search.ancestry.com/search/db.aspx?dbid=7884',
      matchRegex: / /,
      citationFilename: citation => `Census -- ${citation.replace(filenameRegex, '').replace(/ /g, '')}`,
    },
    constants: {
      locationRegex: /Census Place: ([a-zA-Z, ]+);/
    }
  }
}

module.exports = Query
