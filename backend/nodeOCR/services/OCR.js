const tesseract = require('node-tesseract');
exports.recognizer = function(imgPath, options) {
    options = Object.assign({ l: 'chi_sim' }, options);
    return new Promise((resolve, reject) => {
        tesseract.process(imgPath, options, (err, text) => {
            if (err) return reject(err);
            resolve(text.replace(/[\r\n\s]/gm, ''));
        });
    })
}