/// <reference path="./SpineView.ts" />
var main: any;
class Main {
    constructor() {
        Laya.Browser.container = Laya.Browser.getElementById("layaContainer");
        Laya.init(720, 1280, laya.webgl.WebGL);
        Laya.stage.scaleMode = Laya.Stage.SCALE_FIXED_HEIGHT;
        Laya.stage.screenMode = Laya.Stage.SCREEN_HORIZONTAL;
        Laya.stage.alignH = Laya.Stage.ALIGN_MIDDLE;
        Laya.stage.alignV = Laya.Stage.ALIGN_CENTER;
        main = this;
    }

    loadModel(source: string) {
        this.removeModel();
        let model = new ui.SpineView();
        model.aniPath = source;
        model.aniName = 'f_stand';
        model.isLoop = true;
        model.isInitPlay = true;
        model.pos(Laya.stage.width / 2, Laya.stage.height / 2 + 100);
        Laya.stage.addChild(model);
    }

    removeModel() {
        let model: ui.SpineView = Laya.stage.getChildAt(0) as any;
        if (!model)
            return;
        model.stop();
        model.removeSelf();
    }

    setModelScale(value: number) {
        let model: Laya.Sprite = Laya.stage.getChildAt(0) as any;
        if (!model)
            return;
        model.scale(value, value);
    }
}

new Main();
