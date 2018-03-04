function trim (string) {
  if (typeof string !== 'string') {
    return string
  }
  return string.replace(/[\u200B-\u200E\uFEFF]/g, '').trim()
}

function getMeta (metaSources, title, artist, username, chapter, cast) {
  const fields = {
    title: trim(title),
    artist: trim(artist),
    username: trim(username),
    chapter: trim(chapter),
    cast: trim(cast)
  }
  const meta = {
    track: undefined,
    title: fields.title || fields.chapter || fields.cast,
    artist: fields.artist || fields.username
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

export default class Splitter {
  static getTracks (options, cast, castDetails) {
    const meta = (options.split || {}).meta || []
    const username = options.username
    const castName = cast.name
    const tracks = []
    let chapter

    castDetails.sections.forEach(function (section) {
      if (section.chapter) {
        chapter = section.chapter
      } else if (section.artistName) {
        if (!tracks.length && section.startSeconds > 0) {
          tracks.push({
            start: 0,
            meta: getMeta(meta, 'Intro', undefined, username, chapter, castName)
          })
        }
        tracks.push({
          start: section.startSeconds,
          meta: getMeta(meta, section.songName, section.artistName, username, chapter, castName)
        })
      }
    })

    tracks.forEach((track, i) => {
      if (!track.meta.track) {
        track.meta.track = (i + 1) + '/' + tracks.length
      }
    })

    return tracks
  }
}
