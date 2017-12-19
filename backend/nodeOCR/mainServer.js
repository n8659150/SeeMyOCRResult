// koa 服务器模块
const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const router = require('koa-router')();

var cors = require('koa2-cors');
// koa 服务器模块 结束


// 识别引擎 + 文件读取 模块
var tesseract = require('node-tesseract');

var fs = require('fs');

// var path = require('path');


// http请求相关模块
var request = require('request');
// http请求相关模块 结束


// OCR识别 -- 切图服务
const imgProcess = require('./services/imgProcess')
// OCR识别 -- 图片读取服务
const fileReader = require('./services/fileReader')

// OCR识别 -- OCR主模块
const OCR = require('./services/OCR')

// OCR识别 -- 分词处理
const textProcess = require('./services/textProcess')

// function readFileList(path, filesList) {
//     var files = fs.readdirSync(path);
//     files.forEach(function (itm, index) {
//         var stat = fs.statSync(path + itm);
//         if (stat.isDirectory()) {
//             //递归读取文件
//             readFileList(path + itm + "/", filesList)
//         } else {
//             var obj = {};//定义一个对象存放文件的路径和名字
//             obj.path = path;//路径
//             obj.filename = itm//名字
//             filesList.push(obj);
//         }
//     })

// }

// var getFiles = {
//     readFileList:function (path, filesList) {
//         var files = fs.readdirSync(path);
//         files.forEach(function (itm, index) {
//             var stat = fs.statSync(path + itm);
//             if (stat.isDirectory()) {
//                 //递归读取文件
//                 readFileList(path + itm + "/", filesList)
//             } else {
//                 var obj = {};//定义一个对象存放文件的路径和名字
//                 obj.path = path;//路径
//                 obj.filename = itm//名字
//                 filesList.push(obj);
//             }
//         })
//     },
//     //获取文件夹下的所有文件
//     getFileList: function (path) {
//         var filesList = [];
//         readFileList(path, filesList);
//         return filesList;
//     },
//     //获取文件夹下的所有图片
//     getImageFiles: function (path) {
//         var imageList = [];
//         this.getFileList(path).forEach((item) => {
//             imageList.push(item.path + item.filename)
//         });
//         return imageList;
//     }
// };


// /**
//  * 识别图片
//  * @param imgPath
//  * @param options tesseract options
//  * @returns {Promise}
//  */
// function recognizer (imgPath, options) {
//     options = Object.assign({ l: 'chi_sim' }, options);
//     return new Promise((resolve, reject) => {
//         tesseract.process(imgPath, options, (err, text) => {
//             if (err) return reject(err);
//             resolve(text.replace(/[\r\n\s]/gm, ''));
//         });
//     })
// }

// var formData = {
//     // Pass a simple key-value pair
//     data_uri: testuri
// };



// koa服务器
const app = new Koa();
// log request URL:
app.use(async (ctx, next) => {
    console.log(`${ctx.request.url} 收到 ${ctx.request.method} 请求...`);
    await next();
});

// body内容解析器内容--最大容量 配置
app.use(bodyParser({
    formLimit: '5mb',
    jsonLimit: '5mb',
    textLimitL: '5mb'
}));

// cors 配置
app.use(cors({
    origin: function (ctx) {
        if (ctx.url === '/ocr') {
            return "*"; // 允许来自所有域名请求
        }
        return false
    }
}
))

router.post('/ocr', async function (ctx, next) {
    console.time('ocr')
    var data_uri = ctx.request.body.data_uri || '';
    if (data_uri) {
        let serverUrl = imgProcess.serverUrl;
        let result = await imgProcess.processRequest(imgProcess.serverUrl, { data_uri });
        
        if(result !== '200') return 
        let rawTextArray = [];
        let allImgs = fileReader.getFile.getImageFiles("./cropped/");
        let rawTextPromises = await allImgs.map(OCR.recognizer);
        for (let rawTextPromise of rawTextPromises) {
            rawTextArray.push(await rawTextPromise)
        }
        let final = textProcess.generateTagsByRank(rawTextArray.toString(),15)
        ctx.response.body = final
        console.timeEnd('ocr')
        // Promise.all(rawText)
        //     .then(data => final.push(data))
            // .then(data => console.log(final))




    } else {
        ctx.response.body = "404!";
    }
});

// add router middleware:
app.use(router.routes());

app.listen(3000);
console.log(`服务器在 端口: 3000 启动`);