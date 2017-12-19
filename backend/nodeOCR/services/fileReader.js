const fs = require('fs');
exports.getFile  = {
    readFileList(path, filesList) {
        let self = this;
        let files = fs.readdirSync(path);
        files.forEach(function (itm, index) {
            let stat = fs.statSync(path + itm);
            if (stat.isDirectory()) {
                //递归读取文件
                self.readFileList(path + itm + "/", filesList)
            } else {
                let obj = {};//定义一个对象存放文件的路径和名字
                obj.path = path;//路径
                obj.filename = itm//名字
                filesList.push(obj);
            }
        })
    },
    //获取文件夹下的所有文件
    getFileList(path) {
        let filesList = [];
        this.readFileList(path, filesList);
        return filesList;
    },
    //获取文件夹下的所有图片
    getImageFiles(path) {
        let imageList = [];
        this.getFileList(path).forEach((item) => {
            imageList.push(item.path + item.filename)
        });
        return imageList;
    }
};
