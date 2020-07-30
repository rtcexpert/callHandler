const config = require('config');
const clearRequire = require('clear-require');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const domains = new Map() ;
const dids = new Map();

// initialize data: 
//    domains => users => {username / password / dids}
//    dids => {domain / username }
function initData() {
  domains.clear();
  dids.clear();

  config.get('domains').forEach((d) => {
    const users = new Map();
    d.users.forEach((u) => {
      users.set(u.username, u);
      (u.dids || []).forEach((did) => dids.set(did, `sip:${u.username}@${d.name}`));
    });
    domains.set(d.name, users);
  });
}
fs.watch(path.resolve(__dirname, '..', 'config'), (event, filename) => {
  if (event === 'change' && filename.endsWith('.json')) {
    clearRequire('config');
    initData();
  }
});
initData();

async function isValidDomain(domain) {
  try {
    const result = await utils.getRedisClient()
      .multi()
      .sismember("authenticatedIpList", domain)
      .execAsync();
      return result == 1 ? true : false;
  } catch (err) {
    console.log(err, `Error isValidDomain ${domain}`);
    return false;
  }
}

async function getUserPassword(domain, username) {
  
  try {
    const result = await utils.getRedisClient()
      .multi()
      .hget("authenticatedUserList", `${username}@${domain}`)
      .execAsync();
      return result[0];
  } catch (err) {
    console.log(err, `Error password check ${username}@${domain}`);
    return null;
  }
}

function getSipUserForDid(did) {
  return dids.get(did);
}

module.exports = {
  isValidDomain,
  getUserPassword,
  getSipUserForDid
};
