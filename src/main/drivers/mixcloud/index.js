import Client from '../../util/client'

const client = new Client({baseUrl: 'https://api.mixcloud.com/', json: true})

export default class Mixcloud {
  static userInfo (username) {
    return client.get(username + '/')
  }

  static graphql (query, callback) {
    client.get('graphql', {
      body: query,
      headers: {
        Origin: 'https://www.mixcloud.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
        Authority: 'www.mixcloud.com',
        Cookie: 's=rvraezp54zuuwz788ldoqo75wywfklba'
      }
    }).then(data => data.data)
  }
}
