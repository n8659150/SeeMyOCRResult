const request = require('request');
exports.serverUrl = 'http://localhost:5000/ocr_process'
exports.processRequest = function (url, formData) {
    return new Promise(function (resolve, reject) {
        request.post({ url: url, json: true, formData: formData }, function (error, response, body) {
            if (error) return reject(error);
            // if (!error && response.statusCode == 200) {
            //     console.log(body)
            // }
            resolve(body['status'])
            // {'status':'200'}

        })
    });
}
