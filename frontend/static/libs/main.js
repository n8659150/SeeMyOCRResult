let app = new Vue({
  el: '#app',
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
      // NProgress.start();
      let response = await this.$http.post("http://172.16.7.79:3001/ocr", { data_uri: this.image }, { emulateJSON: true })
      if(!response) {
        alert("网络错误")
      }

      if(response.data) {
        // NProgress.done();
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
})