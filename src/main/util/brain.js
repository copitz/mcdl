const jwd = require('natural/lib/natural/distance/jaro-winkler_distance')

export default class Brain {
  static METAS = ['album', 'title']
  static ARTIST = ['artist', 'album_artist']
  static MAX_ARTISTS = 3

  classifier
  objects = {}
  decisions = {}
  artistDecisions = {}

  addObject (id, object) {
    const meta = {...object}
    Brain.METAS.reverse().forEach(key => {
      const match = /\s+(?:feat(?:\.|uring)\s+(.+)|\((.+)remix\))$/.exec(meta[key] || '')
      if (match) {
        if (!meta.album_artist) {
          meta.album_artist = (match[1] || match[2] || '').replace(/\s+\(.+\)$/, '')
        }
        meta[key] = meta[key].substr(match.index, match[0])
      }
    })
    Brain.ARTIST.concat(Brain.METAS).forEach(key => {
      meta[key] = (meta[key] || '').toLowerCase()
    })

    this.objects[id] = meta
  }

  setDecisions (decisions) {
    this.decisions = decisions
  }

  setDecision (id, decision) {
    this.decisions[id] = decision
  }

  getDecisions () {
    const decisions = {}
    const hasDecisions = !!Object.keys(this.decisions).length
    Object.keys(this.objects).forEach(id => {
      if (this.decisions.hasOwnProperty(id)) {
        decisions[id] = this.decisions[id]
      } else if (hasDecisions) {
        decisions[id] = this.decide(id)
      }
    })
    return decisions
  }

  decide (id) {
    const decisions = []

    const meta = this.objects[id]
    const artists = Brain.ARTIST.filter(key => meta[key]).map(key => meta[key])

    Object.keys(this.decisions).forEach(id => {
      const decisionMeta = this.objects[id]
      const decisionArtists = Brain.ARTIST.filter(key => decisionMeta[key]).map(key => decisionMeta[key])

      const decision = this.decisions[id] ? 0.9999 : 0.0001

      let unimportance = 0
      artists.forEach((artist) => {
        const distance = Math.max(decisionArtists.map(decisionArtist => jwd(artist, decisionArtist)))
        if (distance >= 0.75) {
          unimportance++
          decisions.push(decision / unimportance * distance)
        }
      })
      Brain.METAS.forEach((key, i) => {
        const s1 = meta[key]
        const s2 = decisionMeta[key]
        if (s1 && s2) {
          const distance = jwd(s1, s2)
          if (distance > 0.8) {
            unimportance++
            decisions.push(decision / unimportance * distance)
          }
        }
      })
    })

    return decisions.length ? decisions.reduce((a, b) => a + b, 0) / decisions.length : 1
  }
}
