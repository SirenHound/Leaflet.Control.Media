
// TODO create actual button to alter instance's this._paused, this._playing etc.

L.Control.Media = L.Control.extend({

  /** Which control buttons to generate.
  */
  options: {
    position: 'bottomleft',
    animationStart: Date.UTC(2000, 00, 01),//ms to start animation from, eg. UTC DateTime for most events
    duration: 6000, // in ms
    // resetOnEnd: true, // Once the animation is done, reset to start by stopping the animation.
    animations: [{
      context: {},
      animation: function(pointer, funcArgs){ //_animFunc
        var from = 0; var to = 1;
        this._start = this._start || pointer; // arbitrarily start this sample animation at the first pointer value
        this._end = this._start + 30000; // just say it lasts 30sec
        // trying to incorporate follow layer
        //this._followHandler.followLayer(editableGroup.getLayers()[0], )
        this._layer = this._layer || editableGroup.getLayers()[0];
        console.log(pointer, this._start, this._end, this._layer, from, to);
      }
    }],

    stop: true, // stops, not changes speed of animation (0x is pause)
    record: false, // This seems necessary but will have its own set of problems requiring listeners all over the place
    stepForward: false, //  >|
    stepBack: false, //  |<

    // These should all be flavors of the same function. just at different speeds
    rewind: false,
    revPlay: false,
    pause: true,
    play: true,
    ffwd: true,
    // Example symbology <<   <  <|   ||   |>  >    >>
    speeds: [-8, -4, -2, -1, -0.5, 0, 0.5, 1, 2, 4, 8] // Multiplier: An array of speeds to make available to this player
  },
  onAdd: function(map){
    this._stopped = true; // prevent active animations when added to map.

    // Assign animation functions

    //for example until we can generalize
    //    this._marker = L.circleMarker(map.getCenter()).addTo(map);

    //    this._followHandler = new L.Handler.Follow(this._marker);

    // for testing
    //this.play();


    this._container = this._createControl();
    return this._container;
  },
  _createControl: function(){
    var control = L.DomUtil.create('div');
    control.style.fontFamily = "initial"; // Undo leaflet map font that has inconsistant media control characters
    var rwdButton = L.DomUtil.create('span','rewind-button', control);
    rwdButton.innerHTML = "⏪";
    L.DomEvent.on(rwdButton, "click", function(evt){ this.play(-2); }, this);

    var stopButton = L.DomUtil.create('span','stop-button', control);
    stopButton.innerHTML = "⏹"; // Stop
    L.DomEvent.on(stopButton, "click", function(evt){ this.stop(); }, this);

    var pauseButton = L.DomUtil.create('span','pause-button', control);
    pauseButton.innerHTML = "⏸"; // Pause
    L.DomEvent.on(pauseButton, "click", function(evt){ this.play(0); }, this);

    var playButton = L.DomUtil.create('span','play-button', control);
    playButton.innerHTML = "▶️";
    L.DomEvent.on(playButton, "click", function(evt){ this.play(); }, this);

    var ffwdButton = L.DomUtil.create('span','ffwd-button', control);
    ffwdButton.innerHTML = "⏩";
    L.DomEvent.on(ffwdButton, "click", function(evt){ this.play(2); }, this); // TODO increase multiplier with subsequent clicks

    return control;
  },
  // TODO Customize L.Util.requestAnimFrame to have layer of control
  requestAnimFrame:function(func, context, immed){
    var win = window;
    var reqAnFrm = win.requestAnimationFrame || webk("RequestAnimationFrame");// ||i;
    return immed && reqAnFrm === i ? void func.call(context) : reqAnFrm.call(win, L.Util.bind(func, context))

    //return L.Util.requestAnimFrame.apply(null, arguments);
  },

  play: function(speed){
    // Take out of this function.
    /* refactor to general case later, for now input animation at 0ms and ends at 60000ms */

    // where to start the specified animation (each control instance will have a time range)
    this._animStart = this.options.animationStart;

    // does not seem necessary, however, perhaps duration is unknown but end time is.
    this._animEnd = this._animStart + this.options.duration;

    // Handle pointer and multiplier if input differs from whats already playing
    if (this._multiplier !== (speed === void 0? 1 : speed)){
      this._multiplier = speed === void 0? 1 : speed;
      this._timestampWhenSpeedChanged = performance.now();
      this._pointer = this._pointer || this._animStart;
      this._pointerWhenSpeedChanged = this._pointer;
    }
    if (this._stopped){ // Do not add additional requests
      this._stopped = false; //TODO unset all others too (except _recording, since we'd like to that at different speeds)
      this._playing = true;
      this._timestampWhenSpeedChanged = performance.now();
      this._pointerWhenSpeedChanged = this._animStart; // not 0
      requestAnimationFrame(this.duringPlayback.bind(this));
    }
  },

  stop: function(){
    this._playing = false;
    this._stopped = true;
    // Reset animations
    requestAnimationFrame(this.duringPlayback.bind(this));
  },
  /** Runs the animation provided
  * @param {AnimFunction} func - The function that represents the animation. It should accept a timestamp argument
  currently also gets a status object, but will be fixed to be given other arguments too
  * @param {Object} cxt - The 'this' context to call the function with.
  * @param {DOMHighResTimeStamp} timestamp - Maybe it's a highres timestamp. check.
  * @param {...Object} rest - Additional arguments for AnimFunction.
  */
  runAnimation: function(func, cxt, timestamp, ...rest){

    var dateObj = new Date(timestamp);//don't do this in final draft, just write a method to do it yourself without instances

    console.log("pointer: "+dateObj.toUTCString());

    rest.unshift(timestamp); // push timestamp to front of rest array, so the animation function can be called with its arguments
    func.apply(cxt, rest);
  },
  _animFunc: function(pointer, funcArgs){
    var from = 0; var to = 1;
    this._start = this._start || pointer; // arbitrarily start this sample animation at the first pointer value
    this._end = this._start + 30000; // just say it lasts 30sec
    // trying to incorporate follow layer
    //this._followHandler.followLayer(editableGroup.getLayers()[0], )
    this._layer = this._layer || editableGroup.getLayers()[0];
    this._m_lineTo(pointer, this._start, this._end, this._layer, from, to);
  },
  /** Requests frames while a control is running
  */
  duringPlayback: function(timestamp){
    // number relative to anim NOT timestamp 0...9 mx1: 0123456789
    // Should give a consistant time in ms for the animation events, ie, an animation 10s long will have a pointer within that range
    this._pointer = this._pointerWhenSpeedChanged + (timestamp - this._timestampWhenSpeedChanged) * this._multiplier;

    if (this._pointer > this._animStart && this._pointer < this._animEnd){
      var progress = (this._pointer - this._animStart)/this.options.duration;

      // Performance variables
      var fps = this._lastTimestamp? 1000/(timestamp - this._lastTimestamp):0;
      this._lastTimestamp = timestamp;


      //Build status object
      var status = {
        fps: fps, // Current animation speed in frames per second
        orginalTimestamp: timestamp, // Timestamp recieved by the callback wrapper
        playerStart: this._animStart, // Earliest point that this controller will animate
        playerEnd: this._animEnd, // Latest point that this controller will animate
        playerProgress: progress // Current progress through players timespan
      };
      // Call animations here
      this.options.animations.forEach(function(animationObject){
        var animation = animationObject.animation;
        var cxt = animationObject.context;
        this.runAnimation.call(this, animation, cxt, this._pointer, status);
      }, this);


      if (!this._stopped){
        requestAnimationFrame(this.duringPlayback.bind(this));
      }
      if (this._stopped){
        this._pointer = this._animStart;

        // TODO Should call the animation functions one more time to place them at current control time.
        this.options.animations.forEach(function(animationObject){
          var animation = animationObject.animation;
          var cxt = animationObject.context;
          this.runAnimation.call(this, animation, cxt, this._pointer, status);
        }, this);

        this._playing = false; //TODO the rest
        return false;
      }

    }
    else { //pointer out of range, perhaps animation was completed, or pointer was OOR to start with.
      this._stopped = true; // prevent active animations when added to map.
      this._playing = false; // prevent active animations when added to map.
    }
  },
  addAnimation: function(func, cxt, ...rest){
    var animationObject = {
      context: cxt,
      animation: func,
      args: rest
    };
    this.options.animations.push(animationObject);
  }
});
/*
  speedMultiplier = 2;
  animDuration = 10000;
  p = performance.now(); // needs to be set outside the step function or it will keep increasing with the timestamp
  forward(performance.now());
*/
