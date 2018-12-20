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
        const matches = fields[metaSource.field].match(new RegExp(metaSource.pattern, metaSource.flags))
        if (matches.groups) {
          Object.assign(meta, matches.groups)
          return
        }
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
    const splitOptions = options.split || {}
    const chapterOptions = splitOptions.chapters || {}
    const metaSources = options.meta || []
    const username = options.username
    const castName = cast.name
    const tracks = []
    let chapter

    const last = castDetails.sections.length - 1
    let chapters = []
    castDetails.sections.forEach(function (section, i) {
      const start = section.startSeconds
      const length = (i === last ? cast.length : castDetails.sections[i + 1].startSeconds) - start
      const id = cast.name + '-' + i
      if (section.chapter && (!chapterOptions.exclude || (!tracks.length && chapterOptions.includeFirst))) {
        chapters.push({ start, id, length, title: section.chapter })
      } else if (section.artistName) {
        if (chapters.length) {
          if (chapters.length > 1 && chapterOptions.merge) {
            let mergedTitle
            if (chapterOptions.mergeStrategy === 'join') {
              mergedTitle = chapters.map(c => c.name).join(', ')
            } else {
              mergedTitle = chapters[chapterOptions.mergeStrategy === 'first' ? 0 : chapters.length - 1].title
            }
            chapters = [{
              start: chapters[0].start,
              id: chapters[chapterOptions.mergeStrategy === 'first' ? 0 : chapters.length - 1].id,
              length: chapters.reduce((s, c) => s + c.length, 0),
              title: mergedTitle
            }]
          }
          chapters.forEach(c => {
            chapter = !tracks.length && chapterOptions.firstChapterFixed ? chapterOptions.firstChapterFixedTitle : c.title
            tracks.push({
              ...c,
              length: section.startSeconds,
              meta: getMeta(metaSources, chapter, undefined, username, chapter, castName)
            })
          })
          chapters = []
        }
        tracks.push({
          id,
          start,
          length,
          meta: getMeta(metaSources, section.songName, section.artistName, username, chapter, castName)
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
