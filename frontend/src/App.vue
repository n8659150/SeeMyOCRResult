<template>
      <div id="app" class="abs-center flex-column main">
        <div v-if="!image" class="abs-center am-form-group am-form-file img-upload">
            <button type="button" class="am-btn am-btn-default am-btn-sm">
                <i class="am-icon-cloud-upload"></i> 选择要上传的文件
            </button>
            <input type="file" @change="onFileChange" multiple>
        </div>
        <div v-else class="am-g am-g-fixed img-info">
            <div class="am-u-sm-6 am-u-md-6 am-u-lg-6">
                <img class="am-thumbnail img-range" :src="image" alt="待识别的图片" />
            </div>
            <ul>
                <li style="height:30px;line-height:30px;">图片高度：{{picHeight}}</li>
                <li style="height:30px;line-height:30px;">图片宽度：{{picWidth}}</li>
                <li style="height:30px;line-height:30px;">文件大小：{{sizeText}}</li>
                <li style="height:30px;line-height:30px;">图片格式：{{format}}</li>
                <li style="height:30px;line-height:30px;">预计成功率：{{accuracy}}</li>
            </ul>
            <div class="btn-group">
                <button class="am-btn am-btn-success am-btn-xs" :disabled="shouldBtnBlocked" @click="OCR()">点击识别</button>
                <button class="am-btn am-btn-danger am-btn-xs" :disabled="shouldBtnBlocked" @click="removeImage">移除图片</button>
            </div>
        </div>
        <div class="badge-wrapper" v-if="commonTags.length > 0">
            <span v-for="tag in commonTags" class="am-badge am-badge-primary am-round badge-font-size custom-badge">{{tag.word}}</span>
        </div>
        <div class="badge-wrapper" v-if="commonTags.length > 0">
            <span v-for="tag in uniqueTags" class="am-badge am-badge-primary am-round badge-font-size custom-badge">{{tag.word}}</span>
        </div>
    </div>
</template>

<script>
import HelloWorld from './components/HelloWorld'

export default {
  name: 'app',
  data() {
    return {
      image: '',
      size:0,
      sizeText: '',
      format: '',
      picWidth: 0,
      picHeight: 0,
      accuracy:'',
      shouldBtnBlocked:false,
      commonTags: [],
      uniqueTags:[]
    }
  },
  methods: {
    onFileChange(e) {
      let files = e.target.files || e.dataTransfer.files;
      if (!files.length)
        return;
      let fileData = files[0];
      console.log(fileData);
      this.size = fileData.size / 1000;
      this.sizeText = fileData.size / 1000 + ' KB';
      this.format = fileData.type.split('/')[1];
      this.createImage(fileData);
    },
    calcAccuracy(w,h,s) {
      let wh = parseInt(w) * parseInt(h);
      if (wh < 786432) {
        if (s < 300) {
          return '低'
        } 
        else {
          return '中'
        }
      } 
      else {
        if (s < 75) {
          return '低'
        } 
        else if (s >= 75 & s < 450) {
          return '中'
        } 
        else {
          return '高'
        }
      }
      
    },
    createImage(file) {
      let image = new Image();
      let reader = new FileReader();
      let vm = this;
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        vm.image = e.target.result;
        image.src = e.target.result;
        // let width = image.width;
        // let height = image.height;
        // console.log(height);
      };
      image.onload = () => {
        this.picWidth = image.width;
        this.picHeight = image.height;
        this.accuracy = this.calcAccuracy(this.picWidth,this.picHeight,this.size);
      }

    },
    noNumber(element) {
      return isNaN(parseInt(element['word']))
    },
    async OCR() {
      console.log('开始识别');
      this.shouldBtnBlocked = true;
      NProgress.start();
      let response = await this.$http.post("http://localhost:3001/ocr", { data_uri: this.image }, { emulateJSON: true })
      if(!response) {
        alert("网络错误")
      }

      if(response.data) {
        NProgress.done();
        // this.commonTags = response.data.slice(0,9);
        console.log(response.data);
        this.commonTags = response.data.slice(0,9).filter(this.noNumber);
        this.uniqueTags = response.data.slice(-10).filter(this.noNumber);
        this.shouldBtnBlocked = false;
      }
      
    },
    removeImage(e) {
      this.image = '';
      this.commonTags = [];
      this.uniqueTags = [];
    }

  }
}
</script>

<style>
</style>
