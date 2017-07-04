
// TODO create actual button to alter instance's this._paused, this._playing etc.

L.Control.Media = L.Control.extend({

  /** Which control buttons to generate.
  */
  options: {
    position: 'bottomleft',
    animationStart: Date.UTC(2000, 00, 01),//ms to start animation from, eg. UTC DateTime for most events
    duration: 600000, // 10 minutes
    stepFunction: function(timestamp){
        if (this._currentSecond === Math.trunc(timestamp/1000, 3)){
          this._fps++;
        }
        else{
          //console.log(this._currentSecond+"s");
          console.log("Playing at " + this._fps + "fps");
          console.log("Animation speed: " + this._multiplier +"x");
          this._fps = 0;
          this._currentSecond = Math.trunc(timestamp/1000, 3);
        }
      },
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


    //for example until we can generalize
    this._marker = L.circleMarker(map.getCenter()).addTo(map);

    this._followHandler = new L.Handler.Follow(this._marker);


    return L.DomUtil.create('div');
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

  /** This is the animation that is being controlled.
  */
  sampleAnimation: function(func, cxt, timestamp, status){
    var funcArgs = Array.prototype.slice.call(arguments, 3);

    var dateObj = new Date(timestamp);//don't do this in final draft, just write a method to do it yourself without instances

    console.log("pointer: "+dateObj.toUTCString());

    //func.apply(cxt, funcArgs);
    func.call(cxt, 0, 1, timestamp);
  },
  _animFunc: function(from, to, pointer){

    this._start = this._start || pointer; // arbitrarily start this sample animation at the first pointer value
    this._end = this._start + 30000; // just say it lasts 30sec
    // trying to incorporate follow layer
    //this._followHandler.followLayer(editableGroup.getLayers()[0], )
    this._layer = this._layer || editableGroup.getLayers()[0];
    this._m_lineTo(pointer, this._start, this._end, this._layer, from, to);
  },

  // while____ functions might be able to be consolidated into on function, since they are just calling each other through if gates anyway.
  // however, consider 'preclick' actions, such as pause loop requiring to alter this._p before resuming animation.
  // see 'duringPlayback'
  duringPlayback: function(timestamp){
    // number relative to anim NOT timestamp 0...9 mx1: 0123456789
    // Should give a consistant time in ms for the animation events, ie, an animation 10s long will have a pointer within that range
    this._pointer = this._pointerWhenSpeedChanged + (timestamp - this._timestampWhenSpeedChanged) * this._multiplier;

    if (this._pointer > this._animStart && this._pointer < this._animEnd){
      var progress = (this._pointer - this._animStart)/this.options.duration;
      if (this._stopped){
        this._pointer = this._animStart;
        this._playing = false; //TODO the rest
        return false;
      }

      // Performance variables
      // dirty, only updates every second TODO invert seconds per frame
      if (!this._stopped && this._lastTimestamp){
        var fps = 1000/(timestamp - this._lastTimestamp);


      //Build status object
      var status = {
        fps: fps, // Current animation speed in frames per second
        orginalTimestamp: timestamp, // Timestamp recieved by the callback wrapper
        playerStart: this._animStart, // Earliest point that this controller will animate
        playerEnd: this._animEnd, // Latest point that this controller will animate
        playerProgress: progress // Current progress through players timespan
      };
      // Call animations here
      this.sampleAnimation.call(this, this._animFunc, this._followHandler, this._pointer, status);

      requestAnimationFrame(this.duringPlayback.bind(this));
    }
    else { //pointer out of range, perhaps animation was completed, or pointer was OOR to start with.
      this._stopped = true; // prevent active animations when added to map.
    }
  },

  /** Continues to request frames when the animation has been paused. this is a requestAnimationFrame function.
  * @param timestamp
  */
  whilePaused: function(timestamp){
    //console.count("timestamp", timestamp);
    var pauseStartTime = this._p;
    // Check if still paused
    if (this._stopped){
      this._playing = this._paused = this._fastForwarding = false;
      return false;
    }
    if (this._paused){
      console.log("paused");
      // Other things we can do is disable the other buttons, like ffwd etc.
      requestAnimationFrame(this.whilePaused.bind(this));
    }
    // Resume play
    else{
      this._p += performance.now() - pauseStartTime; // offset p by amount of time paused
      requestAnimationFrame(this.whilePlaying.bind(this));
    }
  },

  //  var fps = 0; var second;
  whilePlaying: function(timestamp){
    //console.count("timestamp", timestamp);
    if (this._paused){
      requestAnimationFrame(this.whilePaused.bind(this));
    }
    else if(this._fastForwarding){  // flip flops if _fastForwarding and _playing are both true
      requestAnimationFrame(this.whileFastForwarding.bind(this));
    }
    else if(this._playing){
      if (timestamp < this._p + this.options.duration){
        this.options.stepFunction.call(this, timestamp);
        requestAnimationFrame(this.whilePlaying.bind(this));
      }
    }
  },
});
/*
  speedMultiplier = 2;
  animDuration = 10000;
  p = performance.now(); // needs to be set outside the step function or it will keep increasing with the timestamp
  forward(performance.now());
*/
