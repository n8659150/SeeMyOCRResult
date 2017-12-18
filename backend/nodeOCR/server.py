# coding: utf-8
# 服务器相关模块
import simplejson as json
import pandas as pd
from flask import Flask
# pip install -U flask-cors
from flask_cors import CORS
from flask_restful import Resource, Api,reqparse
# OCR 相关模块 
import time
import base64
from PIL import Image
import cv2
import numpy as np
import pytesseract
import os
import jieba
import jieba.analyse
import shutil
import threading
# from multiprocessing import Process
import multiprocessing
from concurrent.futures import ThreadPoolExecutor as TPE
from concurrent.futures import ProcessPoolExecutor as PPE
###############################################
# OCR related
###############################################
# 原图片预处理
def preprocess(gray,shouldDilationTwice):
    # 1. Sobel算子，x方向求梯度
    sobel = cv2.Sobel(gray, cv2.CV_8U, 1, 0, ksize = 3)
    # 2. 二值化
    ret, binary = cv2.threshold(sobel, 0, 255, cv2.THRESH_OTSU+cv2.THRESH_BINARY)

    # 3. 膨胀和腐蚀操作的核函数
    element1 = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 9))
    element2 = cv2.getStructuringElement(cv2.MORPH_RECT, (24, 6))

    # 4. 膨胀一次，让轮廓突出
    dilation = cv2.dilate(binary, element2, iterations = 1)

    # 5. 腐蚀一次，去掉细节，如表格线等。注意这里去掉的是竖直的线
    erosion = cv2.erode(dilation, element1, iterations = 1)
    if(shouldDilationTwice):
        dilation2 = cv2.dilate(erosion, element2, iterations = 3)
        return dilation2
    else:
        return erosion

# 文字区域定位
def findTextRegion(img,threshold = 3000):
    region = []

    # 1. 查找轮廓
    img, contours, hierarchy = cv2.findContours(img, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # 2. 筛选那些面积小的
    for i in range(len(contours)):
        cnt = contours[i]
        # 计算该轮廓的面积
        area = cv2.contourArea(cnt) 

        # 面积小的都筛选掉
        if(area < threshold):
            continue

        # 轮廓近似，作用很小
        epsilon = 0.001 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)

        # 找到最小的矩形，该矩形可能有方向
        rect = cv2.minAreaRect(cnt)
        # print ("rect is: ")
        # print (rect)

        # box是四个点的坐标
        box = cv2.boxPoints(rect)
        box = np.int0(box)

        # 计算高和宽
        height = abs(box[0][1] - box[2][1])
        width = abs(box[0][0] - box[2][0])

        # 筛选那些太细的矩形，留下扁的
        if(height > width * 1.32):
            continue

        region.append(box)
        # print ("box is",box)
    return region

# base64字符串padding补齐
def decode_base64(data):
    lens = len(data)  
    lenx = lens - (lens % 4 if lens % 4 else 4)  
    try:  
        result = base64.b64decode(data[:lenx])
        return result  
    except:  
        pass  
# base64字符串图片解析
def data_uri_to_cv2_img(uri):
    encoded_data = uri.split(',')[1]
    # decoded_data = decode_base64(encoded_data)
    # encoded_data + '=' * (-len(encoded_data) % 4) 补齐 base64 string中缺失的padding
    # nparr = np.fromstring(decoded_data, np.uint8)
    nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

# 获取图片像素
def getTotalPixels(img):
    shape = img.shape
    return [shape[0],shape[1]]
# 获取灰度化后，图片中黑色像素占比
def outputPixelCount(img,color):
    size = getTotalPixels(img)
    #shape = img.shape
    height = size[0]
    width = size[1]
    blackPixelCount = 0
    for i in range(height):
        for j in range(width):
            if img[i,j] == color:
                blackPixelCount+=1
    return blackPixelCount

# OCR一张图片
def ocring(path,index,resultContainer):
    if os.path.isfile(path):
        imageObject=Image.open(path)
        result = pytesseract.image_to_string(imageObject,lang='chi_sim')
        # resultContainer.append({"order":index,"resultText":result})
        resultContainer[index] = result
        print (path + ' 中的文字已识别')

# 获取图片根路径
def getAbsFolderPath(folder):
    return os.getcwd() + "\\" + folder + "\\" 

# 根据坐标画出区域，并切图保存
def drawTextArea(sourceImg,region,savingPath,color,lineWidth):
    print ("drawTextArea")
    imgArray = []
    for index,box in enumerate(region):
        temp_img = cv2.drawContours(sourceImg, [box], 0, color, lineWidth)
        ys = [box[0, 1], box[1, 1], box[2, 1], box[3, 1]]
        xs = [box[0, 0], box[1, 0], box[2, 0], box[3, 0]]
        ys_sorted_index = np.argsort(ys)
        xs_sorted_index = np.argsort(xs)
        x1 = box[xs_sorted_index[0], 0]
        x2 = box[xs_sorted_index[3], 0]
        y1 = box[ys_sorted_index[0], 1]
        y2 = box[ys_sorted_index[3], 1]
        img_org2 = temp_img.copy()   
        img_plate = img_org2[y1:y2, x1:x2]
        # 生成纯黑色图片，和之后腐蚀膨胀后的图片做对比         
        hsv = cv2.cvtColor(img_plate,cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv,np.array([0,0,0]),np.array([0,0,0]))
        img_dilation = preprocess(cv2.cvtColor(img_plate, cv2.COLOR_BGR2GRAY),False)
        temp_filename = savingPath + "\\" + str(index) + '.jpg'

        
        size = getTotalPixels(img_dilation)
        
        # 计算一共有多少个黑色像素点         
        blackPixelCount = outputPixelCount(img_dilation,0)
        # 计算所有像素点（高度宽度的乘积）       
        blackPixelTotal = size[0] * size[1]
        blackPixelRatio = (float(blackPixelCount) / float(blackPixelTotal)) * 100
        print(str(index) + "的黑色像素有" + str(blackPixelCount) + "个")
        print(str(index) + "的黑色像素一共有" + str(blackPixelTotal) + "个")
        print("黑色像素占比" + str(blackPixelRatio) + "%")

        
        # if (blackPixelRatio < 85):
        cv2.imencode('.jpg',img_plate)[1].tofile(temp_filename)
        imgArray.append(temp_filename)
        # img_item = cv2.imencode('.jpg',img_plate)[1]
        # imgArray.append(img_item.tolist())
        print (temp_filename + " 已定位")
    return imgArray
# 提取文字
def grabText(folder):
    croppedImgList = os.listdir(folder)
    # 对列表进行初始化，并指定长度    
    results = [0] * len(croppedImgList)
    # 线程池设置
    with TPE(multiprocessing.cpu_count()*4) as executor:
        for i in range(len(croppedImgList)):
            path = os.path.join(folder,croppedImgList[i])
            executor.submit(ocring,path,i,results)
    return results

# 进行文字分词辨识并输出
def textProcess(textArray,savingPath):
    # 去除识别结果中的空格
    fullString = ''.join(textArray).replace(' ','')
    # 保存未分词的结果
    unsegDir = savingPath + '\\unseg_result.txt'
    r = open(unsegDir,'w')
    r.write(fullString)
    r.close()

    # 使用结巴分词进行处理
    segList = jieba.cut(fullString,HMM=False)
    # 保存结果
    segResult = '\r\n'.join(segList)
    finalResultDir = savingPath + '\\segged_result.txt'
    r = open(finalResultDir,'w')
    r.write(segResult)
    r.close()

    # 2017-12-01
    # 尝试从原文中提取标签 - TF-IDF 算法
    tagList = jieba.analyse.extract_tags(segResult, topK=20, withWeight=False, allowPOS=())
    tagResult = ','.join(tagList)
    # 保存结果
    taggedDir = savingPath + '\\tagged_result.txt'
    r = open(taggedDir,'w')
    r.write(tagResult)
    r.close()
    # 尝试从原文本中提取标签 - TextRank 算法
    rankedList = jieba.analyse.textrank(segResult, topK=20, withWeight=False, allowPOS=('ns', 'n', 'vn', 'v')) 
    rankedResult = ','.join(rankedList)
    # 保存结果
    rankedDir = savingPath + '\\ranked_result.txt'
    r = open(rankedDir,'w')
    r.write(rankedResult)
    r.close()
    return {'taggedResult':tagResult.strip(',').split(','),'rankedResult':rankedResult.strip(',').split(',')}
# 根据base64字符串识别并提取图片中的文字

# def detect(data_uri):
#     # 0. 读取图像
#     # img = cv2.imread(filePath)
#     # img = cv_read(filePath)
#     img = data_uri_to_cv2_img(data_uri)
#     # 1. 转化成灰度图
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#     # 2. 形态学变换的预处理，得到可以查找矩形的图片
#     dilation = preprocess(gray,True)
#     # 3. 查找和筛选文字区域
#     region = findTextRegion(dilation)
#     # 4. 获取路径    
#     croppedFolderPath = getAbsFolderPath("cropped")
#     # dilationFolderPath = getAbsFolderPath("dilation")
#     fileNameOnly = os.path.basename('temp.jpg').replace('.','_')
#     fullPath = croppedFolderPath + fileNameOnly
#     # dilationPath = dilationFolderPath + fileNameOnly
#     # 若文件夹不存在则新建文件夹
#     if not os.path.exists(fullPath): 
#         os.mkdir(fullPath)
#     else:
#         shutil.rmtree(fullPath)
#         os.mkdir(fullPath)
#     # 5.根据坐标画出区域，并切图保存
#     drawTextArea(img,region,fullPath,(0,255,0),2)
#     # 6.OCR识别
#     results = grabText(fullPath)
#     # 7.对识别结果进行分词
#     tagResult = textProcess(results,fullPath)
#     return tagResult



def detect(data_uri):
    # 0. 读取图像
    # img = cv2.imread(filePath)
    # img = cv_read(filePath)
    img = data_uri_to_cv2_img(data_uri)
    # 1. 转化成灰度图
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # 2. 形态学变换的预处理，得到可以查找矩形的图片
    dilation = preprocess(gray,True)
    # 3. 查找和筛选文字区域
    region = findTextRegion(dilation)
    # 4. 获取路径    
    croppedFolderPath = getAbsFolderPath("cropped")
    # dilationFolderPath = getAbsFolderPath("dilation")
    fileNameOnly = os.path.basename('temp.jpg').replace('.','_')
    fullPath = croppedFolderPath + fileNameOnly
    # dilationPath = dilationFolderPath + fileNameOnly
    # 若文件夹不存在则新建文件夹
    if not os.path.exists(fullPath): 
        os.mkdir(fullPath)
    else:
        shutil.rmtree(fullPath)
        os.mkdir(fullPath)
    # 5.根据坐标画出区域，并切图保存
    result = drawTextArea(img,region,fullPath,(0,255,0),2)
    return result
###############################################
# flask-restful server
###############################################
parser = reqparse.RequestParser()
parser.add_argument('data_uri',type=str)
app = Flask(__name__)
CORS(app)
api = Api(app)
###############################################
# API
###############################################
class post_test(Resource):
    def post(self):
        args = parser.parse_args()
        data_uri  = args.get('data_uri')
        tags = detect(data_uri)
        return tags
# 返回全部 hostname/all

api.add_resource(post_test, '/post_test')
#  main 入口
if __name__ == '__main__':
    app.run(host='0.0.0.0')




