var tesseract = require('node-tesseract');
var fs = require('fs');
var image = require("imageinfo");
var http = require('http');

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
// 0.搭建koa2 restful 服务器
// 1. 用户发送post请求到koa服务器
// 2. koa 服务器获取到参数，base64 string 发送至python OCR 服务器（flask-restful）做切图处理
// 3. 根据返回的路径来识别图片并保存结果
let allImgs = getFiles.getImageFiles("./cropped/");
let fullPath = ["C:\\Users\\liy3\\Desktop\\SeeMyOCRResult\\backend\\nodeOCR\\cropped\\temp_jpg\\0.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\1.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\2.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\3.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\4.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\5.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\6.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\7.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\8.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\9.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\10.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\11.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\12.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\13.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\14.jpg", "C:\Users\liy3\Desktop\SeeMyOCRResult\backend\nodeOCR\cropped\temp_jpg\15.jpg"]
// let fullPath = allImgs.map(img => "cropped/" + img);
console.log(fullPath)
let result = fullPath.map(recognizer);
Promise.all(result)
    .then(data => final.push(data))
    .then(data => console.log(final))
// 获取文件夹下的所有文件
// getFiles.getFileList("./public/");

