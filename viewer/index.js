let path = require('path');
let fs = require('fs');
let remote = require('electron').remote;
let dialog = remote.dialog;
let pref = remote.require('./pref');
pref.load();

function loadModel() {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{name: 'model', extensions: ['sk', 'json']}],
    }, function (files) {
        if (!files || files.length == 0) return;
        let source = 'file://' + files[0];
        main.loadModel(source);
    })
}

$(() => {
    $(document).tooltip();
    $('#txtScale').on('change', e => {
        let num = +e.target.value;
        !isNaN(num) && num > 0 && main.setModelScale(num);
    })
})
