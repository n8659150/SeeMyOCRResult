var tesseract = require('node-tesseract');
var fs = require('fs');
var image = require("imageinfo");

function readFileList(path, filesList) {
    var files = fs.readdirSync(path);
    files.forEach(function (itm, index) {
        var stat = fs.statSync(path + itm);
        if (stat.isDirectory()) {
            //递归读取文件
            readFileList(path + itm + "/", filesList)
        } else {

            var obj = {};//定义一个对象存放文件的路径和名字
            obj.path = path;//路径
            obj.filename = itm//名字
            filesList.push(obj);
        }

    })

}

var getFiles = {
    //获取文件夹下的所有文件
    getFileList: function (path) {
        var filesList = [];
        readFileList(path, filesList);
        return filesList;
    },
    //获取文件夹下的所有图片
    getImageFiles: function (path) {
        var imageList = [];

        this.getFileList(path).forEach((item) => {
            var ms = image(fs.readFileSync(item.path + item.filename));

            ms.mimeType && (imageList.push(item.filename))
        });
        return imageList;

    }
};


/**
 * 识别图片
 * @param imgPath
 * @param options tesseract options
 * @returns {Promise}
 */
function recognizer (imgPath, options) {
    options = Object.assign({l: 'chi_sim'}, options);
    return new Promise((resolve, reject) => {
        tesseract.process(imgPath, options, (err, text) => {
                if (err) return reject(err);
                resolve(text.replace(/[\r\n\s]/gm, ''));
            });
    })
}


//获取文件夹下的所有图片
let final = [];
let allImgs = getFiles.getImageFiles("./cropped/");
let fullPath = allImgs.map(img => "cropped/" + img)
let result = fullPath.map(recognizer);
Promise.all(result)
    .then(data => final.push(data))
    .then(data => console.log(final))
// 获取文件夹下的所有文件
// getFiles.getFileList("./public/");

