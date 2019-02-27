const { src, dest, series } = require('gulp')
const rename = require('gulp-rename')
const file = require('gulp-file')
const zip = require('gulp-zip')

const update = () => {
  const moduleInfo = require('./module.json')
  const packageInfo = require('./package.json')

  moduleInfo.updated = new Date(Date.now()).toLocaleString('en-US').split(',')[0]
  moduleInfo.author = packageInfo.author
  moduleInfo.version = packageInfo.version
  moduleInfo.description = packageInfo.description
  // build id
  const dashName = packageInfo.name.replace('zedit-', '')
  moduleInfo.id = dashName[0].toUpperCase() + dashName.replace(/-([a-z0-9])/g, (a, b) => b.toUpperCase()).slice(1)

  return file('./module.json', JSON.stringify(moduleInfo, null, 2), { src: true })
    .pipe(dest('.'))
}

const pack = () => {
  const moduleInfo = require('./module.json')
  const moduleId = moduleInfo.id
  const moduleVersion = moduleInfo.version

  return src([
    'index.js',
    'src/**/*',
    'partials/*.html',
    'LICENSE',
    'module.json'
  ], { base: '.', allowEmpty: true })
    .pipe(rename(path => {
      path.dirname = `${moduleId}/${path.dirname}`
      return path.dirname
    }))
    .pipe(zip(`${moduleId}-v${moduleVersion}.zip`))
    .pipe(dest('.'))
}

// module.exports = series(pack)
module.exports.pack = series(pack)
module.exports.update = series(update)
