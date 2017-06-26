'use strict';

const electron = require('electron');
const app = electron.app;
const electronWindow = require('electron-window')
const WindowStateManager = require('electron-window-state-manager');
require('./pref.js');
require('./appmenu.js');

app.commandLine.appendSwitch('disable-http-cache');

var mainWin;
var mainWinState = new WindowStateManager('mainWin', {
    defaultWidth: 1200,
    defaultHeight: 800,
});

function createWindow() {
    if (mainWin != null)
        return;
    mainWin = electronWindow.createWindow({
        'width': mainWinState.width,
        'height': mainWinState.height,
        'x': mainWinState.x,
        'y': mainWinState.y,
        'min-width': 220,
        'min-height': 220,
        'alwaysOnTop': false,
        'webPreferences': {
            'webSecurity': false,
        },
        'accept-first-mouse': true,
        'title-bar-style': 'hidden'
    });
    if (mainWinState.maximized)
        mainWin.maximize();
    mainWin.showURL('viewer/index.html');
    mainWin.on('close', () => {
        mainWinState.saveState(mainWin);
        mainWin = null;
    });
}

app.on('ready', () => createWindow());
app.on('activate', () => createWindow());

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})
