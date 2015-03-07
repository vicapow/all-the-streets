'use strict'

var request = require('request')
var cheerio = require('cheerio')
var fs = require('fs')
var mkdirp = require('mkdirp')
var unzip = require('unzip')
var buildDir = '_build'
var tmpDir = buildDir + '/tmp'
var sourceUrl = 'http://www2.census.gov/geo/tiger/TIGER2014/ROADS/'

mkdirp.sync(buildDir)
mkdirp.sync(tmpDir)

function getLinks(cb) {
  try {
    return cb(null, JSON.parse(fs.readFileSync(buildDir + '/links.json')))
  } catch (e) { }
  request.get({
    url: sourceUrl
  }, function(err, res, body) {
    if (err || !res.statusCode === 200)
      return cb(new Error('Unable to get listing of road files'))
    var $ = cheerio.load(body)
    var links = [].slice.call($('table td a'), 1)
      .map(function(d) { return d.attribs.href })
    fs.writeFileSync(buildDir + '/links.json', JSON.stringify(links))
    cb(null, links)
  })
}

function downloadAndUnzip(file, cb) {
  file = file.replace('.zip', '')
  console.log('downloading: ' + file)
  var url = sourceUrl + file + '.zip'
  request.get({url: url, encoding: null}, function(err, res, body) {
    if (err) return cb(new Error('error thrown retrieving url: ' + url))
    if (res.statusCode !== 200)
      return cb(new Error('invalid response code ' + res.statusCode + ' url: '
        + url))
    var tmpFile = tmpDir + '/' + file + '.zip'
    fs.writeFile(tmpFile, body, function(err) {
      if (err) return cb(new Error('error saving zip for name ' + file))
      fs.createReadStream(tmpFile)
        .pipe(unzip.Extract({path: buildDir + '/all-streets/' + file})
        .on('finish', cb))
    })
  })
}

getLinks(function(err, links) {
  if (err) throw err
  links = links.slice(0, 5)
  links.forEach(function(link) {
    downloadAndUnzip(link, function(err) {
      if (err) throw err
    })
  })
})
