import Client from '../../util/client'
import IPC from '../../ipc'
import { BrowserWindow } from 'electron'
import atob from 'atob'
import { Cookie } from 'tough-cookie'

const client = new Client({ baseUrl: 'https://api.mixcloud.com/', json: true })
const graphqlClient = new Client({ baseUrl: 'https://www.mixcloud.com/', json: true, jar: true, retry: 3 })

const userInfos = {}

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

let id = 0
let cookieSniff

export default class Mixcloud {
  static userInfo (username) {
    return client.get(username + '/').then((response) => {
      const user = response.body
      userInfos[username] = user
      return {
        link: user.url,
        picture: user.pictures.extra_large,
        description: user.biog
      }
    })
  }

  static graphql (username, query) {
    query.id = 'q' + (++id)
    if (cookieSniff === undefined) {
      cookieSniff = new Promise((resolve, reject) => {
        const sniffWindow = new BrowserWindow({
          show: false,
          webPreferences: { devTools: false },
          parent: IPC.main.window,
          modal: true,
          minimizable: false,
          closeable: false,
          maximilable: false,
          frame: false
        })
        const contents = sniffWindow.webContents
        let resolved = false
        contents.on('did-finish-load', () => {
          const getLoginStatus = () => {
            contents.executeJavaScript(`
            document.querySelector('[data-username]')
            ? true
            : (document.querySelector('.user-actions.guest') ? false : null)
          `).then(res => {
              console.log(res, resolved)
              if (res === true) {
                sniffWindow.hide()
                contents.session.cookies.get({ url: 'https://www.mixcloud.com' }, (err, cookies) => {
                  if (err) {
                    reject(err)
                  }
                  const jar = graphqlClient.jar()
                  cookies.forEach(cookie => {
                    jar.setCookie(new Cookie({
                      key: cookie.name,
                      expires: cookie.expirationDate ? new Date(cookie.expirationDate * 1000) : 'Infinity',
                      ...cookie
                    }).toString(), graphqlClient.options.baseUrl)
                  })
                  if (!resolved) {
                    resolved = true
                    resolve()
                    cookieSniff = null
                    console.log(jar.getCookies(graphqlClient.options.baseUrl))
                    setTimeout(() => sniffWindow.destroy(), 5000)
                  }
                })
              } else if (res === false) {
                contents.executeJavaScript(`
                  if (!document.querySelector('.auth-modal')) {
                    document.querySelector('.user-actions.guest > :first-child').click();
                  }
                  document.body.style.overflow = 'hidden'
                  `, true).then(
                  () => {
                    sniffWindow.show()
                    setTimeout(getLoginStatus, 500)
                  }
                ).catch(reject)
              } else {
                setTimeout(getLoginStatus, 500)
              }
            })
          }
          getLoginStatus()
        })
        sniffWindow.loadURL(graphqlClient.options.baseUrl)
      })
    }
    const graphql = () => graphqlClient.post('graphql', {
      body: query,
      headers: {
        'X-CSRFToken': graphqlClient.getCookie('csrftoken').value,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://www.mixcloud.com/' + username
      }
    }).then(response => response.body.data)
    return cookieSniff ? cookieSniff.then(graphql) : graphql()
  }

  static castCount (username) {
    if (userInfos[username]) {
      return Promise.resolve(userInfos[username].cloudcast_count)
    } else {
      return this.userInfo(username).then(() => this.castCount(username))
    }
  }

  static casts (username) {
    let total = 0
    const loadCasts = function (url) {
      return client.get(url).then((response) => {
        const casts = response.body
        total += casts.data.length
        const nextCast = () => {
          const cast = casts.data.shift()
          return Promise.resolve({
            total,
            cast: cast ? {
              id: cast.slug,
              name: cast.name,
              link: cast.url,
              created: cast.created_time,
              updated: cast.updated_time,
              length: cast.audio_length,
              image: cast.pictures['1024wx1024h']
            } : null,
            next: !casts.data.length && casts.paging.next
              ? () => loadCasts(casts.paging.next)
              : nextCast
          })
        }
        return nextCast()
      })
    }
    return loadCasts(username + '/cloudcasts/')
  }

  static cast (username, slug) {
    return this.graphql(username, {
      query: 'query PlayerControls($lookup_0:CloudcastLookup!) {cloudcastLookup(lookup:$lookup_0) {id,...Fb}} fragment F1 on Cloudcast {id,streamInfo {url}} fragment F7 on TrackSection {artistName,songName,startSeconds} fragment F8 on ChapterSection {chapter,startSeconds} fragment F9 on Cloudcast {sections {__typename,...F7,...F8},id} fragment Fa on Cloudcast {id,...F9} fragment Fb on Cloudcast {id,...F1,...Fa}',
      variables: {
        lookup_0: {
          username: username,
          slug: slug
        }
      }
    }).then((res) => {
      const details = res.cloudcastLookup
      const src = decryptUrl(details.streamInfo.url)
      delete details.streamInfo
      return client.head(src).then(response => {
        details.src = {
          url: src,
          contentLength: parseInt(response.headers['content-length']),
          contentType: response.headers['content-type']
        }
        return details
      })
    })
  }
}
