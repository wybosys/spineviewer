/**
 * Created by SONIC3D on 2017/4/27.
 */

declare module laya.ani.bone {
    class SpineAnimationTemplet extends Laya.Templet {
        loadSpineAni(spineResDir: string, spineFilename: string): void;
    }
}

declare module Laya {
    class SpineAnimationTemplet extends laya.ani.bone.SpineAnimationTemplet {
    }
}
