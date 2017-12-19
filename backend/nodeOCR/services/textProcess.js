const nodejieba = require("nodejieba");
exports.generateTagsByRank = function(textString,topN) {
    let result = nodejieba.extract(textString, topN)
    return result
}
// exports.generateTagsByFreq = function(textString) {
//     let result = nodejieba.tag(textString)
//     return result
// }