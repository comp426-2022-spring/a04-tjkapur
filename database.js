const database = require('better-sqlite3');

const db = new database('log.db');

const stmt = db.prepare(`
SELECT name FROM sqlite_master WHERE type='table' and name='userinfo';`
);

let row = stmt.get();

if (row == undefined) {

    console.log('Database is empty');

    const sqlInit = `CREATE TABLE accesslog ( id INTEGER NOT NULL PRIMARY KEY, remoteaddr TEXT, remoteuser TEXT, time INTEGER, method TEXT, url TEXT, protocol TEXT, httpversion TEXT, status INTEGER, referer TEXT, useragent TEXT);`;

    db.exec(sqlInit);

} else {

    console.log('Database already exists.');

}

// Export all of the above as a module so that we can use it elsewhere.

module.exports = db;