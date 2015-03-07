var fs = require('fs')
var request = require('request')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var unzip = require('unzip')
var d3 = require('d3')
var dir = '_build'
var tmpDir = dir + '/tmp'

mkdirp.sync(dir)
mkdirp.sync(tmpDir)

function pad(num) { return num < 10 ? '0' + num : '' + num }

function getState(id, cb) {
  var url = 'http://www2.census.gov/geo/tiger/TIGER2014/PRISECROADS/tl_2014_'
    + pad(id) + '_prisecroads.zip'
  request.get({
    url: url,
    encoding: null
  }, function(err, res, body) {
    if (err) return cb(new Error('error thrown retrieving url: ' + url))
    if (res.statusCode !== 200)
      return cb(new Error('invalid response code ' + res.statusCode + ' url: '
        + url))
    var tmpFile = tmpDir + '/' + id + '.zip'
    fs.writeFile(tmpFile, body, function(err) {
      if (err) return cb(new Error('error saving zip for id ' + id))
      fs.createReadStream(tmpFile)
        .pipe(unzip.Extract({path: dir + '/states/' + id})
        .on('finish', cb))
    })
  })
}

var count = 80
d3.range(count).map(function(d) {
  getState(d, function() {
    if(!--count) rimraf(tmpDir, function() {})
  })
})
