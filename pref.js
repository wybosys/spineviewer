const nconf = require('nconf').file({file: getUserHome() + '/ModelViewer.json'});

nconf.load();

function getUserHome() {
    return process.platform == 'win32' ? './' : process.env['HOME'];
}

module.exports = nconf;
