import fs from 'fs-extra'
import utils from './utils'
import sanitize from 'sanitize-filename'
import pathinfo from 'path'
import config from './config'
import {spawn} from 'child_process'

function extract (profile, path, target, start, length, meta, callback) {
  const cmd = ['-ss', start, '-i', path]
  Array.prototype.push.apply(cmd, config.ffmpeg_profiles[profile].options)
  if (length) {
    cmd.push('-t')
    cmd.push(length)
  }
  for (let key in meta) {
    if (meta.hasOwnProperty(key)) {
      cmd.push('-metadata')
      cmd.push(key + '=' + meta[key])
    }
  }

  cmd.push(target)

  const prc = spawn(config.ffmpeg_path, cmd)

  // noinspection JSUnresolvedFunction
  prc.stdout.setEncoding('utf8')
  prc.stdout.on('data', function (data) {
    const str = data.toString()
    const lines = str.split(/(\r?\n)/g)
    console.log(lines.join(''))
  })

  prc.on('close', function (code) {
    callback(code)
  })
}

function trim (string) {
  if (typeof string !== 'string') {
    return string
  }
  return string.replace(/[\u200B-\u200E\uFEFF]/g, '').trim()
}

function getMeta (metaSources, title, artist, username, chapter, cloudcast) {
  const fields = {
    title: trim(title),
    artist: trim(artist),
    username: trim(username),
    chapter: trim(chapter),
    cloudcast: trim(cloudcast)
  }
  const meta = {
    title: fields.title || fields.chapter || fields.cloudcast, artist: fields.artist || fields.username
  }
  metaSources.forEach(function (metaSource) {
    let value
    if (metaSource.hasOwnProperty('value')) {
      value = metaSource.value
    } else if (metaSource.field && fields.hasOwnProperty(metaSource.field) && fields[metaSource.field]) {
      if (metaSource.pattern) {
        const matches = fields[metaSource.field].match(new RegExp(metaSource.pattern))
        if (matches) {
          value = matches[1] || matches[0]
        }
      } else {
        value = fields[metaSource.field]
      }
    }
    value = trim(value)
    if (value) {
      meta[metaSource.tag] = value
    }
  })
  return meta
}

const split = {
  all: function (preset) {
    const options = preset.split
    const mcdl = utils.loadMcdl(preset.dir)
    utils.iterateCasts(mcdl.cloudcasts, function (iterator) {
      const label = (iterator.offset + 1) + '/' + iterator.total + ': '
      console.log(label + iterator.current.name)

      split.cast(iterator.current, preset.dir, {
        username: mcdl.user.username,
        onReady: iterator.next,
        onSkip: iterator.skip,
        prefix: ' '.repeat(label.length),
        meta: options.meta,
        profile: options.profile
      })
    }, {limit: options.limit})
  },
  cast: function (cast, dir, options) {
    const path = dir + '/' + cast.details.src.path
    const ext = pathinfo.extname(path)
    const basename = pathinfo.basename(path, ext)
    const dirname = pathinfo.dirname(path)
    const targetDir = dirname + '/' + basename
    const tracks = []
    let chapter
    const prefix = options.prefix || ''

    if (!fs.existsSync(path) || fs.statSync(path).size < cast.details.src.content_length) {
      console.log(prefix + 'Download incomplete - skipping')
      return options.onSkip ? options.onSkip() : undefined
    }
    console.log(prefix + '> ' + pathinfo.basename(dirname) + '/' + basename)
    if (fs.existsSync(targetDir)) {
      console.log(prefix + '  Exists - skipping')
      return options.onSkip ? options.onSkip() : undefined
    }

    fs.ensureDirSync(targetDir)
    cast.details.cloudcast.sections.forEach(function (section) {
      if (section.chapter) {
        chapter = section.chapter
      } else if (section.artistName) {
        if (!tracks.length && section.startSeconds > 0) {
          tracks.push({
            start: 0,
            meta: getMeta(options.meta || [], 'Intro', undefined, options.username, chapter, cast.name)
          })
        }
        tracks.push({
          start: section.startSeconds,
          meta: getMeta(options.meta || [], section.songName, section.artistName, options.username, chapter, cast.name)
        })
      }
    })
    let i = -1
    const nextTrack = function () {
      i++
      if (i >= tracks.length) {
        utils.download(cast.pictures.large, targetDir + '/Cover.jpg', function () {
          console.log(prefix + '  Cover.jpg')
          if (options.onReady) {
            options.onReady()
          }
        }, prefix.length + 2)
        return
      }
      const track = tracks[i]
      track.meta.track = (i + 1) + '/' + tracks.length
      const tracksDigits = ('' + tracks.length).length
      const filename = sanitize(
        ('0'.repeat(tracksDigits) + (i + 1)).slice(-1 * tracksDigits) +
        '. ' + track.meta.artist + ' - ' + track.meta.title
      ) + '.' + (config.ffmpeg_profiles[options.profile].extension || ext.substr(1))
      console.log(prefix + '  ' + filename)
      extract(
        options.profile,
        path,
        targetDir + '/' + filename,
        track.start,
        (i + 1 < tracks.length) ? (tracks[i + 1].start - track.start) : undefined,
        track.meta,
        function (code) {
          if (code > 0) {
            fs.removeSync(targetDir)
            throw new Error('Something went wrong during conversion')
          } else {
            nextTrack()
          }
        }
      )
    }
    nextTrack()
  }
}

export default split
