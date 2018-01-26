import fs from 'fs-extra'
import request from 'request'
import utils from './utils'
import pathinfo from 'path'
import atob from 'atob'
import mime from 'mime'

function decryptUrl (e) {
  const s = 'IFYOUWANTTHEARTISTSTOGETPAIDDONOTDOWNLOADFROMMIXCLOUD'
  const c = s.length
  // Next is literaly taken from mixclouds source code - search for it if s changed
  // eslint-disable
  for (var t = [], n = atob(e), r = n.length, a = 0; a < r; a++) {
    t[a] = n.charCodeAt(a) ^ s.charCodeAt(a % c)
  }
  return String.fromCharCode.apply(String, t)
  // eslint-enable
}

function getPlayerDetails (username, slug, resolve) {
  utils.graphql({
    id: 'q57',
    query: 'query ListenersBar($lookup_0:CloudcastLookup!,$first_1:Int!,$filter_2:UserConnectionFilterEnum!) {cloudcastLookup(lookup:$lookup_0) {id,...F2}} fragment F0 on Picture {urlRoot,primaryColor} fragment F1 on User {id} fragment F2 on Cloudcast {slug,plays,owner {username,id},_listeners2PPRJR:listeners(first:$first_1,filter:$filter_2) {edges {cursor,node {id,username,displayName,picture {...F0},...F1}},pageInfo {hasNextPage,hasPreviousPage}},id}',
    variables: {
      lookup_0: {
        username: username,
        slug: slug
      },
      first_1: 10,
      filter_2: 'FOLLOWING'
    }
  }).then(function (res) {
    if (!res || !res.cloudcastLookup || !res.cloudcastLookup.id) {
      throw new Error('Could not determine ID of ' + username + '/' + slug)
    }
    const id = res.cloudcastLookup.id
    utils.graphql({
      id: 'q69',
      query: 'query PlayerControls($id_0:ID!) {cloudcast(id:$id_0) {id,...Fb}} fragment F0 on Picture {urlRoot,primaryColor} fragment F1 on Cloudcast {id,isPublic,isFavorited,streamInfo {url},owner {id,username,displayName,isFollowing,isViewer},favorites {totalCount},slug} fragment F2 on Cloudcast {id,isUnlisted,isPublic} fragment F3 on Cloudcast {id,isUnlisted,isPublic,slug,description,picture {urlRoot},owner {displayName,isViewer,username,id}} fragment F4 on Cloudcast {id,isReposted,isPublic,reposts {totalCount},owner {isViewer,id}} fragment F5 on Cloudcast {id,isPublic,restrictedReason,owner {isViewer,id}} fragment F6 on Cloudcast {isPublic,owner {isViewer,id},id,...F1,...F2,...F3,...F4,...F5} fragment F7 on TrackSection {artistName,songName,startSeconds} fragment F8 on ChapterSection {chapter,startSeconds} fragment F9 on Cloudcast {juno {guid,chartUrl},sections {__typename,...F7,...F8},id} fragment Fa on Cloudcast {id,waveformUrl,owner {id,isFollowing},...F9} fragment Fb on Cloudcast {id,name,slug,isPublic,owner {id,username,isFollowing,isViewer,displayName,followers {totalCount}},picture {...F0},...F6,...Fa}',
      variables: {
        id_0: id
      }
    }).then(function (details) {
      if (!details || !details.cloudcast) {
        throw new Error('Could not load details of ' + username + '/' + slug)
      }
      if (!details.cloudcast.streamInfo || !details.cloudcast.streamInfo.url) {
        throw new Error('Could not load streamInfo of ' + username + '/' + slug)
      }
      const src = decryptUrl(details.cloudcast.streamInfo.url)
      request.head(src, function (error, response) {
        if (!error && response.statusCode === 200) {
          details.src = {
            url: src,
            content_length: parseInt(response.headers['content-length']),
            content_type: response.headers['content-type']
          }
          resolve(details)
        } else {
          throw new Error('Could not load ' + src)
        }
      })
    })
  })
}

export default function (preset) {
  const username = preset.username
  const targetDir = preset.dir
  const mcdlPath = targetDir + '/.mcdl'

  if (!utils.acquireLock(targetDir, 'downloading')) {
    return
  }

  utils.userInfo(username).then(function (info) {
    const mcdl = fs.existsSync(mcdlPath) ? fs.readJsonSync(mcdlPath) : {}
    let currentCast = 0
    mcdl.user = info
    if (!mcdl.cloudcasts) {
      mcdl.cloudcasts = {}
    }
    const loadCasts = function (url) {
      utils.request(url).then(function (casts) {
        let cast
        let label
        const ready = function () {
          console.log(' '.repeat(label.length) + '> ' + pathinfo.basename(targetDir) + '/' + cast.details.src.path)
          nextCast()
        }
        const nextCast = function () {
          cast = casts.data.shift()
          if (cast) {
            currentCast++
            label = currentCast + '/' + info.cloudcast_count + ': '
            if (mcdl.cloudcasts.hasOwnProperty(cast.slug)) {
              cast = mcdl.cloudcasts[cast.slug]
              const path = targetDir + '/' + cast.details.src.path
              console.log(label + cast.name)
              if (!fs.existsSync(path) || fs.statSync(path).size < cast.details.src.content_length) {
                utils.download(cast.details.src.url, path, ready, label.length)
              } else {
                ready()
              }
            } else {
              delete cast.user
              getPlayerDetails(username, cast.slug, function (details) {
                cast.details = details
                cast.details.src.path = cast.created_time.substr(0, 10) + '-' + cast.slug + '.' + mime.getExtension(details.src.content_type)
                const path = targetDir + '/' + cast.details.src.path
                mcdl.cloudcasts[cast.slug] = cast
                fs.ensureDirSync(preset.dir)
                fs.writeJsonSync(mcdlPath, mcdl)
                console.log(label + cast.name)
                utils.download(details.src.url, path, ready, label.length)
              })
            }
          } else if (casts.paging.next) {
            loadCasts(casts.paging.next)
          }
        }
        nextCast()
      })
    }
    loadCasts(username + '/cloudcasts/')
  })
}
