'use strict'

var request = require('request')
var cheerio = require('cheerio')
var d3 = require('d3')
var fs = require('fs')
var fmt = require('util').format
var exec = require('child_process').exec
var mkdirp = require('mkdirp')
var async = require('async')
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

function downloadAndUnzip(file, outputDir, cb) {
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
        .pipe(unzip.Extract({path: outputDir})
          .on('close', function() { cb(null) })
        )
    })
  })
}

getLinks(function(err, links) {
  if (err) throw err
  // links = links.slice(0, 10)
  var complete = 0
  var openProcs = 0
  var tasks = links.map(function(link) {
    link = link.replace('.zip', '')
    return function task(cb) {
      var outputDir = buildDir + '/all-streets/' + link
      downloadAndUnzip(link, outputDir, function(err) {
        if (err) throw err
        var cmd = fmt('ogr2ogr -t_srs EPSG:4326 -f ' +
          'GeoJSON %s/data.json %s/%s.shp',
          outputDir, outputDir, link)
        openProcs++
        exec(cmd, function onComplete(err, stdout, stderr) {
          openProcs--
          if (err) {
            console.warn(cmd)
            console.warn(err, stdout, stderr)
          }
          cmd = fmt('topojson -o %s/data.topojson %s/data.json',
            outputDir, outputDir)

          openProcs++
          exec(cmd, function onComplete(err, stdout, stderr) {
            openProcs--
            if (err) {
              console.warn(cmd)
              console.warn(err, stdout, stderr)
            }
            console.log('progress: ', d3.round(++complete / links.length * 100, 2) + '%')
            console.log('open procs', openProcs)
            cb(null)
          })
        })
      })
    }
  })
  async.parallelLimit(tasks, 5, function(err) {
    if (err) throw err
    console.log('DONE MOTHAFUCKA')
  })
})
