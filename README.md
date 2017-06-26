安装和运行
npm install -g electron-prebuilt
npm install -g electron-packager
cd .
npm install
electron .

打包
electron-packager ./ ResViewer --platform=darwin --arch=x64
或
electron-packager ./ ResViewer --platform=win32 --arch=all
