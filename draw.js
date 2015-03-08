'use strict';
var fs = require('fs')
var Canvas = require('canvas')
var d3 = require('d3')
var async = require('async')
var topojson = require('topojson')
var Image = Canvas.Image

var factor = 15
var width = 1440 * factor, height = 900 * factor
var canvas = new Canvas(width, height)
var ctx = canvas.getContext('2d')

var projection = d3.geo.albersUsa()
  .translate([width / 2, height / 2])
  .scale(25000)

var path = d3.geo.path().projection(projection).context(ctx)

ctx.fillStyle = 'black'
ctx.fillRect(0, 0, width, height)

ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
ctx.lineWidth = 1

var process = 0
var topofiles = directories('_build/all-streets')
  .map(function(dir) { return '_build/all-streets/' + dir + '/data.topojson' })
  // .slice(0, 100)

var us = JSON.parse(fs.readFileSync('./us.json'))


var tasks = topofiles.map(function(filepath) {
  return function drawTopojson(cb) {
    fs.readFile(filepath, function(err, file) {
      if (err) {
        console.warn('missing file', filepath)
        return cb(null)
      }
      var t
      var shapefile
      var roads

      t = Date.now()
      shapefile = JSON.parse(file)
      console.log('parse time', Date.now() - t); t = Date.now()
      roads = topojson.feature(shapefile, shapefile.objects.data)
      console.log('extract time', Date.now() - t); t = Date.now()
      roads.features.forEach(function(road) {
        ctx.beginPath()
        path(road)
        ctx.stroke()
      })
      console.log('stroke time', Date.now() - t)
      console.log('process', d3.round(++process / topofiles.length * 100, 2) + '%')
      console.log('filepath', filepath)
      shapefile = null
      roads = null
      file = null
      cb(null)
    })
  }
})

// If you uncomment these lines, you can see an outline of what the US instead of going through each data file. This is useful to debugging changes to the projection.
// tasks = []
// ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
// ctx.beginPath()
// path(topojson.feature(us, us.objects.land))
// ctx.stroke()

async.parallelLimit(tasks, 1028, function(err) {
  console.log('Finishing up!')
  canvas.pngStream().pipe(fs.createWriteStream(__dirname + '/out/out.png'))
})

function directories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(srcpath + '/' + file).isDirectory()
  });
}
