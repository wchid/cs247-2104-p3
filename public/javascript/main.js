// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;
  var mediaRecorder;
  var explosion_label = "";

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://gsroth-p3-v1.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome! please enter a username");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        var value = $(this).val();
        if(has_emotions(value)){

          var is_animated = false;
          var animate = true;
          var num = 1;

          animate_prompt(value);

          setTimeout(function(){

            if(animate){
               mediaRecorder.start(3000);
                var curr_this = $(this);

              setTimeout(function(curr_this) {
                fb_instance_stream.push({m:username+": " +value, v:cur_video_blob, c: my_color});
              }, 3500);
            }else{

            }
          }, 0);

        }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        }
        $(this).val("");
        scroll_to_bottom(0);
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  function animate_prompt(value){
    var animate_option = document.createElement('div');
    animate_option.className = 'animate_option';
    $(animate_option).text("animate" + value);
    document.getElementById('animate_prompt_container').appendChild(animate_option);
    $(animate_option).fadeOut(3000, function(){
      animate_option.remove();
    });
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){

      // for video element
      var video_container = document.createElement("div");
      video_container.className = 'clip_container';
      var video = document.createElement("video");
      var countdown = document.createElement("div");
      countdown.className = 'countdown';
      var start_time = 5;
      var countdown_update = setInterval(function(){
        countdown.innerHTML = start_time--;
      },1000);
      video.autoplay = false;
      video.controls = false; // optional
      video.loop = false;
      video.className = 'clip';

      $(video).on('ended', function(event) {
          console.log("ENDED");
          $('#explosion_label').text(explosion_label);
          $(video).fadeOut(1000, function(){
            video_container.remove();
          });
          dropBomb();
          $('#output').fadeOut(1000, function(){
            $('#explosion_label').text("");
          });
      });

      $(video).on("click", function(){

        // set explosion label
        var options = ["lol",":)",":("];
        for(var i=0;i<options.length;i++){
          if(data.m.indexOf(options[i])!= -1){
            if( i == 0) {
              explosion_label = "LOL";
            }else if(i == 1){
              explosion_label = ":)";
            }else{
              explosion_label = ":(";
            }
          }
        }

        init(this);
        $('#output').fadeIn(0);
        $(this).unbind('click');
        countdown.remove();
        if($(this).is(':animated')) {
           $(this).stop().animate({opacity:'0.5'});
        }
        this.play();
      });

      video.width = 120;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      video_container.appendChild(countdown);
      video_container.appendChild(video);
      document.getElementById("conversation").appendChild(video_container);    }
      $(video).fadeOut(6000, function(){
        video_container.remove();
      });
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      mediaRecorder = new MediaStreamRecorder(stream);

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";
          console.log("blobbed");

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        if( i == 0) {
          add_prompt('lol');
        }else if(i == 1){
          add_prompt(':)');
        }else{
          add_prompt(':(');
        }
        return true;
      }
    }
    return false;
  }

  function add_prompt(type){
    var label = type;
    var prompt = document.createElement('span');
    prompt.id = 'action_prompt';
    console.log(prompt);
    if(type.indexOf('lol') != -1){
      $(prompt).text("LOL for the camera!");
    }else if(type.indexOf(':)') != -1){
      console.log("smile prompt");
      $(prompt).text("SMILE for the camera!");
    }else if(type.indexOf(':(') != -1){
      $(prompt).text("SADFACE for the camera!");
    }
    document.body.appendChild(prompt);
    $(prompt).delay(3000).fadeOut(0, function(){
      prompt.remove();
    });
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
