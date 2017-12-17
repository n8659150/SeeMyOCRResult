let app = new Vue({
  el: '#app',
  data(){
    return {
      image: ''
    }
  },
  methods: {
    onFileChange(e) {
      let files = e.target.files || e.dataTransfer.files;
      if (!files.length)
        return;
      this.createImage(files[0]);
    },
    createImage(file) {
      let image = new Image();
      let reader = new FileReader();
      let vm = this;
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        vm.image = e.target.result;
        console.log(e.target.result)
      };
      
    },
    OCR() {
      this.$http.post("http://localhost:5000/post_test",{data_uri:this.image},{emulateJSON: true})
      .then(
        (response)=>{
          console.log(response); 
        },
        (error)=>{
          console.log(error);
        }
      );
    },
    removeImage(e) {
      this.image = '';
    }

  }
})